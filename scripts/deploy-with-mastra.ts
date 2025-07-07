import { deploymentAgent } from '../src/agents/deployment-agent';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function deployWithMastra() {
  console.log('🤖 Mastraデプロイメントエージェントを起動します...\n');

  try {
    // 1. 新しいプロジェクトを作成
    console.log('📦 新しいVercelプロジェクトを作成中...');
    const projectName = 'aam-accounting-v2';
    
    const createResult = await deploymentAgent.generate({
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
    const envVars: Record<string, string> = {};
    
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

    const envResult = await deploymentAgent.generate({
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
    
    const deployResult = await deploymentAgent.generate({
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
    
    const testResult = await deploymentAgent.generate({
      prompt: 'デプロイされたアプリケーションの動作を確認してください。',
      onStream: (chunk) => {
        if (chunk.type === 'text') {
          console.log(chunk.text);
        }
      }
    });

    console.log('\n🎉 Mastraエージェントによるデプロイが完了しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
deployWithMastra();