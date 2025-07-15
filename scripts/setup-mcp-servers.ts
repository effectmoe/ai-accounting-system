#!/usr/bin/env tsx

/**
 * MCPサーバーのセットアップスクリプト
 * GitHub/Vercel MCPサーバーの依存関係をインストールし、設定を行う
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');
const externalServersPath = path.join(projectRoot, 'src/mcp-servers/external');

console.log('🚀 Setting up MCP servers...');

// GitHub MCP Serverのセットアップ
const githubServerPath = path.join(externalServersPath, 'github-mcp-server');
if (fs.existsSync(githubServerPath)) {
  console.log('📦 Installing dependencies for GitHub MCP Server...');
  try {
    execSync('npm install', { cwd: githubServerPath, stdio: 'inherit' });
    execSync('npm run build', { cwd: githubServerPath, stdio: 'inherit' });
    console.log('✅ GitHub MCP Server setup complete');
  } catch (error) {
    console.error('❌ Failed to setup GitHub MCP Server:', error);
  }
} else {
  console.log('⚠️  GitHub MCP Server not found. Please run:');
  console.log('   git clone https://github.com/github/github-mcp-server.git', githubServerPath);
}

// Vercel MCP Serverのセットアップ
const vercelServerPath = path.join(externalServersPath, 'vercel-mcp-server');
if (fs.existsSync(vercelServerPath)) {
  console.log('📦 Installing dependencies for Vercel MCP Server...');
  try {
    execSync('npm install', { cwd: vercelServerPath, stdio: 'inherit' });
    execSync('npm run build', { cwd: vercelServerPath, stdio: 'inherit' });
    console.log('✅ Vercel MCP Server setup complete');
  } catch (error) {
    console.error('❌ Failed to setup Vercel MCP Server:', error);
  }
} else {
  console.log('⚠️  Vercel MCP Server not found. Please run:');
  console.log('   git clone https://github.com/Quegenx/vercel-mcp-server.git', vercelServerPath);
}

// 環境変数の確認
console.log('\n🔐 Checking environment variables...');
const requiredEnvVars = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER', 
  'GITHUB_REPO',
  'VERCEL_TOKEN',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.log('⚠️  Missing environment variables:');
  missingEnvVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\nPlease set these in your .env.local file');
} else {
  console.log('✅ All required environment variables are set');
}

console.log('\n🎉 MCP servers setup complete!');
console.log('You can now use GitHub and Vercel MCP servers in your Mastra agents.');