import { Agent, createTool } from '@mastra/core';
import { z } from 'zod';
import fetch from 'node-fetch';

// Vercel API統合エージェント
export const vercelIntegrationAgent = new Agent({
  id: 'vercel-integration-agent',
  name: 'Vercel API統合担当',
  description: 'Vercel APIを使用して環境変数の管理とデプロイを自動化',
  
  model: {
    provider: 'OPENAI',
    name: 'gpt-4-turbo-preview',
    toolChoice: 'auto'
  },
  
  tools: {
    // Vercel APIトークン取得
    getVercelToken: createTool({
      id: 'get-vercel-token',
      name: 'Vercelトークン取得',
      description: 'VercelのAPIトークンを取得または確認',
      
      inputSchema: z.object({}),
      
      outputSchema: z.object({
        hasToken: z.boolean(),
        message: z.string(),
      }),
      
      handler: async () => {
        // Vercel CLIの設定からトークンを取得
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');
        
        try {
          // Vercel CLIの設定ファイルパス
          const configPath = path.join(os.homedir(), '.vercel', 'auth.json');
          const configData = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configData);
          
          if (config.token) {
            process.env.VERCEL_TOKEN = config.token;
            return {
              hasToken: true,
              message: 'Vercel APIトークンを取得しました',
            };
          }
        } catch (error) {
          // 環境変数から取得を試みる
          if (process.env.VERCEL_TOKEN) {
            return {
              hasToken: true,
              message: '環境変数からVercel APIトークンを使用',
            };
          }
        }
        
        return {
          hasToken: false,
          message: 'Vercel APIトークンが見つかりません。vercel loginを実行してください',
        };
      },
    }),
    
    // プロジェクト情報取得
    getProjectInfo: createTool({
      id: 'get-project-info',
      name: 'プロジェクト情報取得',
      description: 'Vercelプロジェクトの情報を取得',
      
      inputSchema: z.object({
        projectName: z.string(),
      }),
      
      outputSchema: z.object({
        success: z.boolean(),
        projectId: z.string().optional(),
        teamId: z.string().optional(),
        error: z.string().optional(),
      }),
      
      handler: async ({ projectName }) => {
        const token = process.env.VERCEL_TOKEN;
        if (!token) {
          return {
            success: false,
            error: 'Vercel APIトークンが設定されていません',
          };
        }
        
        try {
          // プロジェクト一覧を取得
          const response = await fetch('https://api.vercel.com/v9/projects', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          const data = await response.json() as any;
          const project = data.projects?.find((p: any) => p.name === projectName);
          
          if (project) {
            return {
              success: true,
              projectId: project.id,
              teamId: project.accountId,
            };
          }
          
          return {
            success: false,
            error: `プロジェクト ${projectName} が見つかりません`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    }),
    
    // 環境変数設定
    setEnvironmentVariable: createTool({
      id: 'set-env-var',
      name: '環境変数設定',
      description: 'Vercelプロジェクトの環境変数を設定',
      
      inputSchema: z.object({
        projectId: z.string(),
        teamId: z.string().optional(),
        key: z.string(),
        value: z.string(),
        target: z.array(z.enum(['production', 'preview', 'development'])).default(['production', 'preview', 'development']),
      }),
      
      outputSchema: z.object({
        success: z.boolean(),
        created: z.boolean().optional(),
        error: z.string().optional(),
      }),
      
      handler: async ({ projectId, teamId, key, value, target }) => {
        const token = process.env.VERCEL_TOKEN;
        if (!token) {
          return {
            success: false,
            error: 'Vercel APIトークンが設定されていません',
          };
        }
        
        try {
          const url = teamId 
            ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
            : `https://api.vercel.com/v10/projects/${projectId}/env`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key,
              value,
              type: 'encrypted',
              target,
            }),
          });
          
          if (response.ok) {
            return {
              success: true,
              created: true,
            };
          }
          
          // 既存の変数を更新
          if (response.status === 400) {
            const envIdResponse = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            const envData = await envIdResponse.json() as any;
            const existingEnv = envData.envs?.find((e: any) => e.key === key);
            
            if (existingEnv) {
              // 既存の環境変数を削除
              const deleteUrl = `${url}/${existingEnv.id}`;
              await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              // 新しい値で再作成
              const createResponse = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  key,
                  value,
                  type: 'encrypted',
                  target,
                }),
              });
              
              if (createResponse.ok) {
                return {
                  success: true,
                  created: true,
                };
              }
            }
          }
          
          const errorData = await response.json() as any;
          throw new Error(errorData.error?.message || response.statusText);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    }),
    
    // バッチ環境変数設定
    setEnvironmentVariables: createTool({
      id: 'set-env-vars-batch',
      name: '環境変数一括設定',
      description: '複数の環境変数を一括設定',
      
      inputSchema: z.object({
        projectName: z.string(),
        variables: z.array(z.object({
          key: z.string(),
          value: z.string(),
        })),
      }),
      
      outputSchema: z.object({
        success: z.boolean(),
        results: z.array(z.object({
          key: z.string(),
          success: z.boolean(),
          error: z.string().optional(),
        })),
      }),
      
      handler: async ({ projectName, variables }) => {
        // トークン確認
        const tokenResult = await vercelIntegrationAgent.run('getVercelToken', {});
        if (!tokenResult.hasToken) {
          return {
            success: false,
            results: [{
              key: 'all',
              success: false,
              error: tokenResult.message,
            }],
          };
        }
        
        // プロジェクト情報取得
        const projectInfo = await vercelIntegrationAgent.run('getProjectInfo', { projectName });
        if (!projectInfo.success || !projectInfo.projectId) {
          return {
            success: false,
            results: [{
              key: 'all',
              success: false,
              error: projectInfo.error || 'プロジェクトが見つかりません',
            }],
          };
        }
        
        // 各環境変数を設定
        const results = [];
        for (const variable of variables) {
          console.log(`設定中: ${variable.key}`);
          
          const result = await vercelIntegrationAgent.run('setEnvironmentVariable', {
            projectId: projectInfo.projectId,
            teamId: projectInfo.teamId,
            key: variable.key,
            value: variable.value,
          });
          
          results.push({
            key: variable.key,
            success: result.success,
            error: result.error,
          });
        }
        
        return {
          success: results.every(r => r.success),
          results,
        };
      },
    }),
    
    // デプロイトリガー
    triggerDeployment: createTool({
      id: 'trigger-deployment',
      name: 'デプロイトリガー',
      description: 'Vercelプロジェクトの再デプロイをトリガー',
      
      inputSchema: z.object({
        projectId: z.string(),
        teamId: z.string().optional(),
      }),
      
      outputSchema: z.object({
        success: z.boolean(),
        deploymentUrl: z.string().optional(),
        error: z.string().optional(),
      }),
      
      handler: async ({ projectId, teamId }) => {
        const token = process.env.VERCEL_TOKEN;
        if (!token) {
          return {
            success: false,
            error: 'Vercel APIトークンが設定されていません',
          };
        }
        
        try {
          const url = teamId
            ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
            : `https://api.vercel.com/v13/deployments`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: projectId,
              project: projectId,
              target: 'production',
              gitSource: {
                type: 'github',
                repoId: process.env.GITHUB_REPO_ID,
                ref: 'main',
              },
            }),
          });
          
          if (response.ok) {
            const data = await response.json() as any;
            return {
              success: true,
              deploymentUrl: data.url,
            };
          }
          
          const errorData = await response.json() as any;
          throw new Error(errorData.error?.message || response.statusText);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    }),
  },
});

