"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMongoDBEnabled = isMongoDBEnabled;
exports.getMongoDBConfig = getMongoDBConfig;
exports.getDebugInfo = getDebugInfo;
// 環境変数の設定を一元管理
function isMongoDBEnabled() {
    // 複数の条件でMongoDBの有効性をチェック
    const checks = [
        process.env.USE_AZURE_MONGODB === 'true',
        process.env.NEXT_PUBLIC_USE_AZURE_MONGODB === 'true',
        !!process.env.MONGODB_URI,
        process.env.VERCEL_ENV !== undefined // Vercel環境の場合はデフォルトで有効
    ];
    // いずれかの条件が満たされればtrueを返す
    return checks.some(check => check);
}
function getMongoDBConfig() {
    return {
        enabled: isMongoDBEnabled(),
        uri: process.env.MONGODB_URI,
        useAzureMongoDB: process.env.USE_AZURE_MONGODB,
        publicUseAzureMongoDB: process.env.NEXT_PUBLIC_USE_AZURE_MONGODB,
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV
    };
}
function getDebugInfo() {
    return {
        mongoConfig: getMongoDBConfig(),
        allEnvVars: Object.keys(process.env).filter(key => key.includes('MONGO') ||
            key.includes('AZURE') ||
            key === 'VERCEL_ENV' ||
            key === 'NODE_ENV').reduce((acc, key) => ({
            ...acc,
            [key]: process.env[key]
        }), {})
    };
}
