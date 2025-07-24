const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Mastra Cloudへのデプロイスクリプト
 * 注意: 実際のデプロイはMastra CloudのUIまたはCLIを使用して行う必要があります
 * このスクリプトは、デプロイの準備状況を確認するためのものです
 */

const checkDeploymentReadiness = async () => {
  console.log('🚀 Mastra Cloud デプロイ準備チェックを開始します...');
  console.log('\n📋 チェックリスト:');
  
  // 1. 環境変数チェック
  console.log('\n1. 環境変数チェック:');
  const requiredEnvVars = [
    'AZURE_COSMOSDB_CONNECTION_STRING',
    'OPENAI_API_KEY',
    'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT',
    'AZURE_DOCUMENT_INTELLIGENCE_KEY',
  ];
  
  let allEnvVarsPresent = true;
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`  ✅ ${envVar}: 設定済み`);
    } else {
      console.log(`  ❌ ${envVar}: 未設定`);
      allEnvVarsPresent = false;
    }
  });
  
  // 2. エージェントファイルの存在確認
  console.log('\n2. エージェントファイル確認:');
  const agents = [
    'mastra-accounting-agent',
    'mastra-customer-agent',
    'mastra-ocr-agent',
    'mastra-japan-tax-agent',
    'mastra-database-agent',
    'mastra-product-agent',
    'mastra-ui-agent',
    'mastra-construction-agent',
    'mastra-deployment-agent',
    'mastra-problem-solving-agent',
    'mastra-refactor-agent',
  ];
  
  const fs = require('fs');
  let allAgentsPresent = true;
  agents.forEach(agent => {
    const filePath = path.join(__dirname, '..', 'src', 'agents', `${agent}.ts`);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${agent}: ファイル存在`);
    } else {
      console.log(`  ❌ ${agent}: ファイルが見つかりません`);
      allAgentsPresent = false;
    }
  });
  
  // 3. Mastraインデックスファイルの確認
  console.log('\n3. Mastraインデックスファイル確認:');
  const indexPath = path.join(__dirname, '..', 'src', 'mastra', 'index.ts');
  if (fs.existsSync(indexPath)) {
    console.log('  ✅ src/mastra/index.ts: ファイル存在');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    agents.forEach(agent => {
      // Convert kebab-case to camelCase
      const parts = agent.split('-');
      const camelCase = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      
      if (indexContent.includes(camelCase)) {
        console.log(`  ✅ ${camelCase}: インポート済み`);
      } else {
        console.log(`  ❌ ${camelCase}: インポートされていません`);
      }
    });
  } else {
    console.log('  ❌ src/mastra/index.ts: ファイルが見つかりません');
  }
  
  // 4. パッケージの確認
  console.log('\n4. 必須パッケージ確認:');
  const packageJson = require(path.join(__dirname, '..', 'package.json'));
  const requiredPackages = ['@mastra/core'];
  
  requiredPackages.forEach(pkg => {
    if (packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]) {
      console.log(`  ✅ ${pkg}: インストール済み`);
    } else {
      console.log(`  ❌ ${pkg}: 未インストール`);
    }
  });
  
  // 最終結果
  console.log('\n📊 最終結果:');
  if (allEnvVarsPresent && allAgentsPresent) {
    console.log('✅ すべてのチェックに合格しました！');
    console.log('\n🚀 次のステップ:');
    console.log('1. Mastra Cloud (https://app.mastra.ai) にログイン');
    console.log('2. 新しいプロジェクトを作成');
    console.log('3. プロジェクトにこのリポジトリを接続');
    console.log('4. 環境変数を設定');
    console.log('5. デプロイを実行');
  } else {
    console.log('❌ いくつかの問題があります。上記の問題を修正してください。');
  }
};

// スクリプトを実行
checkDeploymentReadiness().catch(console.error);