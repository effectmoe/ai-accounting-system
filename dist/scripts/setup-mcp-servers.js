#!/usr/bin/env tsx
"use strict";
/**
 * MCPサーバーのセットアップスクリプト
 * GitHub/Vercel MCPサーバーの依存関係をインストールし、設定を行う
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const projectRoot = path_1.default.resolve(__dirname, '..');
const externalServersPath = path_1.default.join(projectRoot, 'src/mcp-servers/external');
console.log('🚀 Setting up MCP servers...');
// GitHub MCP Serverのセットアップ
const githubServerPath = path_1.default.join(externalServersPath, 'github-mcp-server');
if (fs_1.default.existsSync(githubServerPath)) {
    console.log('📦 Installing dependencies for GitHub MCP Server...');
    try {
        (0, child_process_1.execSync)('npm install', { cwd: githubServerPath, stdio: 'inherit' });
        (0, child_process_1.execSync)('npm run build', { cwd: githubServerPath, stdio: 'inherit' });
        console.log('✅ GitHub MCP Server setup complete');
    }
    catch (error) {
        console.error('❌ Failed to setup GitHub MCP Server:', error);
    }
}
else {
    console.log('⚠️  GitHub MCP Server not found. Please run:');
    console.log('   git clone https://github.com/github/github-mcp-server.git', githubServerPath);
}
// Vercel MCP Serverのセットアップ
const vercelServerPath = path_1.default.join(externalServersPath, 'vercel-mcp-server');
if (fs_1.default.existsSync(vercelServerPath)) {
    console.log('📦 Installing dependencies for Vercel MCP Server...');
    try {
        (0, child_process_1.execSync)('npm install', { cwd: vercelServerPath, stdio: 'inherit' });
        (0, child_process_1.execSync)('npm run build', { cwd: vercelServerPath, stdio: 'inherit' });
        console.log('✅ Vercel MCP Server setup complete');
    }
    catch (error) {
        console.error('❌ Failed to setup Vercel MCP Server:', error);
    }
}
else {
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
}
else {
    console.log('✅ All required environment variables are set');
}
console.log('\n🎉 MCP servers setup complete!');
console.log('You can now use GitHub and Vercel MCP servers in your Mastra agents.');
