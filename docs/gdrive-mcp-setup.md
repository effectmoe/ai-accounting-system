---
title: Google Drive MCP サーバー設定ガイド - 会計自動化システム連携
created: 2025-07-05 12:00
updated: 2025-07-05 12:00
tags: [mcp, google-drive, setup, accounting, automation]
category: guide
author: Claude & tonychustudio
---

# Google Drive MCP サーバー設定ガイド - 会計自動化システム連携

## TL;DR

Google Drive MCP サーバーを会計自動化システムと連携させるための完全設定ガイドです。Google Cloud Project の作成から OAuth 設定、API の有効化、Claude Desktop との統合まで、ステップバイステップで解説します。このガイドに従えば、請求書や領収書などの会計書類を Google Drive から自動的に読み取り、処理できるようになります。

## 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [Google Cloud Project の設定](#google-cloud-project-の設定)
  - [プロジェクトの作成](#プロジェクトの作成)
  - [必要な API の有効化](#必要な-api-の有効化)
- [OAuth 認証の設定](#oauth-認証の設定)
  - [OAuth 同意画面の設定](#oauth-同意画面の設定)
  - [OAuth クライアント ID の作成](#oauth-クライアント-id-の作成)
- [ローカル環境の設定](#ローカル環境の設定)
  - [プロジェクトのセットアップ](#プロジェクトのセットアップ)
  - [認証情報の配置](#認証情報の配置)
  - [環境変数の設定](#環境変数の設定)
- [初回認証の実行](#初回認証の実行)
- [Claude Desktop との統合](#claude-desktop-との統合)
  - [設定ファイルの編集](#設定ファイルの編集)
  - [動作確認](#動作確認)
- [会計自動化での活用例](#会計自動化での活用例)
  - [請求書の自動読み取り](#請求書の自動読み取り)
  - [スプレッドシートへの記帳](#スプレッドシートへの記帳)
  - [月次レポートの生成](#月次レポートの生成)
- [トラブルシューティング](#トラブルシューティング)
- [セキュリティ上の注意事項](#セキュリティ上の注意事項)

## 概要

Google Drive MCP サーバーは、Model Context Protocol を使用して Google Drive と Google Sheets へのアクセスを提供するツールです。会計自動化システムと連携することで、以下の機能を実現できます：

- **ファイル検索**: Google Drive 内の請求書や領収書を自動検索
- **ファイル読み取り**: PDF や画像ファイルの内容を読み取り
- **スプレッドシート操作**: 会計データの読み書き
- **自動仕訳**: 読み取ったデータから自動的に仕訳を生成

## 前提条件

以下の環境が整っていることを確認してください：

- Node.js v18 以上がインストールされていること
- Google アカウント（Google Workspace アカウント推奨）
- Claude Desktop がインストールされていること
- 基本的なターミナル操作の知識

## Google Cloud Project の設定

### プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/projectcreate) にアクセス
2. 新しいプロジェクトを作成
   - プロジェクト名: `accounting-automation-mcp`（任意）
   - 組織: 該当する組織を選択（個人の場合は「組織なし」）
3. 「作成」をクリック

### 必要な API の有効化

プロジェクトが作成されたら、以下の API を有効化します：

1. **Google Drive API**
   - [API ライブラリ](https://console.cloud.google.com/apis/library) にアクセス
   - 「Google Drive API」を検索
   - 「有効にする」をクリック

2. **Google Sheets API**
   - 同様に「Google Sheets API」を検索し有効化

3. **Google Docs API**（オプション）
   - 会計書類が Google Docs 形式の場合は有効化

## OAuth 認証の設定

### OAuth 同意画面の設定

1. [OAuth 同意画面](https://console.cloud.google.com/apis/credentials/consent) にアクセス
2. 以下の設定を行う：
   - **ユーザータイプ**: 「内部」を選択（テスト用）
   - **アプリ名**: `会計自動化 MCP`
   - **サポートメール**: あなたのメールアドレス
   - **デベロッパーの連絡先情報**: あなたのメールアドレス

3. **スコープの追加**で以下を選択：
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`

### OAuth クライアント ID の作成

1. [認証情報](https://console.cloud.google.com/apis/credentials) ページにアクセス
2. 「認証情報を作成」→「OAuth クライアント ID」を選択
3. 以下の設定を行う：
   - **アプリケーションの種類**: デスクトップアプリ
   - **名前**: `MCP Server Client`
4. 「作成」をクリック
5. **JSON をダウンロード**（重要！）

## ローカル環境の設定

### プロジェクトのセットアップ

```bash
# プロジェクトディレクトリに移動
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/mcp-gdrive-server

# 依存関係のインストール
npm install

# ビルド
npm run build
```

### 認証情報の配置

1. 設定ディレクトリを作成：
```bash
mkdir -p ~/.config/mcp-gdrive
```

2. ダウンロードした OAuth キーファイルを配置：
```bash
# ダウンロードしたファイルをリネームして配置
mv ~/Downloads/client_secret_*.json ~/.config/mcp-gdrive/gcp-oauth.keys.json
```

### 環境変数の設定

プロジェクトルートに `.env` ファイルを作成：

```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/mcp-gdrive-server
```

```env
GDRIVE_CREDS_DIR=/Users/tonychustudio/.config/mcp-gdrive
CLIENT_ID=あなたのクライアントID
CLIENT_SECRET=あなたのクライアントシークレット
```

**重要**: クライアント ID とクライアントシークレットは、Google Cloud Console の認証情報ページで確認できます。

## 初回認証の実行

1. 認証プロセスを開始：
```bash
node ./dist/index.js
```

2. ブラウザが自動的に開きます
3. Google アカウントでログイン
4. アプリケーションに権限を付与
5. 「認証が成功しました」というメッセージが表示されれば完了

認証トークンは `~/.config/mcp-gdrive` ディレクトリに保存されます。

## Claude Desktop との統合

### 設定ファイルの編集

Claude Desktop の設定ファイルを編集します：

```bash
# 設定ファイルの場所を確認
ls ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

以下の内容を追加：

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "node",
      "args": [
        "/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/mcp-gdrive-server/dist/index.js"
      ],
      "env": {
        "CLIENT_ID": "あなたのクライアントID",
        "CLIENT_SECRET": "あなたのクライアントシークレット",
        "GDRIVE_CREDS_DIR": "/Users/tonychustudio/.config/mcp-gdrive"
      }
    }
  }
}
```

### 動作確認

1. Claude Desktop を再起動
2. 新しいチャットを開始
3. 以下のコマンドを試す：

```
Google Drive 内のファイルを検索してください
```

正常に動作していれば、ファイルリストが表示されます。

## 会計自動化での活用例

### 請求書の自動読み取り

```javascript
// 請求書フォルダから最新のファイルを検索
const invoices = await gdrive_search({
  query: "name contains '請求書' and mimeType = 'application/pdf'",
  pageSize: 10
});

// ファイルを読み取り
const content = await gdrive_read_file({
  fileId: invoices.files[0].id
});
```

### スプレッドシートへの記帳

```javascript
// 会計帳簿を読み取り
const ledger = await gsheets_read({
  spreadsheetId: "YOUR_SPREADSHEET_ID",
  ranges: ["仕訳帳!A1:G100"]
});

// 新しい仕訳を追加
await gsheets_update_cell({
  fileId: "YOUR_SPREADSHEET_ID",
  range: "仕訳帳!A101",
  value: "2025/01/05"
});
```

### 月次レポートの生成

1. Google Drive から該当月の全取引を検索
2. データを集計してスプレッドシートに記録
3. レポートテンプレートに基づいて PDF を生成

## トラブルシューティング

### よくある問題と解決方法

**認証エラーが発生する場合**
- OAuth スコープが正しく設定されているか確認
- クライアント ID とシークレットが正しいか確認
- `.env` ファイルのパスが正しいか確認

**ファイルが読み取れない場合**
- ファイルへのアクセス権限を確認
- API が有効化されているか確認
- ファイル ID が正しいか確認

**Claude Desktop で認識されない場合**
- 設定ファイルの JSON 形式が正しいか確認
- パスが絶対パスになっているか確認
- Claude Desktop を完全に再起動

## セキュリティ上の注意事項

1. **認証情報の管理**
   - OAuth キーファイルは安全な場所に保管
   - `.env` ファイルを Git にコミットしない
   - 定期的に認証情報をローテーション

2. **アクセス権限**
   - 必要最小限のスコープのみを使用
   - 読み取り専用権限を優先
   - 本番環境では別のサービスアカウントを使用

3. **データ保護**
   - 会計データは暗号化して保存
   - アクセスログを定期的に確認
   - 不要なファイルは定期的に削除

---

このガイドに従って設定を完了すれば、Google Drive と連携した会計自動化システムが構築できます。問題が発生した場合は、各セクションのトラブルシューティングを参照してください。