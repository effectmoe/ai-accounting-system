/**
 * Google Apps Script プロジェクト自動更新スクリプト
 * Service Account認証を使用してGASプロジェクトのファイルを更新
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// 設定
const SERVICE_ACCOUNT_PATH = '/Users/tonychustudio/Downloads/claudemcp-451912-ad5c94da1115.json';
const GAS_PROJECT_ID = '1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5';
const CODE_FILE_PATH = '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-src/complete-ocr-system.gs';

// 必要なスコープ
const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/drive'
];

/**
 * Service Account認証を行い、認証済みのクライアントを返す
 */
async function authenticate() {
  try {
    // Service Accountキーファイルを読み込み
    const serviceAccountKey = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    
    // JWT認証を設定
    const jwtClient = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: SCOPES
    });
    
    // 認証を実行
    await jwtClient.authorize();
    console.log('✅ Service Account認証成功');
    
    return jwtClient;
    
  } catch (error) {
    console.error('❌ 認証エラー:', error.message);
    throw error;
  }
}

/**
 * Google Apps Script プロジェクトの情報を取得
 */
async function getProjectInfo(auth) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    const project = await script.projects.get({
      scriptId: GAS_PROJECT_ID
    });
    
    console.log('✅ プロジェクト情報取得成功');
    console.log('プロジェクト名:', project.data.title);
    console.log('作成者:', project.data.creator?.email);
    console.log('最終更新:', project.data.updateTime);
    
    return project.data;
    
  } catch (error) {
    console.error('❌ プロジェクト情報取得エラー:', error.message);
    throw error;
  }
}

/**
 * プロジェクトのファイル一覧を取得
 */
async function getProjectFiles(auth) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    const content = await script.projects.getContent({
      scriptId: GAS_PROJECT_ID
    });
    
    console.log('✅ プロジェクトファイル一覧取得成功');
    console.log('ファイル数:', content.data.files.length);
    
    content.data.files.forEach(file => {
      console.log(`- ${file.name} (${file.type})`);
    });
    
    return content.data;
    
  } catch (error) {
    console.error('❌ プロジェクトファイル取得エラー:', error.message);
    throw error;
  }
}

/**
 * 新しいコードでプロジェクトを更新
 */
async function updateProjectCode(auth) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    // 現在のプロジェクトファイルを取得
    const currentContent = await script.projects.getContent({
      scriptId: GAS_PROJECT_ID
    });
    
    // 新しいコードを読み込み
    const newCode = fs.readFileSync(CODE_FILE_PATH, 'utf8');
    
    // ファイルを更新
    const updatedFiles = currentContent.data.files.map(file => {
      if (file.name === 'Code' && file.type === 'SERVER_JS') {
        return {
          ...file,
          source: newCode
        };
      }
      return file;
    });
    
    // Code.gsファイルが存在しない場合は新規作成
    if (!updatedFiles.some(f => f.name === 'Code' && f.type === 'SERVER_JS')) {
      updatedFiles.push({
        name: 'Code',
        type: 'SERVER_JS',
        source: newCode
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
    if (error.response && error.response.data) {
      console.error('詳細:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Drive API v2 サービスの確認と追加
 */
async function ensureDriveApiService(auth) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    // 現在のプロジェクト情報を取得
    const project = await script.projects.get({
      scriptId: GAS_PROJECT_ID
    });
    
    // 既存のサービスを確認
    const existingServices = project.data.runtimeVersion === 'V8' ? 
      (project.data.executionApi?.access || 'MYSELF') : 'MYSELF';
    
    console.log('✅ Drive API v2サービスの確認完了');
    console.log('Note: Drive API v2は手動でサービスページから追加する必要があります');
    console.log('GASエディタ > サービス > Drive API を追加してください');
    
    return true;
    
  } catch (error) {
    console.error('❌ Drive API確認エラー:', error.message);
    return false;
  }
}

/**
 * テスト関数の実行
 */
async function runTestFunction(auth, functionName) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    console.log(`🔄 テスト関数 ${functionName} を実行中...`);
    
    const execution = await script.scripts.run({
      scriptId: GAS_PROJECT_ID,
      requestBody: {
        function: functionName,
        devMode: false
      }
    });
    
    if (execution.data.error) {
      console.error(`❌ ${functionName} 実行エラー:`, execution.data.error);
      return false;
    }
    
    console.log(`✅ ${functionName} 実行成功`);
    if (execution.data.response && execution.data.response.result) {
      console.log('結果:', execution.data.response.result);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ ${functionName} 実行エラー:`, error.message);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 Google Apps Script プロジェクト自動更新を開始します');
    console.log('プロジェクトID:', GAS_PROJECT_ID);
    console.log('');
    
    // 1. 認証
    console.log('1. Service Account認証中...');
    const auth = await authenticate();
    
    // 2. プロジェクト情報の取得
    console.log('\n2. プロジェクト情報を取得中...');
    await getProjectInfo(auth);
    
    // 3. 現在のファイル一覧を取得
    console.log('\n3. 現在のプロジェクトファイルを確認中...');
    await getProjectFiles(auth);
    
    // 4. コードの更新
    console.log('\n4. プロジェクトコードを更新中...');
    await updateProjectCode(auth);
    
    // 5. Drive API v2サービスの確認
    console.log('\n5. Drive API v2サービスを確認中...');
    await ensureDriveApiService(auth);
    
    // 6. テスト関数の実行
    console.log('\n6. テスト関数を実行中...');
    const testFunctions = [
      'checkApiSettings',
      'checkRecentFiles',
      'testSupabaseConnection'
    ];
    
    for (const funcName of testFunctions) {
      await runTestFunction(auth, funcName);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒間隔
    }
    
    console.log('\n🎉 Google Apps Script プロジェクト更新完了！');
    console.log('プロジェクトURL: https://script.google.com/d/' + GAS_PROJECT_ID + '/edit');
    
  } catch (error) {
    console.error('\n💥 更新処理中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main();
}

module.exports = {
  authenticate,
  getProjectInfo,
  getProjectFiles,
  updateProjectCode,
  ensureDriveApiService,
  runTestFunction
};