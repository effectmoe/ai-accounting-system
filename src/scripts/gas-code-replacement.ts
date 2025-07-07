#!/usr/bin/env npx tsx

/**
 * GAS Code Replacement Guide
 * GASプロジェクトのコード置き換え手順を表示
 */

import fs from 'fs';
import path from 'path';

async function showCodeReplacementGuide() {
  console.log('🔄 GASプロジェクトのコード置き換えガイド\n');
  
  // complete-ocr-system.gsの内容を読み取り
  const gasFilePath = '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-src/complete-ocr-system.gs';
  
  try {
    const gasCode = fs.readFileSync(gasFilePath, 'utf8');
    const lineCount = gasCode.split('\n').length;
    
    console.log('📊 ファイル情報:');
    console.log(`   - ファイル: ${gasFilePath}`);
    console.log(`   - 行数: ${lineCount}行`);
    console.log(`   - サイズ: ${Math.round(gasCode.length / 1024)}KB\n`);
    
    console.log('🔗 GASプロジェクトURL:');
    console.log('   https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit\n');
    
    console.log('📋 手順:');
    console.log('1. 上記URLでGASプロジェクトを開く');
    console.log('2. 現在のコード（820行）を全て選択して削除');
    console.log('3. 以下のコードをコピーして貼り付け');
    console.log('4. 保存（Cmd+S または Ctrl+S）');
    console.log('5. Drive API v2がサービスに追加されているか確認');
    console.log('6. 新しいバージョンで再デプロイ\n');
    
    console.log('=' .repeat(80));
    console.log('📄 置き換え用コード（全選択してコピー）:');
    console.log('=' .repeat(80));
    console.log(gasCode);
    console.log('=' .repeat(80));
    
    console.log('\n✅ コードのコピーが完了したら、GASプロジェクトで:');
    console.log('1. 既存コードを全削除');
    console.log('2. 上記コードを貼り付け');
    console.log('3. 保存');
    console.log('4. デプロイ');
    console.log('5. テスト関数実行\n');
    
    console.log('🧪 テスト関数実行順序:');
    console.log('   1. checkApiSettings()');
    console.log('   2. testSupabaseConnection()');
    console.log('   3. checkRecentFiles()');
    console.log('   4. manualOcrTest()\n');
    
    // ファイルを一時フォルダにも保存
    const tempDir = '/tmp';
    const tempFile = path.join(tempDir, 'complete-ocr-system.gs');
    fs.writeFileSync(tempFile, gasCode);
    console.log(`💾 コードを一時ファイルにも保存しました: ${tempFile}`);
    
  } catch (error) {
    console.error('❌ ファイル読み取りエラー:', error);
  }
}

// 現在のGASプロジェクトの状態確認
async function checkCurrentState() {
  console.log('\n📊 現在の状況:');
  console.log('   - GASプロジェクト: 820行（古いコード）');
  console.log('   - 新しいコード: 451行（complete-ocr-system.gs）');
  console.log('   - 必要な作業: コード置き換え');
  console.log('   - 期待される結果: 452行の新しいOCRシステム\n');
  
  console.log('🎯 目標:');
  console.log('   - 完全版OCRシステムの実装');
  console.log('   - 5つのテスト関数の追加');
  console.log('   - Drive API v2対応');
  console.log('   - Supabase自動保存機能');
  console.log('   - ファイル自動アーカイブ機能\n');
}

// スクリプト実行
if (require.main === module) {
  checkCurrentState()
    .then(() => showCodeReplacementGuide())
    .then(() => {
      console.log('🚀 準備完了！GASプロジェクトでコードを置き換えてください。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('実行エラー:', error);
      process.exit(1);
    });
}

export { showCodeReplacementGuide };