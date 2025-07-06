---
title: Google Apps Script MCP設定ガイド - Mastra & Claude Desktop
created: 2025-07-05 14:00
updated: 2025-07-05 14:00
tags: [Google Apps Script, MCP, Mastra, Claude Desktop, 自動化]
category: guide
author: Claude & tonychustudio
---

# Google Apps Script MCP設定ガイド - Mastra & Claude Desktop

## TL;DR

Google Apps Script MCPサーバーを設定することで、MastraとClaude Desktopの両方からGASプロジェクトを管理できるようになります。これにより、会計処理の自動化スクリプトを自然言語で作成・実行・管理できます。設定時間約45分。

## 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [ステップ1: リポジトリのセットアップ](#ステップ1-リポジトリのセットアップ)
- [ステップ2: Google Cloud設定](#ステップ2-google-cloud設定)
- [ステップ3: OAuth認証設定](#ステップ3-oauth認証設定)
- [ステップ4: Mastra統合](#ステップ4-mastra統合)
- [ステップ5: Claude Desktop設定](#ステップ5-claude-desktop設定)
- [ステップ6: 動作確認](#ステップ6-動作確認)
- [活用例](#活用例)
- [トラブルシューティング](#トラブルシューティング)

## 概要

Google Apps Script MCPサーバーは、以下の機能を提供します：

### 主な機能
- ✅ **プロジェクト管理**: GASプロジェクトの作成・取得・更新
- ✅ **バージョン管理**: スクリプトのバージョン作成・管理
- ✅ **デプロイ管理**: Webアプリ・APIとしてデプロイ
- ✅ **実行監視**: スクリプト実行状況の監視
- ✅ **メトリクス取得**: 実行統計・パフォーマンス分析

### AI会計システムでの活用
- 請求書処理の自動化スクリプト作成
- 月次レポート生成の自動化
- スプレッドシート連携処理の管理
- 定期実行スクリプトの監視

## 前提条件

### 必須要件
- Node.js 18以上（推奨: v20+）
- npm（Node.jsに含まれています）
- Googleアカウント
- Google Cloud Consoleへのアクセス

### 確認方法

```bash
# Node.jsバージョン確認
node --version

# npmバージョン確認
npm --version
```

## ステップ1: リポジトリのセットアップ

### 1.1 既存のクローンを確認

```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server
```

### 1.2 依存関係のインストール

```bash
npm install
```

### 1.3 環境変数ファイルの作成

```bash
# .envファイルを作成
touch .env
```

## ステップ2: Google Cloud設定

### 2.1 Google Cloud Projectの作成

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 新しいプロジェクトを作成または既存のものを選択
   - プロジェクト名: `AI-Accounting-GAS-MCP`
   - プロジェクトIDをメモ

### 2.2 必要なAPIの有効化

```bash
# CLIで有効化
gcloud config set project YOUR_PROJECT_ID

gcloud services enable script.googleapis.com
gcloud services enable drive.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

または、コンソールで手動有効化：
1. APIとサービス → ライブラリ
2. 以下を検索して有効化：
   - Google Apps Script API（必須）
   - Google Drive API（推奨）
   - Cloud Resource Manager API（推奨）

### 2.3 OAuth同意画面の設定

1. APIとサービス → OAuth同意画面
2. 「外部」を選択（組織外の場合）
3. 必須情報を入力：
   - アプリ名: `AI会計GAS MCP`
   - サポートメール: あなたのメールアドレス
   - 開発者連絡先: あなたのメールアドレス

4. スコープを追加：
   ```
   https://www.googleapis.com/auth/script.projects
   https://www.googleapis.com/auth/script.deployments
   https://www.googleapis.com/auth/script.metrics
   https://www.googleapis.com/auth/script.processes
   ```

5. テストユーザーを追加：
   - あなたのGmailアドレス

### 2.4 OAuth 2.0認証情報の作成

1. APIとサービス → 認証情報
2. 「認証情報を作成」→「OAuth 2.0 クライアント ID」
3. アプリケーションの種類: 「ウェブアプリケーション」
4. 設定：
   - 名前: `AI会計GAS MCPクライアント`
   - 承認済みのリダイレクトURI:
     ```
     http://localhost:3001/oauth/callback
     ```

5. 作成後、クライアントIDとクライアントシークレットをコピー

## ステップ3: OAuth認証設定

### 3.1 環境変数の設定

`.env`ファイルを編集：

```env
# Google Apps Script API OAuth Configuration
GOOGLE_APP_SCRIPT_API_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_APP_SCRIPT_API_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

# Optional: Logging level
LOG_LEVEL=info
```

### 3.2 OAuth認証の実行

```bash
npm run setup-oauth
```

以下の手順が自動的に実行されます：
1. ブラウザが開きGoogleログイン画面が表示
2. アカウントを選択して権限を許可
3. 「OAuth setup completed successfully!」が表示
4. リフレッシュトークンが安全に保存

## ステップ4: Mastra統合

### 4.1 Mastraプロジェクトへの統合

`/Users/tonychustudio/Documents/aam-orchestration/accounting-automation`ディレクトリで：

### 4.2 package.jsonの更新

```json
{
  "scripts": {
    "gas-mcp": "node ./gas-mcp-server/mcpServer.js",
    "gas-mcp-debug": "LOG_LEVEL=debug node ./gas-mcp-server/mcpServer.js"
  }
}
```

### 4.3 Mastra設定ファイルの作成

`mastra-gas-config.js`を作成：

```javascript
export const gasConfig = {
  server: {
    command: process.platform === 'win32' 
      ? 'C:\\Program Files\\nodejs\\node.exe'
      : '/usr/local/bin/node',
    args: ['./gas-mcp-server/mcpServer.js'],
    env: {
      GOOGLE_APP_SCRIPT_API_CLIENT_ID: process.env.GOOGLE_APP_SCRIPT_API_CLIENT_ID,
      GOOGLE_APP_SCRIPT_API_CLIENT_SECRET: process.env.GOOGLE_APP_SCRIPT_API_CLIENT_SECRET
    }
  }
};
```

### 4.4 Mastraワークフローへの組み込み

`workflows/gas-automation.js`を作成：

```javascript
import { Workflow } from '@mastra/core';
import { gasConfig } from '../mastra-gas-config.js';

export const gasAutomationWorkflow = new Workflow({
  name: 'gas-automation',
  description: 'Google Apps Script自動化ワークフロー',
  
  steps: [
    {
      id: 'create-script',
      type: 'mcp-tool',
      tool: 'script-projects-create',
      params: {
        title: '{{scriptTitle}}',
        parentId: '{{parentFolderId}}'
      }
    },
    {
      id: 'update-content',
      type: 'mcp-tool',
      tool: 'script-projects-update-content',
      params: {
        scriptId: '{{steps.create-script.output.scriptId}}',
        files: '{{scriptFiles}}'
      }
    },
    {
      id: 'create-version',
      type: 'mcp-tool',
      tool: 'script-projects-versions-create',
      params: {
        scriptId: '{{steps.create-script.output.scriptId}}',
        description: '初期バージョン'
      }
    },
    {
      id: 'deploy',
      type: 'mcp-tool',
      tool: 'script-projects-deployments-create',
      params: {
        scriptId: '{{steps.create-script.output.scriptId}}',
        versionNumber: '{{steps.create-version.output.versionNumber}}',
        manifestFileName: 'appsscript.json',
        description: 'Web APIデプロイ'
      }
    }
  ],
  
  config: {
    mcp: gasConfig
  }
});
```

## ステップ5: Claude Desktop設定

### 5.1 設定ファイルの場所

- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### 5.2 設定の追加

既存の設定に以下を追加：

```json
{
  "mcpServers": {
    "google-apps-script": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server/mcpServer.js"],
      "env": {
        "GOOGLE_APP_SCRIPT_API_CLIENT_ID": "YOUR_CLIENT_ID_HERE",
        "GOOGLE_APP_SCRIPT_API_CLIENT_SECRET": "YOUR_CLIENT_SECRET_HERE"
      }
    }
  }
}
```

### 5.3 設定値の置き換え

| 項目 | 実際の値 |
|------|----------|
| command | `which node`の結果 |
| args | mcpServer.jsの絶対パス |
| CLIENT_ID | Google CloudのクライアントID |
| CLIENT_SECRET | Google Cloudのクライアントシークレット |

### 5.4 Claude Desktop再起動

設定後、Claude Desktopを完全に終了して再起動します。

## ステップ6: 動作確認

### 6.1 サーバー単体テスト

```bash
cd gas-mcp-server
npm start
```

成功時の出力：
```
Google Apps Script MCP Server running on stdio
OAuth tokens loaded successfully
Server ready to handle MCP requests
```

### 6.2 OAuth接続テスト

```bash
npm run test-oauth
```

### 6.3 利用可能なツール確認

```bash
npm run list-tools
```

### 6.4 Claude Desktopでのテスト

Claude Desktopで以下を試してください：

```
「Google Apps Scriptで新しいプロジェクトを作成して、
現在時刻をログに出力する関数を作って」
```

## 活用例

### 1. 請求書処理スクリプトの作成

```
「Google Apps Scriptで請求書PDFを自動処理するスクリプトを作成して。
以下の機能を含めて：
1. Google Driveの特定フォルダを監視
2. 新しいPDFを検出したらOCR処理
3. 抽出データをスプレッドシートに記録
4. 処理済みファイルを別フォルダに移動」
```

### 2. 月次レポート自動生成

```
「毎月1日に実行される月次レポート生成スクリプトを作って。
Supabaseから先月のデータを取得して、
Google Slidesでプレゼンテーションを自動作成する機能を含めて」
```

### 3. スプレッドシート連携

```
「Google Sheetsの売上データを監視して、
新しい行が追加されたら自動的に仕訳を作成し、
Supabaseに保存するスクリプトを作成して」
```

### 4. 定期実行タスク

```
「毎日朝9時に実行されるスクリプトを作成して。
前日の取引データをチェックし、
異常値があればメールで通知する機能を実装して」
```

## トラブルシューティング

### エラー: "OAuth tokens not found"

**解決方法**:
```bash
npm run setup-oauth
```

### エラー: "Node not found"

**解決方法**:
絶対パスを使用：
```bash
which node  # Mac/Linux
where node  # Windows
```

### エラー: "Permission denied"

**解決方法**:
1. Google Cloud Consoleで権限を確認
2. テストユーザーに自分のアカウントを追加
3. 必要なスコープが有効か確認

### MCPサーバーが表示されない

**解決方法**:
1. 設定ファイルのJSON構文を確認
2. パスのエスケープを確認（Windowsは `\\`）
3. Claude Desktopのログを確認

## セキュリティベストプラクティス

1. **認証情報の管理**
   - `.env`ファイルをGitにコミットしない
   - 本番環境と開発環境で別のOAuthアプリを使用

2. **アクセス制限**
   - 必要最小限のスコープのみ使用
   - テストユーザーを限定

3. **監査とログ**
   - GASの実行ログを定期的に確認
   - 異常なアクセスパターンを監視

## 次のステップ

1. **基本的なスクリプト作成**から始める
2. **既存のGASプロジェクトと連携**
3. **定期実行タスクの設定**
4. **他のMCPサーバーとの連携**（Supabase、Google Drive）

これで、MastraとClaude Desktopの両方からGoogle Apps Scriptを完全に制御できるようになりました。