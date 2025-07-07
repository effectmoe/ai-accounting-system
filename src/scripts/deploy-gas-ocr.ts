#!/usr/bin/env npx tsx

/**
 * GAS OCR Deployment Script
 * Mastra経由でGASのOCRシステムを自動デプロイ
 */

import { Mastra } from '@mastra/core';
import { gasOcrDeploymentWorkflow } from '../workflows/gas-ocr-deployment';

async function deployGasOcr() {
  console.log('🚀 GAS OCRシステムのデプロイを開始します...');
  
  const mastra = new Mastra({
    name: 'gas-ocr-deployer',
    workflows: [gasOcrDeploymentWorkflow]
  });

  try {
    // ワークフローを実行
    const result = await mastra.getWorkflow('gas-ocr-deployment').execute({
      scriptId: '1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5',
      forceUpdate: true
    });

    console.log('✅ GAS OCRシステムのデプロイが完了しました');
    console.log('📊 実行結果:', result);

    // 結果をファイルに保存
    const fs = require('fs');
    const deploymentLog = {
      timestamp: new Date().toISOString(),
      status: 'completed',
      result: result,
      gasProjectUrl: 'https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit'
    };

    fs.writeFileSync(
      '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/logs/gas-deployment.json',
      JSON.stringify(deploymentLog, null, 2)
    );

    console.log('📝 デプロイログを保存しました: logs/gas-deployment.json');
    
  } catch (error) {
    console.error('❌ デプロイ中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// 手動実行確認
async function manualCheck() {
  console.log('\n📋 手動確認手順:');
  console.log('1. GASプロジェクトを開く:');
  console.log('   https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit');
  console.log('\n2. 以下の関数を順番に実行:');
  console.log('   - checkApiSettings()');
  console.log('   - checkRecentFiles()');
  console.log('   - testSupabaseConnection()');
  console.log('   - manualOcrTest()');
  console.log('\n3. Web画面で動作確認:');
  console.log('   - http://localhost:3000/documents');
  console.log('   - PDFをアップロードしてOCR処理をテスト');
}

// スクリプト実行
if (require.main === module) {
  deployGasOcr()
    .then(() => {
      manualCheck();
      process.exit(0);
    })
    .catch((error) => {
      console.error('実行エラー:', error);
      process.exit(1);
    });
}

export { deployGasOcr };