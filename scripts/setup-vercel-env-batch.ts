import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// .env.localファイルを読み込む
function loadEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.localファイルが見つかりません。');
    console.log('\n先に.env.localファイルを作成してください。');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

// Vercel環境変数を設定
async function setVercelEnv(key: string, value: string): Promise<void> {
  // production環境に設定
  await setVercelEnvForEnvironment(key, value, 'production');
  // preview環境に設定
  await setVercelEnvForEnvironment(key, value, 'preview');
  // development環境に設定
  await setVercelEnvForEnvironment(key, value, 'development');
}

// 特定の環境にVercel環境変数を設定
async function setVercelEnvForEnvironment(key: string, value: string, env: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['env', 'add', key, env];
    const vercel = spawn('vercel', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    vercel.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    vercel.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    // 値を標準入力に送信
    vercel.stdin.write(value + '\n');
    vercel.stdin.end();
    
    vercel.on('close', (code) => {
      if (code === 0 || output.includes('Success') || output.includes('Updated') || output.includes('Added')) {
        // 成功時は何も出力しない（3環境分出力されるため）
        resolve();
      } else if (error.includes('already exists') || output.includes('already exists')) {
        // 既に存在する場合もスキップ
        resolve();
      } else {
        console.error(`❌ ${key} の${env}環境への設定に失敗しました:`, error || output);
        reject(new Error(`Failed to set ${key} for ${env}`));
      }
    });
    
    vercel.on('error', (err) => {
      reject(err);
    });
  });
}

// メイン処理
async function main() {
  console.log('🚀 Vercel環境変数バッチセットアップツール');
  console.log('=====================================\n');
  
  console.log('📂 .env.localファイルから環境変数を読み込んでいます...\n');
  
  const envVars = loadEnvFile();
  const envKeys = Object.keys(envVars);
  
  if (envKeys.length === 0) {
    console.error('❌ .env.localファイルに環境変数が見つかりません。');
    process.exit(1);
  }
  
  console.log(`✅ ${envKeys.length}個の環境変数を検出しました:\n`);
  envKeys.forEach(key => {
    const value = envVars[key];
    const masked = value.length > 8 ? value.substring(0, 4) + '****' + value.substring(value.length - 4) : '****';
    console.log(`  - ${key} = ${masked}`);
  });
  
  console.log('\n⚠️  注意: このスクリプトはすべての環境変数をVercelの全環境(production, preview, development)に設定します。\n');
  
  // Vercel CLIがインストールされているか確認
  try {
    const version = await new Promise<string>((resolve, reject) => {
      const vercel = spawn('vercel', ['--version']);
      let output = '';
      vercel.stdout.on('data', (data) => output += data.toString());
      vercel.on('close', (code) => code === 0 ? resolve(output) : reject());
      vercel.on('error', reject);
    });
    console.log('✅ Vercel CLI検出:', version.trim());
  } catch (error) {
    console.error('❌ Vercel CLIがインストールされていません。');
    console.log('\n以下のコマンドでインストールしてください:');
    console.log('npm i -g vercel\n');
    process.exit(1);
  }
  
  // プロジェクトがリンクされているか確認
  console.log('\n📎 Vercelプロジェクトの接続を確認しています...');
  console.log('⚠️  プロジェクトがまだリンクされていない場合は、先に以下のコマンドを実行してください:');
  console.log('   vercel link\n');
  
  console.log('🔄 Vercelに環境変数を設定しています...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  // 各環境変数をVercelに設定
  for (const [key, value] of Object.entries(envVars)) {
    try {
      console.log(`📝 設定中: ${key}...`);
      await setVercelEnv(key, value);
      console.log(`✅ ${key} を全環境に設定しました。`);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ ${key} の設定中にエラーが発生しました:`, error);
    }
  }
  
  console.log('\n\n📊 結果:');
  console.log(`✅ 成功: ${successCount}個`);
  console.log(`⚠️  スキップ: ${skipCount}個`);
  console.log(`❌ エラー: ${errorCount}個`);
  
  if (successCount > 0) {
    console.log('\n✅ 環境変数の設定が完了しました！');
    console.log('\n📌 次のステップ:');
    console.log('1. Vercelダッシュボードで環境変数を確認');
    console.log('   https://vercel.com/dashboard');
    console.log('2. 最新のデプロイメントを再デプロイ');
    console.log('   vercel --prod');
    console.log('3. アプリケーションで動作確認\n');
  }
}

// エラーハンドリング
process.on('unhandledRejection', (err) => {
  console.error('\n❌ エラーが発生しました:', err);
  process.exit(1);
});

// 実行
main().catch((err) => {
  console.error('\n❌ エラーが発生しました:', err);
  process.exit(1);
});