#!/usr/bin/env npx tsx

/**
 * Manual GAS OCR Deployment Script
 * 手動でGASのOCRシステムをデプロイするための簡単なスクリプト
 */

import { gasOcrDeployAgent } from '../agents/gas-ocr-deploy-agent';

async function deployGasOcrManually() {
  console.log('🚀 GAS OCRシステムの手動デプロイを開始します...');
  console.log('GASプロジェクトURL: https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit');
  
  const steps = [
    {
      name: 'backup-current-code',
      instruction: `
GASプロジェクトの現在のコードをバックアップしてください。

プロジェクトURL: https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit

手順:
1. 現在のコードを読み取り
2. タイムスタンプ付きでバックアップ作成
3. バックアップ完了を確認

バックアップが完了したら次のステップに進みます。
      `
    },
    {
      name: 'deploy-ocr-system',
      instruction: `
complete-ocr-system.gsの完全版OCRシステムを実装してください。

実装手順:
1. 既存のコードを全て削除
2. /gas-src/complete-ocr-system.gsの内容を正確にコピー
3. コードを貼り付け
4. 保存（Cmd+S）を実行

重要な設定値:
- SUPABASE_URL: 'https://clqpfmroqcnvyxdzadln.supabase.co'
- FOLDER_ID: '1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL'
- ARCHIVE_FOLDER_ID: '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ'

コード実装が完了したら確認してください。
      `
    },
    {
      name: 'enable-drive-api',
      instruction: `
Drive API v2が有効になっているか確認し、必要に応じて追加してください。

確認手順:
1. GASエディタの左側メニュー「サービス」を開く
2. Drive API (v2) が追加されているか確認
3. 追加されていない場合は「＋」ボタンをクリック
4. 「Drive API」を検索
5. バージョン「v2」を選択
6. 「追加」をクリック

Drive API v2が有効になったら次に進みます。
      `
    },
    {
      name: 'redeploy-script',
      instruction: `
GASスクリプトを新しいバージョンで再デプロイしてください。

デプロイ手順:
1. 「デプロイ」→「デプロイを管理」をクリック
2. 編集ボタン（鉛筆アイコン）をクリック
3. バージョン: 「新しいバージョン」を選択
4. 説明: 「完全版OCRシステム v2.0 - ${new Date().toISOString()}」
5. 「デプロイ」をクリック
6. 新しいWeb AppのURLを取得

デプロイが完了したらURLを確認してください。
      `
    },
    {
      name: 'test-functions',
      instruction: `
以下のテスト関数を順番に実行してください：

1. checkApiSettings() - API設定確認
   期待結果: ✅ Drive API v2: 正常

2. testSupabaseConnection() - DB接続確認
   期待結果: ✅ Supabase接続成功

3. checkRecentFiles() - ファイル確認
   期待結果: 📄 X個のPDFファイルが見つかりました

4. manualOcrTest() - OCR手動テスト
   期待結果: ✅ OCR処理成功

全てのテストが成功したらデプロイ完了です。
      `
    }
  ];

  console.log('\n📋 デプロイ手順:');
  steps.forEach((step, index) => {
    console.log(`\n${index + 1}. ${step.name}`);
    console.log(step.instruction);
  });

  console.log('\n🔗 重要なリンク:');
  console.log('- GASプロジェクト: https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit');
  console.log('- complete-ocr-system.gs: /gas-src/complete-ocr-system.gs');
  console.log('- Web画面: http://localhost:3000/documents');

  console.log('\n✅ 手動デプロイ手順を表示しました。');
  console.log('上記の手順に従ってGASプロジェクトを更新してください。');
}

// スクリプト実行
if (require.main === module) {
  deployGasOcrManually()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('実行エラー:', error);
      process.exit(1);
    });
}

export { deployGasOcrManually };