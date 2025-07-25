"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.HEAD = HEAD;
const server_1 = require("next/server");
async function GET(request) {
    try {
        // 環境変数の確認
        const azureEndpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
        const azureKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
        const mongoUri = process.env.MONGODB_URI;
        const useAzureMongoDB = process.env.USE_AZURE_MONGODB;
        const status = {
            timestamp: new Date().toISOString(),
            system: 'AAM Accounting Automation',
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            // 設定状況
            configuration: {
                useAzureMongoDB: useAzureMongoDB === 'true',
                azureFormRecognizer: {
                    configured: !!(azureEndpoint && azureKey),
                    endpoint: azureEndpoint ? 'configured' : 'missing',
                },
                mongodb: {
                    configured: !!mongoUri,
                    atlas: mongoUri?.includes('mongodb+srv://') || false,
                }
            },
            // システム状態
            services: {
                webServer: 'healthy',
                // Azure Form Recognizer の簡単な疎通確認は省略（APIコールが必要なため）
                azureFormRecognizer: azureEndpoint && azureKey ? 'configured' : 'not_configured',
                mongodb: mongoUri ? 'configured' : 'not_configured',
            }
        };
        // MongoDB接続テスト（新システムが有効な場合のみ）
        if (useAzureMongoDB === 'true' && mongoUri) {
            try {
                const { checkConnection } = await Promise.resolve().then(() => __importStar(require('@/lib/mongodb-client')));
                const isMongoConnected = await checkConnection();
                status.services.mongodb = isMongoConnected ? 'healthy' : 'unhealthy';
            }
            catch (error) {
                status.services.mongodb = 'error';
            }
        }
        const httpStatus = Object.values(status.services).every(s => s === 'healthy' || s === 'configured') ? 200 : 503;
        return server_1.NextResponse.json(status, { status: httpStatus });
    }
    catch (error) {
        return server_1.NextResponse.json({
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function HEAD(request) {
    // ヘルスチェック用の軽量エンドポイント
    return new server_1.NextResponse(null, { status: 200 });
}
