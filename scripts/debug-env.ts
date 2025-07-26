#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log('🔍 環境変数の確認:\n');

const mcpEnvVars = [
  'GITHUB_TOKEN',
  'BRAVE_API_KEY',
  'VERCEL_TOKEN',
  'PERPLEXITY_API_KEY',
];

mcpEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: 未設定`);
  }
});

console.log('\n📁 作業ディレクトリ:', process.cwd());
console.log('📁 .env.localのパス:', path.join(process.cwd(), '.env.local'));