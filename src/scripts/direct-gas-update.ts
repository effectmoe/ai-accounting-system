#!/usr/bin/env npx tsx

/**
 * Direct GAS Update Script
 * Google Apps Script APIを直接使用してプロジェクトを更新
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SCRIPT_ID = '1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5';

async function updateGASProject() {
  console.log('🚀 GASプロジェクトを直接更新中...');
  
  try {
    // Google認証設定
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: [
        'https://www.googleapis.com/auth/script.projects',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const script = google.script({ version: 'v1', auth });

    // 1. 現在のプロジェクト内容を取得（バックアップ用）
    console.log('📄 現在のプロジェクト内容を取得中...');
    const currentProject = await script.projects.getContent({
      scriptId: SCRIPT_ID,
    });

    // バックアップを作成
    const backupDir = '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `gas-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(currentProject.data, null, 2));
    console.log(`💾 バックアップ作成: ${backupFile}`);

    // 2. 新しいコードを読み込み
    console.log('📖 新しいコードを読み込み中...');
    const newCodePath = '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-src/complete-ocr-system-fixed.gs';
    const newCode = fs.readFileSync(newCodePath, 'utf8');

    console.log(`📊 新しいコード: ${newCode.split('\n').length}行`);

    // 3. プロジェクトの内容を更新
    console.log('🔄 プロジェクトを更新中...');
    
    // 既存のマニフェストファイルを保持
    const manifestFile = currentProject.data.files?.find(f => f.name === 'appsscript');
    
    const newFiles = [
      // マニフェストファイル（既存のものを保持）
      {
        name: 'appsscript',
        type: 'JSON',
        source: manifestFile?.source || `{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v2"
      }
    ]
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}`,
      },
      // メインのコードファイル
      {
        name: 'Code',
        type: 'SERVER_JS',
        source: newCode,
      },
    ];

    const updateRequest = {
      scriptId: SCRIPT_ID,
      requestBody: {
        files: newFiles,
      },
    };

    const updateResult = await script.projects.updateContent(updateRequest);
    
    console.log('✅ プロジェクト更新成功！');
    console.log(`📝 更新されたファイル数: ${updateResult.data.files?.length || 0}`);

    // 4. 更新内容の確認
    console.log('\n📋 更新されたファイル:');
    updateResult.data.files?.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.type}) - ${file.source?.split('\n').length || 0}行`);
    });

    // 5. プロジェクトのバージョンを作成
    console.log('\n🏷️ 新しいバージョンを作成中...');
    
    try {
      const versionResult = await script.projects.versions.create({
        scriptId: SCRIPT_ID,
        requestBody: {
          description: `AI会計OCRシステム v2.1.0 (修正版) - ${new Date().toISOString()}`,
        },
      });
      
      console.log(`✅ バージョン作成成功: ${versionResult.data.versionNumber}`);
    } catch (versionError) {
      console.log('⚠️ バージョン作成をスキップ（権限不足の可能性）');
    }

    // 6. 成功メッセージ
    console.log('\n🎉 GASプロジェクトの更新が完了しました！');
    console.log('\n📍 次のステップ:');
    console.log('1. GASエディタでコードを確認');
    console.log('2. Drive API v2がサービスに追加されているか確認');
    console.log('3. 必要に応じて手動で再デプロイ');
    console.log('4. テスト関数を実行');
    console.log('\n🔗 GASプロジェクト: https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit');

    return {
      success: true,
      backupFile,
      linesUpdated: newCode.split('\n').length,
      previousLines: currentProject.data.files?.[0]?.source?.split('\n').length || 0,
    };

  } catch (error: any) {
    console.error('❌ 更新エラー:', error.message);
    
    if (error.code === 403) {
      console.log('\n🔑 認証エラーの解決方法:');
      console.log('1. Google Cloud Consoleでサービスアカウントの権限を確認');
      console.log('2. Google Apps Script APIが有効になっているか確認');
      console.log('3. プロジェクトの共有設定を確認');
    }
    
    throw error;
  }
}

// テスト関数実行の指示
async function showTestInstructions() {
  console.log('\n🧪 次にGASで実行すべきテスト関数:');
  console.log('\n1️⃣ checkApiSettings()');
  console.log('   期待結果: ✅ Drive API v2: 正常');
  
  console.log('\n2️⃣ testSupabaseConnection()');
  console.log('   期待結果: ✅ Supabase接続成功');
  
  console.log('\n3️⃣ checkRecentFiles()');
  console.log('   期待結果: 📄 X個のPDFファイルが見つかりました');
  
  console.log('\n4️⃣ manualOcrTest()');
  console.log('   期待結果: ✅ OCR処理成功');
  
  console.log('\n📋 実行手順:');
  console.log('1. GASエディタで関数を選択');
  console.log('2. 実行ボタン（▶️）をクリック');
  console.log('3. 実行ログを確認');
  console.log('4. 結果を報告');
}

// スクリプト実行
if (require.main === module) {
  updateGASProject()
    .then((result) => {
      console.log(`\n📊 更新結果:`);
      console.log(`   バックアップ: ${result.backupFile}`);
      console.log(`   更新前の行数: ${result.previousLines}行`);
      console.log(`   更新後の行数: ${result.linesUpdated}行`);
      
      return showTestInstructions();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('実行エラー:', error);
      process.exit(1);
    });
}

export { updateGASProject };