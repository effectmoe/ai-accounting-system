#!/usr/bin/env node

/**
 * Google Apps Script プロジェクト直接更新スクリプト
 * Apps Script API を使用してプロジェクトのコードを更新
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 設定
const PROJECT_ID = '1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5';
const API_KEY = 'AlzaSyANg1GMd8T4OZUtubBXNiLZbeNXFi7TqfI';

async function getCurrentProject() {
  return new Promise((resolve, reject) => {
    const url = `https://script.googleapis.com/v1/projects/${PROJECT_ID}/content?key=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function updateGasProject() {
  try {
    console.log('🚀 Google Apps Script プロジェクト更新開始');
    console.log('📋 プロジェクトID:', PROJECT_ID);
    
    // 新しいコードを読み込み
    const newCodePath = path.join(__dirname, 'gas-src', 'complete-ocr-system.gs');
    const newCode = fs.readFileSync(newCodePath, 'utf8');
    
    console.log(`📄 新しいコード: ${newCode.split('\n').length}行, ${newCode.length}文字`);
    
    // プロジェクトの現在の内容を取得
    console.log('📋 現在のプロジェクト内容を取得中...');
    
    try {
      const currentProject = await getCurrentProject();
      
      console.log(`📊 現在のファイル数: ${currentProject.files.length}`);
      console.log('📁 現在のファイル:');
      currentProject.files.forEach(file => {
        console.log(`  - ${file.name}: ${file.type} (${file.source ? file.source.length : 0}文字)`);
      });
      
      // 新しいファイル構造を作成
      const updatedFiles = currentProject.files.map(file => {
        if (file.name === 'Code' || file.name === 'コード') {
          return {
            name: 'Code',
            type: 'SERVER_JS',
            source: newCode
          };
        }
        return file;
      });
      
      console.log('💾 プロジェクト更新準備完了');
      console.log('📋 更新されるファイル:');
      updatedFiles.forEach(file => {
        console.log(`  - ${file.name}: ${file.type} (${file.source ? file.source.length : 0}文字)`);
      });
      
      // プロジェクトを更新するためのデータ
      const updateData = {
        files: updatedFiles
      };
      
      console.log('✅ プロジェクト更新データ準備完了');
      console.log('⚠️  注意: 実際の更新には認証が必要です');
      
      return {
        success: true,
        projectId: PROJECT_ID,
        currentFiles: currentProject.files.length,
        newCodeLines: newCode.split('\n').length,
        updateData: updateData
      };
      
    } catch (apiError) {
      console.error('❌ API エラー:', apiError);
      
      if (apiError.message && apiError.message.includes('403')) {
        console.log('🔐 認証が必要です。以下の方法で認証を行ってください:');
        console.log('1. clasp login を使用');
        console.log('2. Service Account を使用');
        console.log('3. OAuth2 認証を使用');
      }
      
      return {
        success: false,
        error: apiError.message || apiError.toString(),
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