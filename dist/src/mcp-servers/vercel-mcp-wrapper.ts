#!/usr/bin/env node

/**
 * Vercel MCP Server Wrapper
 * Vercelデプロイメントの操作を自動化するMCPサーバーのラッパー
 */

import { spawn } from 'child_process';
import path from 'path';

import { logger } from '@/lib/logger';
const serverPath = path.join(__dirname, 'external/vercel-mcp-server');

// 環境変数の設定
const env = {
  ...process.env,
  VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || '',
};

// Vercel MCPサーバーを起動
const vercelServer = spawn('node', [path.join(serverPath, 'dist/index.js')], {
  env,
  stdio: 'inherit',
});

vercelServer.on('error', (error) => {
  logger.error('Failed to start Vercel MCP server:', error);
  process.exit(1);
});

vercelServer.on('exit', (code) => {
  logger.debug(`Vercel MCP server exited with code ${code}`);
  process.exit(code || 0);
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  vercelServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  vercelServer.kill();
  process.exit(0);
});