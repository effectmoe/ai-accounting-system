"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const deepseek_client_1 = require("@/lib/deepseek-client");
const api_error_handler_1 = require("@/lib/api-error-handler");
async function checkMongoDB() {
    const startTime = Date.now();
    try {
        const isConnected = await (0, mongodb_client_1.checkConnection)();
        const responseTime = Date.now() - startTime;
        return {
            service: 'MongoDB',
            status: isConnected ? 'healthy' : 'unhealthy',
            message: isConnected ? 'Connected' : 'Connection failed',
            responseTime,
        };
    }
    catch (error) {
        return {
            service: 'MongoDB',
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error',
            responseTime: Date.now() - startTime,
        };
    }
}
async function checkDeepSeek() {
    const startTime = Date.now();
    try {
        const client = (0, deepseek_client_1.getDeepSeekClient)();
        const isValid = await client.validateApiKey();
        const responseTime = Date.now() - startTime;
        return {
            service: 'DeepSeek API',
            status: isValid ? 'healthy' : 'unhealthy',
            message: isValid ? 'API key valid' : 'Invalid API key',
            responseTime,
        };
    }
    catch (error) {
        return {
            service: 'DeepSeek API',
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error',
            responseTime: Date.now() - startTime,
        };
    }
}
async function checkEnvironment() {
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
async function GET(request) {
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
        let overallStatus;
        if (hasUnhealthy) {
            overallStatus = 'unhealthy';
        }
        else if (hasDegraded) {
            overallStatus = 'degraded';
        }
        else {
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
        return server_1.NextResponse.json(response, { status: statusCode });
    }
    catch (error) {
        return (0, api_error_handler_1.createErrorResponse)(error);
    }
}
