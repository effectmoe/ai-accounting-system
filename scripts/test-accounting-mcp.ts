#!/usr/bin/env tsx

/**
 * Accounting MCP Server Test Script
 * accounting-mcp-serverの動作確認用スクリプト
 */

import { spawn } from 'child_process';
import * as readline from 'readline';

async function testAccountingMCPServer() {
  console.log('🧪 Testing Accounting MCP Server...\n');

  // 環境変数の設定
  const env = {
    ...process.env,
    DEEPSEEK_API_KEY: 'sk-97f6efd342ba4f7cb1d98e4ac26ac720',
    MONGODB_URI: 'mongodb://localhost:27017/mastra-accounting',
  };

  // サーバープロセスの起動
  const serverProcess = spawn('npx', ['tsx', 'src/mcp-servers/accounting-mcp-server.ts'], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // エラー出力の監視
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('Server log:', output);
    
    if (output.includes('running on stdio')) {
      console.log('✅ Server started successfully!\n');
      runTests(serverProcess);
    }
  });

  // プロセスエラーの処理
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

  // プロセス終了の処理
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(code || 1);
    }
  });
}

async function runTests(serverProcess: any) {
  const rl = readline.createInterface({
    input: serverProcess.stdout,
    output: process.stdout,
    terminal: false,
  });

  let responseReceived = false;

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      console.log('📥 Response:', JSON.stringify(response, null, 2));
      responseReceived = true;
      
      if (response.result?.tools) {
        console.log('\n✅ Tool list received successfully!');
        console.log(`📋 Available tools: ${response.result.tools.length}`);
        response.result.tools.forEach((tool: any) => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
      }
    } catch (error) {
      // JSON以外の出力は無視
    }
  });

  // テスト1: ツールリストの取得
  console.log('📤 Test 1: Requesting tool list...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  };
  
  serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // レスポンスを待つ
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!responseReceived) {
    console.error('❌ No response received from server');
    serverProcess.kill();
    process.exit(1);
  }

  // テスト2: カテゴリ分類の実行
  console.log('\n📤 Test 2: Testing categorize function...');
  const categorizeRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'accounting_categorize',
      arguments: {
        description: 'レストランでの食事',
        amount: 3500,
        transactionType: 'expense',
        companyId: 'test-company-001',
      },
    },
  };

  serverProcess.stdin.write(JSON.stringify(categorizeRequest) + '\n');

  // レスポンスを待つ
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ All tests completed!');
  serverProcess.kill();
  process.exit(0);
}

// メイン実行
testAccountingMCPServer().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});