// 環境変数を自動設定してデプロイする関数
export async function setupVercelEnvironmentAndDeploy() {
  console.log('🚀 Mastra Vercel自動デプロイを開始します...\n');
  
  // 環境変数を準備
  const variables = [
    {
      key: 'AZURE_FORM_RECOGNIZER_ENDPOINT',
      value: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || '',
    },
    {
      key: 'AZURE_FORM_RECOGNIZER_KEY',
      value: process.env.AZURE_FORM_RECOGNIZER_KEY || '',
    },
    {
      key: 'MONGODB_URI',
      value: process.env.MONGODB_URI || '',
    },
    {
      key: 'USE_AZURE_MONGODB',
      value: 'true',
    },
  ];
  
  // 環境変数を設定
  console.log('📋 環境変数を設定中...');
  const result = await vercelIntegrationAgent.run('setEnvironmentVariablesBatch', {
    projectName: 'accounting-automation',
    variables,
  });
  
  if (result.success) {
    console.log('✅ 環境変数の設定が完了しました！');
    
    // デプロイ実行（CLIを使用）
    console.log('\n🚀 デプロイを実行中...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('vercel --prod --yes');
      console.log('✅ デプロイが完了しました！');
      console.log(stdout);
    } catch (error) {
      console.error('❌ デプロイエラー:', error);
    }
  } else {
    console.error('❌ 環境変数の設定に失敗しました');
    result.results.forEach(r => {
      if (!r.success) {
        console.error(`  - ${r.key}: ${r.error}`);
      }
    });
  }
}