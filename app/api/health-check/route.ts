import { NextRequest, NextResponse } from 'next/server';
import { checkConnection as checkMongoConnection } from '@/lib/mongodb-client';
// import { getDeepSeekClient } from '@/lib/deepseek-client'; // DeepSeek廃止
import { getOllamaClient } from '@/lib/ollama-client';
import { getOCRQueueClient } from '@/lib/ocr-queue-client';
import { createErrorResponse } from '@/lib/api-error-handler';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
}

async function checkMongoDB(): Promise<HealthStatus> {
  const startTime = Date.now();
  try {
    const isConnected = await checkMongoConnection();
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'MongoDB',
      status: isConnected ? 'healthy' : 'unhealthy',
      message: isConnected ? 'Connected' : 'Connection failed',
      responseTime,
    };
  } catch (error) {
    return {
      service: 'MongoDB',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

// DeepSeek廃止 - Ollamaに移行
// async function checkDeepSeek(): Promise<HealthStatus> {
//   const startTime = Date.now();
//   try {
//     const client = getDeepSeekClient();
//     const isValid = await client.validateApiKey();
//     const responseTime = Date.now() - startTime;
//
//     return {
//       service: 'DeepSeek API',
//       status: isValid ? 'healthy' : 'unhealthy',
//       message: isValid ? 'API key valid' : 'Invalid API key',
//       responseTime,
//     };
//   } catch (error) {
//     return {
//       service: 'DeepSeek API',
//       status: 'unhealthy',
//       message: error instanceof Error ? error.message : 'Unknown error',
//       responseTime: Date.now() - startTime,
//     };
//   }
// }

async function checkOllama(): Promise<HealthStatus & { debug?: object }> {
  const startTime = Date.now();
  try {
    const client = getOllamaClient();
    const config = client.getConfig();
    const isAvailable = await client.checkAvailability();
    const responseTime = Date.now() - startTime;

    return {
      service: 'Ollama (Vision OCR)',
      status: isAvailable ? 'healthy' : 'degraded',
      message: isAvailable
        ? `Connected via ${config.isCloudMode ? 'Cloudflare Tunnel' : 'localhost'} (${config.baseURL})`
        : `Not available at ${config.baseURL} - OCR機能は利用不可`,
      responseTime,
      debug: {
        baseURL: config.baseURL,
        isCloudMode: config.isCloudMode,
        model: config.model,
        timeout: config.timeout,
        envOllamaUrl: process.env.OLLAMA_URL?.substring(0, 50) || 'not set',
      }
    };
  } catch (error) {
    return {
      service: 'Ollama (Vision OCR)',
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
      debug: {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    };
  }
}

async function checkOCRQueue(): Promise<HealthStatus> {
  const startTime = Date.now();
  try {
    const client = getOCRQueueClient();
    const config = client.getConfig();

    if (!config.enabled) {
      return {
        service: 'OCR Queue (Durable Objects)',
        status: 'degraded',
        message: 'Queue not enabled - using direct Ollama calls',
        responseTime: Date.now() - startTime,
      };
    }

    const health = await client.checkHealth();
    const responseTime = Date.now() - startTime;

    if (!health) {
      return {
        service: 'OCR Queue (Durable Objects)',
        status: 'unhealthy',
        message: `Queue unreachable at ${config.baseURL}`,
        responseTime,
      };
    }

    const isHealthy = health.status === 'healthy' && health.ollama === 'healthy';

    return {
      service: 'OCR Queue (Durable Objects)',
      status: isHealthy ? 'healthy' : 'degraded',
      message: isHealthy
        ? `Queue healthy (${health.queueSize} pending, Ollama: ${health.ollama})`
        : `Queue ${health.status}, Ollama: ${health.ollama}`,
      responseTime,
    };
  } catch (error) {
    return {
      service: 'OCR Queue (Durable Objects)',
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkEnvironment(): Promise<HealthStatus> {
  const requiredEnvVars = [
    'MONGODB_URI',
    // 'DEEPSEEK_API_KEY', // DeepSeek廃止
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length === 0) {
    return {
      service: 'Environment',
      status: 'healthy',
      message: 'All required environment variables are set',
    };
  }

  return {
    service: 'Environment',
    status: 'unhealthy',
    message: `Missing environment variables: ${missingVars.join(', ')}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // 各サービスの健全性をチェック（DeepSeek廃止）
    const [mongoStatus, ollamaStatus, ocrQueueStatus, envStatus] = await Promise.all([
      checkMongoDB(),
      checkOllama(),
      checkOCRQueue(),
      checkEnvironment(),
    ]);

    const services = [mongoStatus, ollamaStatus, ocrQueueStatus, envStatus];
    
    // 全体のステータスを判定
    const hasUnhealthy = services.some(s => s.status === 'unhealthy');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      services,
      responseTime: Date.now() - startTime,
    };

    // ステータスコードの設定
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return createErrorResponse(error);
  }
}