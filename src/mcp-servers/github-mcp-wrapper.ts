#!/usr/bin/env node

/**
 * GitHub MCP Server Wrapper
 * GitHubリポジトリの操作を自動化するMCPサーバーのラッパー
 */

import { spawn } from 'child_process';
import path from 'path';

const serverPath = path.join(__dirname, 'external/github-mcp-server');

// 環境変数の設定
const env = {
  ...process.env,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
};

// GitHub MCPサーバーを起動
const githubServer = spawn('node', [path.join(serverPath, 'dist/index.js')], {
  env,
  stdio: 'inherit',
});

githubServer.on('error', (error) => {
  console.error('Failed to start GitHub MCP server:', error);
  process.exit(1);
});

githubServer.on('exit', (code) => {
  console.log(`GitHub MCP server exited with code ${code}`);
  process.exit(code || 0);
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  githubServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  githubServer.kill();
  process.exit(0);
});