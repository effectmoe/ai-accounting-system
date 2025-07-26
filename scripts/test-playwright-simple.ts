#!/usr/bin/env tsx

import { spawn } from 'child_process';

console.log('Playwright MCPサーバーのテスト...\n');

const proc = spawn('npx', ['-y', '@modelcontextprotocol/server-playwright'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let output = '';
let errorOutput = '';

proc.stdout.on('data', (data) => {
  output += data.toString();
});

proc.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

// 初期化メッセージを送信
setTimeout(() => {
  const initMessage = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  }) + '\n';
  
  proc.stdin.write(initMessage);
}, 1000);

// 5秒後に結果を確認
setTimeout(() => {
  console.log('標準出力:', output || '(なし)');
  console.log('エラー出力:', errorOutput || '(なし)');
  
  if (output.includes('Playwright') || errorOutput.includes('Playwright')) {
    console.log('\n✅ Playwright MCPサーバーは正常に起動しています');
  } else {
    console.log('\n❌ Playwright MCPサーバーの起動に問題がある可能性があります');
  }
  
  proc.kill();
  process.exit(0);
}, 5000);