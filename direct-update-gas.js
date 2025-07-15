/**
 * Google Apps Script 直接更新 (認証済み)
 * 認証は成功しているため、コードの更新のみ実行
 */

const { google } = require('googleapis');
const fs = require('fs');

// 設定
const SERVICE_ACCOUNT_PATH = '/Users/tonychustudio/Downloads/claudemcp-451912-ad5c94da1115.json';
const GAS_PROJECT_ID = '1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5';
const CODE_FILE_PATH = '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-src/complete-ocr-system-fixed.gs';

const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/drive'
];

async function authenticate() {
  try {
    const serviceAccountKey = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    
    const jwtClient = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: SCOPES
    });
    
    await jwtClient.authorize();
    console.log('✅ Service Account認証成功');
    
    return jwtClient;
  } catch (error) {
    console.error('❌ 認証エラー:', error.message);
    throw error;
  }
}

async function updateProjectCodeDirect(auth) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    // 現在のプロジェクトファイルを取得
    const currentContent = await script.projects.getContent({
      scriptId: GAS_PROJECT_ID
    });
    
    // 新しいコードを読み込み
    const newCode = fs.readFileSync(CODE_FILE_PATH, 'utf8');
    
    // 既存のappsscript.jsonを保持
    const appsscriptFile = currentContent.data.files.find(f => f.type === 'JSON');
    
    // 新しいファイル構成を作成
    const updatedFiles = [
      {
        name: 'Code',
        type: 'SERVER_JS',
        source: newCode
      }
    ];
    
    // appsscript.jsonを追加（存在する場合）
    if (appsscriptFile) {
      updatedFiles.push({
        name: 'appsscript',
        type: 'JSON',
        source: appsscriptFile.source
      });
    }
    
    // プロジェクトを更新
    const updateResponse = await script.projects.updateContent({
      scriptId: GAS_PROJECT_ID,
      requestBody: {
        files: updatedFiles
      }
    });
    
    console.log('✅ プロジェクト更新成功');
    console.log('更新されたファイル数:', updateResponse.data.files.length);
    
    return updateResponse.data;
    
  } catch (error) {
    console.error('❌ プロジェクト更新エラー:', error.message);
    
    // エラーが権限関連の場合は手動での更新手順を表示
    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      console.log('\n📋 手動更新手順:');
      console.log('1. https://script.google.com/d/' + GAS_PROJECT_ID + '/edit を開く');
      console.log('2. Code.gs ファイルを開く');
      console.log('3. 全てのコードを削除');
      console.log('4. 新しいコードを貼り付け');
      console.log('5. 保存 (Ctrl+S)');
      console.log('6. サービス > Drive API を追加');
      console.log('\n新しいコードは以下のファイルにあります:');
      console.log(CODE_FILE_PATH);
    }
    
    throw error;
  }
}

// appsscript.jsonの更新（Drive API v2を含む）
async function updateAppsscriptJson(auth) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    // 現在のプロジェクトファイルを取得
    const currentContent = await script.projects.getContent({
      scriptId: GAS_PROJECT_ID
    });
    
    // appsscript.jsonを探す
    const appsscriptFile = currentContent.data.files.find(f => f.type === 'JSON');
    
    if (!appsscriptFile) {
      console.log('❌ appsscript.json が見つかりません');
      return;
    }
    
    // 現在の設定を解析
    const currentConfig = JSON.parse(appsscriptFile.source);
    
    // Drive API v2を追加
    const updatedConfig = {
      ...currentConfig,
      dependencies: {
        ...currentConfig.dependencies,
        enabledAdvancedServices: [
          ...(currentConfig.dependencies?.enabledAdvancedServices || []),
          {
            userSymbol: 'Drive',
            serviceId: 'drive',
            version: 'v2'
          }
        ]
      }
    };
    
    // 重複を削除
    if (updatedConfig.dependencies.enabledAdvancedServices) {
      const uniqueServices = [];
      const seen = new Set();
      
      for (const service of updatedConfig.dependencies.enabledAdvancedServices) {
        const key = `${service.userSymbol}_${service.serviceId}_${service.version}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueServices.push(service);
        }
      }
      
      updatedConfig.dependencies.enabledAdvancedServices = uniqueServices;
    }
    
    console.log('✅ appsscript.json更新設定:');
    console.log(JSON.stringify(updatedConfig, null, 2));
    
    return updatedConfig;
    
  } catch (error) {
    console.error('❌ appsscript.json更新エラー:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Google Apps Script プロジェクト直接更新を開始します');
    console.log('プロジェクトID:', GAS_PROJECT_ID);
    console.log('');
    
    // 1. 認証
    console.log('1. Service Account認証中...');
    const auth = await authenticate();
    
    // 2. appsscript.jsonの更新設定を確認
    console.log('\n2. appsscript.json設定を確認中...');
    const updatedConfig = await updateAppsscriptJson(auth);
    
    // 3. コードの更新を試行
    console.log('\n3. プロジェクトコードを更新中...');
    try {
      await updateProjectCodeDirect(auth);
      console.log('\n🎉 Google Apps Script プロジェクト更新完了！');
    } catch (updateError) {
      console.log('\n⚠️  API経由での更新に失敗しました。手動での更新が必要です。');
    }
    
    console.log('\n📍 プロジェクトURL: https://script.google.com/d/' + GAS_PROJECT_ID + '/edit');
    console.log('📁 ソースコードファイル:', CODE_FILE_PATH);
    
    // 4. 更新後の手順をガイド
    console.log('\n✅ 更新後の確認手順:');
    console.log('1. GASエディタでプロジェクトを開く');
    console.log('2. サービス > Drive API を追加（まだの場合）');
    console.log('3. テスト関数を実行: checkApiSettings()');
    console.log('4. テスト関数を実行: testSupabaseConnection()');
    console.log('5. Web Appとして公開（必要に応じて）');
    
  } catch (error) {
    console.error('\n💥 処理中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}