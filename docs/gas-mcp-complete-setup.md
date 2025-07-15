---
title: Google Apps Script MCP 完全設定ガイド - whichguy版
created: 2025-07-05 14:30
updated: 2025-07-05 14:30
tags: [Google Apps Script, MCP, Mastra, Claude Desktop, 高機能]
category: guide
author: Claude & tonychustudio
---

# Google Apps Script MCP 完全設定ガイド - whichguy版

## TL;DR

whichguy/gas_mcp は33のツールを提供する高機能なGoogle Apps Script MCPサーバーです。直接コード実行、プロジェクト管理、デプロイ管理、ローカル同期など、GASの全機能をAIから制御できます。設定時間約30分。

## 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [前提条件](#前提条件)
- [ステップ1: セットアップ](#ステップ1-セットアップ)
- [ステップ2: OAuth設定](#ステップ2-oauth設定)
- [ステップ3: Mastra統合](#ステップ3-mastra統合)
- [ステップ4: Claude Desktop設定](#ステップ4-claude-desktop設定)
- [ステップ5: 動作確認](#ステップ5-動作確認)
- [33のツール詳細](#33のツール詳細)
- [活用例](#活用例)
- [トラブルシューティング](#トラブルシューティング)

## 概要

whichguy/gas_mcp は、Google Apps Scriptの完全な制御を可能にする最も高機能なMCPサーバーです。

### 他のGAS MCPとの違い

| 機能 | whichguy版 | 他のGAS MCP |
|------|-----------|-------------|
| ツール数 | 33個 | 16個 |
| 直接コード実行 | ✅ `gas_run` | ❌ |
| ローカル同期 | ✅ 自動同期 | ❌ |
| スマートファイルシステム | ✅ | ❌ |
| プロキシサーバー | ✅ | ❌ |

## 主な機能

### 🚀 推奨ツール（通常ワークフロー）
- **スマートファイル操作**: 自動的にローカル/リモート同期
- **直接コード実行**: プロジェクトコンテキストで即座に実行
- **プロジェクト管理**: 作成から削除まで完全サポート

### 🔄 明示的ツール（マルチ環境）
- **ローカル同期**: pull/push/status コマンド
- **バージョン管理**: バージョン作成・取得
- **デプロイ管理**: Webアプリ・API実行可能ファイル

### ⚠️ 高度なツール（パワーユーザー向け）
- **Raw操作**: 直接的なファイル操作
- **プロセス管理**: 実行履歴の監視
- **メトリクス取得**: パフォーマンス分析

## 前提条件

```bash
# Node.js 18以上が必要
node --version

# npmの確認
npm --version
```

## ステップ1: セットアップ

### 1.1 依存関係のインストール

```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server
npm install
```

### 1.2 ビルド

```bash
npm run build
```

### 1.3 OAuth設定ファイルの準備

```bash
# oauth-config.jsonファイルを作成
touch oauth-config.json
```

## ステップ2: OAuth設定

### 2.1 Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクトを作成または選択
3. **Google Apps Script API**を有効化：
   ```bash
   gcloud services enable script.googleapis.com
   ```

### 2.2 OAuth認証情報の作成

1. APIとサービス → 認証情報
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: **デスクトップアプリケーション**
4. 名前: `GAS MCP Client`
5. JSONをダウンロード

### 2.3 oauth-config.jsonの設定

ダウンロードしたJSONの内容を`oauth-config.json`にコピー：

```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost:3000/oauth/callback"]
  }
}
```

### 2.4 認証の実行

```bash
# OAuth認証を開始
npm start
```

初回実行時：
1. ブラウザが自動的に開きます
2. Googleアカウントでログイン
3. 権限を許可
4. 認証完了メッセージが表示されます

## ステップ3: Mastra統合

### 3.1 Mastraプロジェクトの設定

`/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/mastra-gas-config.js`:

```javascript
import { execSync } from 'child_process';
import { platform } from 'os';

// Node.jsのパスを取得
const getNodePath = () => {
  try {
    const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
    return nodePath;
  } catch {
    return platform() === 'win32' 
      ? 'C:\\Program Files\\nodejs\\node.exe'
      : '/usr/local/bin/node';
  }
};

export const gasConfig = {
  server: {
    command: getNodePath(),
    args: ['./gas-mcp-server/dist/src/index.js'],
    env: {
      NODE_ENV: 'production'
    }
  },
  tools: {
    // 推奨ツール
    recommended: [
      'gas_auth',
      'gas_ls',
      'gas_cat',
      'gas_write',
      'gas_run',
      'gas_project_set'
    ],
    // 明示的ツール
    explicit: [
      'gas_pull',
      'gas_push',
      'gas_status',
      'gas_project_create',
      'gas_deploy_create'
    ]
  }
};
```

### 3.2 Mastraワークフローの作成

`/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/workflows/gas-accounting.js`:

```javascript
import { Workflow } from '@mastra/core';
import { gasConfig } from '../mastra-gas-config.js';

export const gasAccountingWorkflow = new Workflow({
  name: 'gas-accounting-automation',
  description: 'GASを使った会計処理自動化',
  
  steps: [
    {
      id: 'auth',
      type: 'mcp-tool',
      tool: 'gas_auth',
      params: { mode: 'status' }
    },
    {
      id: 'create-project',
      type: 'mcp-tool',
      tool: 'gas_project_create',
      params: { title: 'AI会計自動化スクリプト' }
    },
    {
      id: 'write-main',
      type: 'mcp-tool',
      tool: 'gas_write',
      params: {
        path: '{{steps.create-project.output.scriptId}}/main',
        content: `
function processInvoice(pdfUrl) {
  // PDFを処理
  const blob = UrlFetchApp.fetch(pdfUrl).getBlob();
  
  // OCR処理（仮想）
  const text = extractTextFromPDF(blob);
  
  // データ抽出
  const invoiceData = {
    vendor: extractVendor(text),
    amount: extractAmount(text),
    date: extractDate(text)
  };
  
  // スプレッドシートに記録
  recordToSheet(invoiceData);
  
  return invoiceData;
}

function recordToSheet(data) {
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID');
  const row = [
    new Date(),
    data.vendor,
    data.amount,
    data.date
  ];
  sheet.appendRow(row);
}
        `
      }
    },
    {
      id: 'create-version',
      type: 'mcp-tool',
      tool: 'gas_version_create',
      params: {
        scriptId: '{{steps.create-project.output.scriptId}}',
        description: '初期バージョン - 請求書処理機能'
      }
    },
    {
      id: 'deploy',
      type: 'mcp-tool',
      tool: 'gas_deploy_create',
      params: {
        scriptId: '{{steps.create-project.output.scriptId}}',
        entryPointType: 'WEB_APP',
        webAppAccess: 'ANYONE',
        versionNumber: '{{steps.create-version.output.versionNumber}}'
      }
    }
  ],
  
  config: {
    mcp: gasConfig
  }
});
```

## ステップ4: Claude Desktop設定

### 4.1 設定ファイルの編集

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gas-mcp": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server/dist/src/index.js"],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "mcp:error"
      }
    }
  }
}
```

### 4.2 Windowsの場合

```json
{
  "mcpServers": {
    "gas-mcp": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\Users\\tonychustudio\\Documents\\aam-orchestration\\accounting-automation\\gas-mcp-server\\dist\\src\\index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## ステップ5: 動作確認

### 5.1 サーバー起動確認

```bash
npm start
```

### 5.2 Claude Desktopで基本テスト

```
「Google Apps Scriptで新しいプロジェクトを作成して、
フィボナッチ数列を計算する関数を作成し、
10番目の値を計算して」
```

期待される動作：
1. 新規プロジェクト作成
2. コード記述
3. 直接実行で結果表示（55）

## 33のツール詳細

### 推奨ツール（通常使用）

```typescript
// 認証
gas_auth({ mode: "start" })

// ファイル一覧
gas_ls({ path: "scriptId/", detailed: true })

// スマート読み取り（ローカル優先）
gas_cat({ path: "scriptId/filename" })

// 自動同期書き込み
gas_write({ path: "scriptId/filename", content: "code" })

// 直接実行
gas_run({ js_statement: "Math.PI * 2" })

// プロジェクト設定
gas_project_set({ project: "My Project" })
```

### 高度な使用例

```typescript
// スプレッドシート連携
const sheets = await gas_find_drive_script({ 
  fileName: "売上管理表" 
});

// スクリプトをバインド
await gas_bind_script({
  containerName: "売上管理表",
  scriptName: "売上処理スクリプト"
});

// プロキシサーバー設定
await gas_proxy_setup({
  scriptId: "YOUR_SCRIPT_ID",
  deploy: true
});
```

## 活用例

### 1. 請求書自動処理システム

```javascript
// Claude Desktopで実行
「次の機能を持つGASプロジェクトを作成して：
1. Google Driveの請求書フォルダを監視
2. 新しいPDFを検出したらOCR処理
3. 金額・日付・取引先を抽出
4. Supabaseに仕訳データを送信
5. 処理済みフォルダに移動」
```

### 2. リアルタイム売上ダッシュボード

```javascript
「スプレッドシートの売上データをリアルタイムで監視し、
BigQueryにストリーミング挿入するGASを作成。
1時間ごとに集計してSlackに通知する機能も追加」
```

### 3. 月次レポート自動生成

```javascript
「毎月1日に実行されるGASスクリプトを作成：
1. Supabaseから先月のデータを取得
2. Google Slidesでプレゼンテーションを生成
3. PDFに変換してメール送信
4. Google Driveにアーカイブ」
```

## トラブルシューティング

### よくある問題

#### OAuth認証エラー

```bash
# 解決方法
rm -rf ~/.mcp-gas-auth  # 認証情報をクリア
npm start  # 再認証
```

#### gas_runでタイムアウト

```javascript
// 短いコードから試す
gas_run({ js_statement: "1 + 1" })
```

#### ファイルが見つからない

```javascript
// プロジェクトIDを確認
gas_ls({ path: "", detailed: true })

// 正しいパス形式
gas_cat({ path: "scriptId/filename" })  // 拡張子不要
```

### デバッグモード

```bash
# 詳細ログを有効化
export DEBUG=mcp:*
npm start
```

### 検証スクリプト

```bash
# セットアップ検証
./validate-setup.sh
```

## セキュリティベストプラクティス

1. **OAuth設定**
   - `oauth-config.json`をGitにコミットしない
   - `.gitignore`に追加

2. **スコープ制限**
   - 必要最小限のスコープのみ要求
   - 定期的な権限レビュー

3. **実行監視**
   - `gas_process_list`で実行履歴を確認
   - 異常なアクセスパターンを監視

## まとめ

whichguy/gas_mcp により、Google Apps Scriptの全機能をAIから制御できるようになりました。33のツールを活用して、会計処理の完全自動化を実現できます。