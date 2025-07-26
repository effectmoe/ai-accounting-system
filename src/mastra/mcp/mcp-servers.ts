import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import type { MCPServer } from './mcp-client';

/**
 * MCPサーバーの環境変数設定
 */
interface MCPEnvironmentConfig {
  GITHUB_TOKEN?: string;
  BRAVE_API_KEY?: string;
  VERCEL_TOKEN?: string;
  PERPLEXITY_API_KEY?: string;
}

/**
 * 環境変数を取得
 * @param key 環境変数キー
 * @returns 環境変数の値
 */
function getEnvVar(key: keyof MCPEnvironmentConfig): string {
  const value = process.env[key];
  if (!value) {
    console.warn(`[MCPServers] 環境変数 ${key} が設定されていません`);
  }
  return value || '';
}

/**
 * MCPサーバー設定
 * 
 * 各MCPサーバーの接続設定を定義します。
 * サーバーごとに必要な環境変数やパスを設定しています。
 */
export const MCP_SERVERS: Record<string, MCPServer> = {
  /**
   * ファイルシステムサーバー
   * ローカルファイルシステムへのアクセスを提供
   */
  filesystem: {
    name: 'filesystem',
    command: 'npx',
    args: [
      '-y',
      '@modelcontextprotocol/server-filesystem',
      path.join(os.homedir(), 'Documents', 'aam-orchestration', 'accounting-automation')
    ],
  },
  
  /**
   * GitHubサーバー
   * GitHubリポジトリへのアクセスとAPI操作を提供
   * 要環境変数: GITHUB_TOKEN
   */
  github: {
    name: 'github',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_TOKEN: getEnvVar('GITHUB_TOKEN'),
    },
  },
  
  /**
   * Brave検索サーバー
   * Brave Search APIを使用したWeb検索機能を提供
   * 要環境変数: BRAVE_API_KEY
   */
  search: {
    name: 'search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: {
      BRAVE_API_KEY: getEnvVar('BRAVE_API_KEY'),
    },
  },
  
  /**
   * Vercelサーバー
   * Vercelプラットフォームへのデプロイメント管理を提供
   * 要環境変数: VERCEL_TOKEN
   */
  vercel: {
    name: 'vercel',
    command: 'node',
    args: [
      path.join(os.homedir(), 'mcp-servers', 'vercel-mcp-server', 'dist', 'index.js')
    ],
    env: {
      VERCEL_TOKEN: getEnvVar('VERCEL_TOKEN'),
    },
  },
  
  /**
   * Perplexityサーバー
   * Perplexity AIを使用した高度な検索と分析機能を提供
   * 要環境変数: PERPLEXITY_API_KEY
   */
  perplexity: {
    name: 'perplexity',
    command: path.join(os.homedir(), 'perplexity-mcp', 'venv', 'bin', 'python'),
    args: ['-m', 'perplexity_mcp.server'],
    env: {
      PERPLEXITY_API_KEY: getEnvVar('PERPLEXITY_API_KEY'),
    },
  },
  
  /**
   * Playwrightサーバー
   * ブラウザ自動化とWebスクレイピング機能を提供
   */
  playwright: {
    name: 'playwright',
    command: 'npx',
    args: ['-y', '@playwright/mcp'],
  },
};

/**
 * サーバー設定の検証
 * @param serverName サーバー名
 * @returns 検証結果
 */
export function validateServerConfig(serverName: string): {
  valid: boolean;
  errors: string[];
} {
  const server = MCP_SERVERS[serverName];
  const errors: string[] = [];

  if (!server) {
    return {
      valid: false,
      errors: [`サーバー '${serverName}' が見つかりません`],
    };
  }

  // 環境変数の検証
  if (server.env) {
    for (const [key, value] of Object.entries(server.env)) {
      if (!value) {
        errors.push(`環境変数 ${key} が設定されていません`);
      }
    }
  }

  // コマンドパスの検証（ローカルパスの場合）
  if (server.command.startsWith('/') || server.command.includes(os.homedir())) {
    const fs = require('fs');
    if (!fs.existsSync(server.command)) {
      errors.push(`コマンドパスが存在しません: ${server.command}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 利用可能なサーバーのリストを取得
 * @returns 利用可能なサーバー名の配列
 */
export function getAvailableServers(): string[] {
  return Object.keys(MCP_SERVERS).filter(serverName => {
    const validation = validateServerConfig(serverName);
    return validation.valid;
  });
}

/**
 * サーバー設定のサマリーを取得
 * @returns サーバー設定のサマリー
 */
export function getServersSummary(): Array<{
  name: string;
  available: boolean;
  issues: string[];
}> {
  return Object.keys(MCP_SERVERS).map(serverName => {
    const validation = validateServerConfig(serverName);
    return {
      name: serverName,
      available: validation.valid,
      issues: validation.errors,
    };
  });
}