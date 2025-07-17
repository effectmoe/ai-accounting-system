import { NextRequest, NextResponse } from 'next/server';
import { checkConnection as checkMongoConnection } from '@/lib/mongodb-client';
import { getDeepSeekClient } from '@/lib/deepseek-client';
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

async function checkDeepSeek(): Promise<HealthStatus> {
  const startTime = Date.now();
  try {
    const client = getDeepSeekClient();
    const isValid = await client.validateApiKey();
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'DeepSeek API',
      status: isValid ? 'healthy' : 'unhealthy',
      message: isValid ? 'API key valid' : 'Invalid API key',
      responseTime,
    };
  } catch (error) {
    return {
      service: 'DeepSeek API',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkEnvironment(): Promise<HealthStatus> {
  const requiredEnvVars = [
    'MONGODB_URI',
    'DEEPSEEK_API_KEY',
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
    
    // 各サービスの健全性をチェック
    const [mongoStatus, deepseekStatus, envStatus] = await Promise.all([
      checkMongoDB(),
      checkDeepSeek(),
      checkEnvironment(),
    ]);

    const services = [mongoStatus, deepseekStatus, envStatus];
    
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