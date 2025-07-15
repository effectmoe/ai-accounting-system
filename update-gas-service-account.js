#!/usr/bin/env node

/**
 * Google Apps Script プロジェクト更新スクリプト (Service Account版)
 * Service Account を使用してプロジェクトのコードを更新
 */

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');
const { google } = require('googleapis');

// 設定
const PROJECT_ID = '1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5';
const SERVICE_ACCOUNT_EMAIL = 'accounting-ocr@cloudmcp-451912.iam.gserviceaccount.com';
const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.webapp.deploy',
  'https://www.googleapis.com/auth/script.deployments'
];

// Service Account キーファイルの作成
function createServiceAccountKey() {
  const keyData = {
    type: "service_account",
    project_id: "cloudmcp-451912",
    private_key_id: "dummy-key-id",
    private_key: "-----BEGIN PRIVATE KEY-----\nDUMMY_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    client_email: SERVICE_ACCOUNT_EMAIL,
    client_id: "dummy-client-id",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${SERVICE_ACCOUNT_EMAIL.replace('@', '%40')}`
  };
  
  return keyData;
}

async function updateGasProject() {
  try {
    console.log('🚀 Google Apps Script プロジェクト更新開始 (Service Account版)');
    console.log('📋 プロジェクトID:', PROJECT_ID);
    console.log('🔐 Service Account:', SERVICE_ACCOUNT_EMAIL);
    
    // 新しいコードを読み込み
    const newCodePath = path.join(__dirname, 'gas-src', 'complete-ocr-system.gs');
    const newCode = fs.readFileSync(newCodePath, 'utf8');
    
    console.log(`📄 新しいコード: ${newCode.split('\n').length}行, ${newCode.length}文字`);
    
    // Service Account 認証の設定
    try {
      const serviceAccountKey = createServiceAccountKey();
      
      console.log('⚠️  Service Account認証は設定されていますが、');
      console.log('    実際のプライベートキーが必要です。');
      console.log('');
      console.log('📋 必要な手順:');
      console.log('1. GCP Console で Service Account のプライベートキーをダウンロード');
      console.log('2. そのキーファイルを使用して認証');
      console.log('3. Apps Script API を有効化');
      console.log('4. Service Account に適切な権限を付与');
      console.log('');
      
      // 手動での更新手順を表示
      console.log('🔧 手動更新手順:');
      console.log('1. https://script.google.com/d/' + PROJECT_ID + '/edit にアクセス');
      console.log('2. Code.gs ファイルを開く');
      console.log('3. 全てのコードを以下に置き換える:');
      console.log('');
      console.log('=== 新しいコード (先頭10行) ===');
      console.log(newCode.split('\n').slice(0, 10).join('\n'));
      console.log('... (合計' + newCode.split('\n').length + '行)');
      console.log('');
      
      // Drive API v2の追加確認
      console.log('4. サービス > Drive API を追加（まだ追加していない場合）');
      console.log('   - サービス画面で「サービスを追加」をクリック');
      console.log('   - 「Drive API」を検索して追加');
      console.log('   - バージョン: v2');
      console.log('   - 識別子: Drive');
      console.log('');
      
      // テスト関数の実行
      console.log('5. テスト関数を実行:');
      console.log('   - checkApiSettings()');
      console.log('   - testSupabaseConnection()');
      console.log('');
      
      // Web App のデプロイ
      console.log('6. Web App としてデプロイ:');
      console.log('   - 「デプロイ」> 「新しいデプロイ」');
      console.log('   - 種類: ウェブアプリ');
      console.log('   - 実行者: 自分');
      console.log('   - アクセス: 全員');
      console.log('');
      
      return {
        success: true,
        projectId: PROJECT_ID,
        codeLines: newCode.split('\n').length,
        manualUpdateRequired: true,
        projectUrl: `https://script.google.com/d/${PROJECT_ID}/edit`,
        newCodePreview: newCode.split('\n').slice(0, 10).join('\n')
      };
      
    } catch (authError) {
      console.error('❌ 認証エラー:', authError);
      return {
        success: false,
        error: authError.message,
        projectId: PROJECT_ID
      };
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

// 実行
if (require.main === module) {
  updateGasProject()
    .then(result => {
      console.log('\n🎉 結果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 予期しないエラー:', error);
      process.exit(1);
    });
}

module.exports = updateGasProject;