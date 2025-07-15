# GCP MCP設定状況

## 現状

1. **GCP MCPサーバー**: クローン済み（`gcp-mcp-server/`）
2. **設定ガイド**: 作成済み
3. **実際の設定**: **未完了**

## 必要な作業

### 1. サービスアカウントキーの作成

GCP MCPを使用してGoogle Cloud Consoleを操作するには：

1. Google Cloud Consoleでサービスアカウントを作成
2. 必要な権限を付与：
   - App Engine Admin
   - Service Usage Admin
   - Cloud Resource Manager API
3. キーファイル（JSON）をダウンロード

### 2. 環境変数の設定

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GCP_PROJECT_ID=your-project-id
```

## 問題点

GCP MCPサーバーは主に以下の機能を提供：
- Cloud Storage管理
- BigQuery操作
- Cloud Run管理
- Compute Engine管理

しかし、**Google Apps Script APIの有効化**や**OAuth認証情報の作成**は、通常のGCP APIとは異なり、コンソールUIでの手動操作が必要です。

## 解決策

1. **手動でOAuth設定を完了する**（推奨）
2. **GAS MCPの代わりに手動でプロジェクトを作成**