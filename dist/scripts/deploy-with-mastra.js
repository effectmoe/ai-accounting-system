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
const deployment_agent_1 = require("../src/agents/deployment-agent");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
dotenv.config();
async function deployWithMastra() {
    console.log('🤖 Mastraデプロイメントエージェントを起動します...\n');
    try {
        // 1. 新しいプロジェクトを作成
        console.log('📦 新しいVercelプロジェクトを作成中...');
        const projectName = 'aam-accounting-v2';
        const createResult = await deployment_agent_1.deploymentAgent.generate({
            prompt: `新しいVercelプロジェクト「${projectName}」を作成してください。`,
            onStream: (chunk) => {
                if (chunk.type === 'tool-call') {
                    console.log(`🔧 実行中: ${chunk.toolCall.name}`);
                }
            }
        });
        console.log('✅ プロジェクト作成完了\n');
        // 2. 環境変数を読み込んで設定
        console.log('🔐 環境変数を設定中...');
        const envPath = path.join(process.cwd(), '.env.production.actual');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                    if (!key.startsWith('VERCEL_')) {
                        envVars[key] = value;
                    }
                }
            }
        });
        const envResult = await deployment_agent_1.deploymentAgent.generate({
            prompt: `以下の環境変数を本番環境に設定してください: ${JSON.stringify(Object.keys(envVars))}`,
            onStream: (chunk) => {
                if (chunk.type === 'tool-call') {
                    console.log(`🔧 設定中: ${chunk.toolCall.name}`);
                }
            }
        });
        console.log('✅ 環境変数設定完了\n');
        // 3. 本番環境にデプロイ
        console.log('🚀 本番環境にデプロイ中...');
        const deployResult = await deployment_agent_1.deploymentAgent.generate({
            prompt: '本番環境にデプロイしてください。',
            onStream: (chunk) => {
                if (chunk.type === 'tool-call') {
                    console.log(`🔧 デプロイ中: ${chunk.toolCall.name}`);
                }
                if (chunk.type === 'text') {
                    console.log(chunk.text);
                }
            }
        });
        console.log('\n✅ デプロイ完了！\n');
        // 4. デプロイをテスト
        console.log('🧪 デプロイをテスト中...');
        const testResult = await deployment_agent_1.deploymentAgent.generate({
            prompt: 'デプロイされたアプリケーションの動作を確認してください。',
            onStream: (chunk) => {
                if (chunk.type === 'text') {
                    console.log(chunk.text);
                }
            }
        });
        console.log('\n🎉 Mastraエージェントによるデプロイが完了しました！');
    }
    catch (error) {
        console.error('❌ エラーが発生しました:', error);
        process.exit(1);
    }
}
// 実行
deployWithMastra();
