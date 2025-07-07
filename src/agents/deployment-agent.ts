import { Agent } from '@mastra/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const deploymentAgent = new Agent({
  name: 'deployment-agent',
  description: 'Vercelへのデプロイを管理するエージェント',
  
  instructions: `
    あなたはVercelへのデプロイを管理する専門のエージェントです。
    以下のタスクを実行します：
    1. 現在のプロジェクトの状態を確認
    2. 新しいプロジェクトを作成（必要に応じて）
    3. 環境変数を設定
    4. デプロイを実行
    5. デプロイ結果を確認
  `,

  model: {
    provider: 'OPENAI',
    name: 'gpt-4-turbo-preview',
    toolChoice: 'auto'
  },

  tools: {
    checkProjectStatus: {
      description: '現在のVercelプロジェクトの状態を確認',
      parameters: {},
      execute: async () => {
        try {
          const { stdout } = await execAsync('vercel project inspect accounting-automation 2>&1');
          return { success: true, output: stdout };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },

    createNewProject: {
      description: '新しいVercelプロジェクトを作成',
      parameters: {
        projectName: { type: 'string', description: 'プロジェクト名' }
      },
      execute: async ({ projectName }) => {
        try {
          // 既存のリンクを削除
          await execAsync('rm -rf .vercel');
          
          // 新しいプロジェクトを作成
          const { stdout } = await execAsync(`vercel --yes --name ${projectName}`);
          return { success: true, output: stdout };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },

    setEnvironmentVariables: {
      description: '環境変数を設定',
      parameters: {
        envVars: { type: 'object', description: '環境変数のキーと値' }
      },
      execute: async ({ envVars }) => {
        try {
          const results = [];
          for (const [key, value] of Object.entries(envVars)) {
            const { stdout } = await execAsync(`vercel env add ${key} production < <(echo "${value}")`);
            results.push({ key, result: stdout });
          }
          return { success: true, results };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },

    deployToProduction: {
      description: '本番環境にデプロイ',
      parameters: {},
      execute: async () => {
        try {
          const { stdout } = await execAsync('vercel --prod --yes');
          
          // URLを抽出
          const urlMatch = stdout.match(/https:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : null;
          
          return { 
            success: true, 
            output: stdout,
            productionUrl: url
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },

    testDeployment: {
      description: 'デプロイされたアプリケーションをテスト',
      parameters: {
        url: { type: 'string', description: 'テストするURL' }
      },
      execute: async ({ url }) => {
        try {
          const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${url}`);
          const statusCode = parseInt(stdout.trim());
          
          return { 
            success: statusCode === 200,
            statusCode,
            message: statusCode === 200 ? 'デプロイ成功' : 'デプロイに問題があります'
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    }
  }
});