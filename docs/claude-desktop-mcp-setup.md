---
title: Claude Desktop MCP設定ガイド - Google Drive & GCP統合
created: 2025-07-05 12:30
updated: 2025-07-05 12:30
tags: [Claude Desktop, MCP, Google Drive, GCP, 設定]
category: guide
author: Claude & tonychustudio
---

# Claude Desktop MCP設定ガイド - Google Drive & GCP統合

## TL;DR

Claude DesktopにGoogle Drive MCPとGCP MCPを設定することで、会計書類の自動処理、スプレッドシートへの記帳、クラウドリソース管理が可能になります。設定時間約30分で、AI会計システムの機能が大幅に拡張されます。

## 目次

- [概要](#概要)
- [必要な準備](#必要な準備)
- [Google Drive MCP設定](#google-drive-mcp設定)
- [GCP MCP設定](#gcp-mcp設定)
- [Claude Desktop設定ファイルの編集](#claude-desktop設定ファイルの編集)
- [動作確認](#動作確認)
- [活用例](#活用例)
- [トラブルシューティング](#トラブルシューティング)

## 概要

このガイドでは、Claude Desktopに以下の2つのMCPサーバーを設定します：

1. **Google Drive MCP**: ファイル管理、スプレッドシート操作
2. **GCP MCP**: Google Cloud Platform全般の管理

### 設定後にできること

- 📁 Google Drive内の会計書類を自動検索・読み取り
- 📊 Google Sheetsへの自動記帳・集計
- ☁️ Cloud Storageでのバックアップ管理
- 🔍 BigQueryでの高度な分析

## 必要な準備

### 共通要件
- Claude Desktop（インストール済み）
- Googleアカウント
- Google Cloud Projectへのアクセス権

### Google Drive MCP用
- Node.js 18以上
- npm または yarn

### GCP MCP用
- Python 3.10以上
- Google Cloud SDK（gcloud）

## Google Drive MCP設定

### ステップ1: Google Cloud設定

#### 1.1 プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 新しいプロジェクトを作成（または既存のものを使用）
3. プロジェクトIDをメモ

#### 1.2 APIの有効化

以下のAPIを有効化：

```bash
# CLIで有効化する場合
gcloud services enable drive.googleapis.com
gcloud services enable sheets.googleapis.com
gcloud services enable docs.googleapis.com
```

または、コンソールで：
1. 「APIとサービス」→「ライブラリ」
2. 各APIを検索して「有効にする」
   - Google Drive API
   - Google Sheets API
   - Google Docs API

#### 1.3 OAuth認証設定

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類：「デスクトップアプリ」
4. 名前：「Claude Desktop MCP」
5. JSONファイルをダウンロード

### ステップ2: ローカル設定

#### 2.1 設定ディレクトリ作成

```bash
# Macの場合
mkdir -p ~/.config/mcp-gdrive

# Windowsの場合
mkdir %USERPROFILE%\.config\mcp-gdrive
```

#### 2.2 認証ファイル配置

ダウンロードしたJSONファイルを以下の名前で保存：
```bash
~/.config/mcp-gdrive/gcp-oauth.keys.json
```

#### 2.3 環境変数の準備

JSONファイルから以下の値を確認：
- `client_id`
- `client_secret`

## GCP MCP設定

### ステップ1: サービスアカウント作成

#### 1.1 サービスアカウント作成

```bash
# CLIで作成
gcloud iam service-accounts create claude-desktop-mcp \
    --display-name="Claude Desktop MCP Service Account"
```

または、コンソールで：
1. 「IAMと管理」→「サービスアカウント」
2. 「サービスアカウントを作成」
3. 名前：`claude-desktop-mcp`

#### 1.2 必要な権限の付与

```bash
# 基本的な権限
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:claude-desktop-mcp@[PROJECT_ID].iam.gserviceaccount.com" \
    --role="roles/viewer"

# Storage権限（バックアップ用）
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:claude-desktop-mcp@[PROJECT_ID].iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

# BigQuery権限（分析用）
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:claude-desktop-mcp@[PROJECT_ID].iam.gserviceaccount.com" \
    --role="roles/bigquery.dataEditor"
```

#### 1.3 認証キーの作成

```bash
gcloud iam service-accounts keys create ~/claude-desktop-gcp-key.json \
    --iam-account=claude-desktop-mcp@[PROJECT_ID].iam.gserviceaccount.com
```

## Claude Desktop設定ファイルの編集

### 設定ファイルの場所

- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### 設定内容

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@isaacphi/mcp-gdrive"],
      "env": {
        "CLIENT_ID": "YOUR_CLIENT_ID_HERE",
        "CLIENT_SECRET": "YOUR_CLIENT_SECRET_HERE",
        "GDRIVE_CREDS_DIR": "/Users/YOUR_USERNAME/.config/mcp-gdrive"
      }
    },
    "gcp": {
      "command": "uv",
      "args": [
        "run",
        "--with", "google-cloud-storage>=2.10.0",
        "--with", "google-cloud-bigquery>=3.27.0",
        "--with", "google-cloud-monitoring>=2.0.0",
        "--with", "mcp[cli]",
        "--with", "python-dotenv>=1.0.0",
        "mcp",
        "run",
        "/path/to/gcp-mcp-server/main.py"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/Users/YOUR_USERNAME/claude-desktop-gcp-key.json",
        "GCP_PROJECT_ID": "YOUR_PROJECT_ID",
        "GCP_LOCATION": "asia-northeast1"
      }
    }
  }
}
```

### 設定値の置き換え

以下を実際の値に置き換えてください：

| プレースホルダー | 実際の値 | 取得元 |
|-----------------|---------|--------|
| YOUR_CLIENT_ID_HERE | OAuth Client ID | gcp-oauth.keys.json |
| YOUR_CLIENT_SECRET_HERE | OAuth Client Secret | gcp-oauth.keys.json |
| YOUR_USERNAME | あなたのユーザー名 | システム |
| YOUR_PROJECT_ID | GCPプロジェクトID | Google Cloud Console |
| /path/to/gcp-mcp-server | GCP MCPサーバーのパス | クローンした場所 |

## 動作確認

### ステップ1: Claude Desktop再起動

1. Claude Desktopを完全に終了
2. 再度起動

### ステップ2: Google Drive認証

初回起動時：
1. ターミナルで以下を実行：
   ```bash
   npx -y @isaacphi/mcp-gdrive
   ```
2. ブラウザが開くので、Googleアカウントでログイン
3. 権限を許可

### ステップ3: MCP接続確認

Claude Desktopで以下を試してください：

```
「Google Driveにある最新の請求書を検索して」
「GCPのストレージバケット一覧を表示して」
```

## 活用例

### 会計処理の自動化

```
「Google Driveの"会計書類"フォルダから今月の領収書を全て取得して、
金額と発行者をGoogle Sheetsの"経費管理表"に記録して」
```

### バックアップ管理

```
「重要な会計データをCloud Storageにバックアップして、
30日以上前のバックアップは自動削除するライフサイクルポリシーを設定して」
```

### 月次レポート生成

```
「BigQueryで先月の売上データを集計して、
前年同月比を計算し、Google Sheetsでグラフを作成して」
```

## トラブルシューティング

### エラー: "MCP server gdrive could not be started"

**原因**: 認証ファイルが見つからない

**解決方法**:
1. `gcp-oauth.keys.json`が正しい場所にあるか確認
2. パスが正しいか確認
3. ファイルの権限を確認（読み取り可能か）

### エラー: "Permission denied"

**原因**: APIが有効化されていない、または権限不足

**解決方法**:
1. 必要なAPIが全て有効化されているか確認
2. サービスアカウントに適切な権限があるか確認
3. OAuth同意画面の設定を確認

### 認証が何度も要求される

**原因**: トークンの保存に失敗

**解決方法**:
1. `~/.config/mcp-gdrive`ディレクトリの書き込み権限を確認
2. ディスク容量を確認
3. 既存のトークンファイルを削除して再認証

## セキュリティベストプラクティス

1. **最小権限の原則**
   - 必要最小限の権限のみ付与
   - 定期的な権限レビュー

2. **認証情報の管理**
   - 認証ファイルを安全な場所に保管
   - Gitリポジトリにコミットしない
   - 定期的なキーローテーション

3. **監査ログの活用**
   - Cloud Auditログで操作を追跡
   - 異常なアクセスパターンの監視

## 次のステップ

設定が完了したら、以下のドキュメントも参照してください：

- [GAS OCRセットアップガイド](./gas-ocr-setup-guide.md)
- [Google Drive MCP詳細設定](./gdrive-mcp-setup.md)
- [AI会計システム運用ガイド](./ai-accounting-operation.md)