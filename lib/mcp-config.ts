import { MCPServerConfig } from './mcp-client';
import path from 'path';

const projectRoot = path.resolve(process.cwd());

export const mcpServers: Record<string, MCPServerConfig> = {
  gas: {
    command: 'node',
    args: [path.join(projectRoot, 'gas-mcp-server/dist/src/index.js')],
    env: {
      NODE_ENV: 'production'
    }
  },
  
  gdrive: {
    command: 'npx',
    args: ['-y', '@isaacphi/mcp-gdrive'],
    env: {
      CLIENT_ID: process.env.GDRIVE_CLIENT_ID || '',
      CLIENT_SECRET: process.env.GDRIVE_CLIENT_SECRET || '',
      GDRIVE_CREDS_DIR: path.join(process.env.HOME || '', '.config/mcp-gdrive')
    }
  },
  
  supabase: {
    command: 'npx',
    args: [
      '-y',
      '@supabase/mcp-server-supabase@latest',
      '--project-ref=clqpfmroqcnvyxdzadln'
    ],
    env: {
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || ''
    }
  }
};

// MCPサーバーの初期化関数
export async function initializeMCPServers() {
  const { mcpManager } = await import('./mcp-client');
  
  // 環境変数チェック
  const requiredEnvVars = {
    gdrive: ['GDRIVE_CLIENT_ID', 'GDRIVE_CLIENT_SECRET'],
    supabase: ['SUPABASE_ACCESS_TOKEN']
  };
  
  // 各サーバーを接続
  for (const [name, config] of Object.entries(mcpServers)) {
    try {
      // 環境変数チェック
      const required = requiredEnvVars[name as keyof typeof requiredEnvVars];
      if (required) {
        const missing = required.filter(v => !process.env[v]);
        if (missing.length > 0) {
          console.warn(`Skipping ${name} MCP server: Missing environment variables: ${missing.join(', ')}`);
          continue;
        }
      }
      
      await mcpManager.connectServer(name, config);
    } catch (error) {
      console.error(`Failed to initialize ${name} MCP server:`, error);
    }
  }
}