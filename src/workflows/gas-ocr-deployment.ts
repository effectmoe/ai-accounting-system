/**
 * GAS OCR Deployment Workflow
 * complete-ocr-system.gsを自動デプロイするワークフロー
 */

import { Workflow, Step } from '@mastra/core';
import { gasOcrDeployAgent } from '../agents/gas-ocr-deploy-agent';

export const gasOcrDeploymentWorkflow = new Workflow({
  name: 'gas-ocr-deployment',
  triggerSchema: {
    type: 'object',
    properties: {
      scriptId: { type: 'string', default: '1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5' },
      forceUpdate: { type: 'boolean', default: true }
    }
  }
});

// Step 1: 現在のGASコードをバックアップ
gasOcrDeploymentWorkflow.step('backup-current-code', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      backup: { type: 'object' },
      timestamp: { type: 'string' }
    }
  }
}, async (context) => {
  return {
    instruction: `
GASプロジェクトの現在のコードをバックアップしてください。

プロジェクトURL: https://script.google.com/d/${context.payload.scriptId}/edit

手順:
1. 現在のコードを読み取り
2. タイムスタンプ付きでバックアップ作成
3. バックアップ完了を確認

バックアップが完了したら次のステップに進みます。
    `
  };
});

// Step 2: complete-ocr-system.gsを実装
gasOcrDeploymentWorkflow.step('deploy-ocr-system', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      codeImplemented: { type: 'boolean' },
      savedSuccessfully: { type: 'boolean' }
    }
  }
}, async (context) => {
  return {
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
  };
});

// Step 3: Drive API v2の確認と有効化
gasOcrDeploymentWorkflow.step('enable-drive-api', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      driveApiEnabled: { type: 'boolean' },
      apiVersion: { type: 'string' }
    }
  }
}, async (context) => {
  return {
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
  };
});

// Step 4: GASスクリプトの再デプロイ
gasOcrDeploymentWorkflow.step('redeploy-script', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      deploymentId: { type: 'string' },
      webAppUrl: { type: 'string' },
      version: { type: 'string' }
    }
  }
}, async (context) => {
  return {
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
  };
});

// Step 5: API設定テスト
gasOcrDeploymentWorkflow.step('test-api-settings', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      driveApiWorking: { type: 'boolean' },
      supabaseConfigured: { type: 'boolean' },
      foldersAccessible: { type: 'boolean' }
    }
  }
}, async (context) => {
  return {
    instruction: `
checkApiSettings()関数を実行してAPI設定をテストしてください。

テスト手順:
1. GASエディタで関数「checkApiSettings」を選択
2. 実行ボタン（▶️）をクリック
3. 実行ログを確認

期待される結果:
- ✅ Drive API v2: 正常
- 📁 監視フォルダID: 1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL
- 📁 アーカイブフォルダID: 1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ
- 🔗 Supabase URL: 設定済み
- 🔑 Supabase Key: 設定済み

エラーがある場合は詳細を報告してください。
    `
  };
});

// Step 6: Supabase接続テスト
gasOcrDeploymentWorkflow.step('test-supabase', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      connectionSuccessful: { type: 'boolean' },
      testDataId: { type: 'string' }
    }
  }
}, async (context) => {
  return {
    instruction: `
testSupabaseConnection()関数を実行してSupabase接続をテストしてください。

テスト手順:
1. GASエディタで関数「testSupabaseConnection」を選択
2. 実行ボタン（▶️）をクリック
3. 実行ログを確認

期待される結果:
- ✅ Supabase接続成功
- 保存されたID: [UUID]

接続が成功したらテストデータのIDを記録してください。
    `
  };
});

// Step 7: ファイル確認テスト
gasOcrDeploymentWorkflow.step('test-file-check', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      filesFound: { type: 'number' },
      latestFiles: { type: 'array' }
    }
  }
}, async (context) => {
  return {
    instruction: `
checkRecentFiles()関数を実行してファイル確認をテストしてください。

テスト手順:
1. GASエディタで関数「checkRecentFiles」を選択
2. 実行ボタン（▶️）をクリック
3. 実行ログを確認

期待される結果:
- 📄 X個のPDFファイルが見つかりました
- ファイル一覧が表示される

ファイルが見つからない場合は監視フォルダを確認してください。
    `
  };
});

// Step 8: OCR手動テスト
gasOcrDeploymentWorkflow.step('test-ocr-manual', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      ocrSuccessful: { type: 'boolean' },
      processedFiles: { type: 'number' },
      errors: { type: 'array' }
    }
  }
}, async (context) => {
  return {
    instruction: `
manualOcrTest()関数を実行してOCR処理をテストしてください。

テスト手順:
1. 監視フォルダにテスト用PDFをアップロード
2. GASエディタで関数「manualOcrTest」を選択
3. 実行ボタン（▶️）をクリック
4. 実行ログを確認

期待される結果:
- ✅ OCR処理成功
- ファイル名、ベンダー、金額などが抽出される
- Supabaseにデータが保存される
- ファイルがアーカイブされる

エラーが発生した場合は詳細を報告してください。
    `
  };
});

// Step 9: Web App動作確認
gasOcrDeploymentWorkflow.step('test-webapp', {
  agent: gasOcrDeployAgent,
  schema: {
    type: 'object',
    properties: {
      webappResponding: { type: 'boolean' },
      statusResponse: { type: 'object' }
    }
  }
}, async (context) => {
  return {
    instruction: `
デプロイされたWeb AppのURLにアクセスして動作確認してください。

確認手順:
1. Web AppのURLをブラウザで開く
2. JSON応答を確認

期待される応答:
{
  "status": "OK",
  "message": "AI会計OCR Web Appsが正常に動作しています",
  "version": "2.0.0",
  "lastCheck": "[ISO日時]"
}

正常に応答したらデプロイ完了です。
    `
  };
});