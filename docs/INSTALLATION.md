# Mastra AI会計自動化システム - インストール手順書

## 目次

1. [前提条件](#前提条件)
2. [クイックスタート](#クイックスタート)
3. [詳細セットアップ](#詳細セットアップ)
4. [環境変数の設定](#環境変数の設定)
5. [データベースセットアップ](#データベースセットアップ)
6. [MCPサーバーのインストール](#mcpサーバーのインストール)
7. [Google Apps Scriptの設定](#google-apps-scriptの設定)
8. [動作確認](#動作確認)
9. [トラブルシューティング](#トラブルシューティング)

## 前提条件

### 必須要件

- Node.js 18.0以上
- npm または yarn
- Git
- PostgreSQL 14以上（Supabase経由）
- Google Cloud Platform アカウント
- DeepSeek API アカウント

### 推奨環境

- macOS または Linux（Windows は WSL2 推奨）
- VSCode（拡張機能: TypeScript、ESLint）
- Claude Desktop（MCPサーバー動作確認用）

## クイックスタート

```bash
# リポジトリのクローン
git clone https://github.com/your-username/accounting-automation.git
cd accounting-automation

# 依存関係のインストール
npm install

# 環境変数の設定
cp docs/.env.example .env
# .envファイルを編集して必要な値を設定

# データベースマイグレーション
npm run db:migrate

# 開発サーバーの起動
npm run dev
```

## 詳細セットアップ

### 1. プロジェクトのクローンと初期設定

```bash
# プロジェクトのクローン
git clone https://github.com/your-username/accounting-automation.git
cd accounting-automation

# 正しいNode.jsバージョンの確認
node --version  # v18.0.0以上であることを確認

# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build
```

### 2. 必要なパッケージのインストール

```bash
# Mastra関連
npm install @mastra/core @mastra/cli

# MCP関連
npm install @modelcontextprotocol/sdk

# データベース関連
npm install @supabase/supabase-js pg pgvector

# その他の依存関係
npm install zod dotenv
npm install -D typescript @types/node tsx
```

## 環境変数の設定

### 1. 環境変数ファイルの作成

```bash
cp docs/.env.example .env
```

### 2. 必須環境変数の設定

#### DeepSeek API
1. https://platform.deepseek.com/ にアクセス
2. APIキーを作成
3. `.env`に設定：
   ```
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```

#### Supabase
1. https://app.supabase.com/ でプロジェクト作成
2. Settings > API からキーを取得
3. `.env`に設定：
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

#### Google Cloud Platform
1. https://console.cloud.google.com/ でプロジェクト作成
2. APIとサービス > 認証情報 でAPIキーとOAuth 2.0クライアントIDを作成
3. 必要なAPI（Vision API、Drive API、Sheets API）を有効化
4. `.env`に設定：
   ```
   GOOGLE_CLOUD_API_KEY=AIzaSy...
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

## データベースセットアップ

### 1. Supabaseでのデータベース作成

```sql
-- Supabase SQLエディタで実行

-- pgvector拡張の有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 基本テーブルの作成
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  base_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT,
  debit JSONB NOT NULL,
  credit JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. NLWebデータベースの設定

```bash
# NLWebスキーマの適用
psql $SUPABASE_DB_URL < docs/nlweb-database-schema.sql
```

## MCPサーバーのインストール

### 1. 必須MCPサーバー

```bash
# Supabase MCP
npm install -g mcp-server-supabase

# Google Drive MCP
npx @modelcontextprotocol/create-server gdrive

# GitHub MCP（オプション）
npx @modelcontextprotocol/create-server github
```

### 2. カスタムMCPサーバー

```bash
# TypeScriptをJavaScriptにコンパイル
npx tsc docs/nlweb-mcp-server.ts --outDir docs
npx tsc docs/ocr-mcp-server.ts --outDir docs
```

### 3. Claude Desktop設定（開発用）

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nlweb": {
      "command": "node",
      "args": ["/path/to/accounting-automation/docs/nlweb-mcp-server.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "mcp-server-supabase",
        "--supabase-url", "your-supabase-url",
        "--supabase-api-key", "your-key"
      ]
    }
  }
}
```

## Google Apps Scriptの設定

### 1. GASプロジェクトの作成

1. https://script.google.com/ で新規プロジェクト作成
2. `complete-ocr-system-realtime.gs`の内容をコピー
3. プロジェクト設定でOAuth同意画面を設定

### 2. GASのデプロイ

```javascript
// デプロイ > 新しいデプロイ
// 種類: ウェブアプリ
// 実行ユーザー: 自分
// アクセスできるユーザー: 全員

// デプロイ後、URLをコピーして.envに設定
GAS_OCR_URL=https://script.google.com/macros/s/AKfyc.../exec
```

### 3. 必要な権限の承認

初回実行時に以下の権限を承認：
- Google Drive（ファイルアクセス）
- Google Sheets（スプレッドシート作成）
- 外部サービスへの接続（Supabase）

## 動作確認

### 1. 環境変数の確認

```bash
npm run check:env
```

### 2. MCPサーバーのヘルスチェック

```bash
npm run mcp:health
```

### 3. テスト実行

```bash
# ユニットテスト
npm test

# 統合テスト
npm run test:integration

# OCRテスト（サンプル画像使用）
npm run test:ocr
```

### 4. CLIでの動作確認

```bash
# OCR処理テスト
node docs/mastra-app.js process-receipt test-receipt.jpg receipt.jpg image

# エージェント実行テスト
node docs/mastra-app.js agent customer-agent '{"operation":"search","searchCriteria":{"status":"active"}}'

# ヘルスチェック
node docs/mastra-app.js health
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. MCPサーバーが起動しない

```bash
# ログを確認
DEBUG_MCP_SERVERS=true npm run dev

# 権限を確認
ls -la docs/*.js
chmod +x docs/*-mcp-server.js
```

#### 2. Supabase接続エラー

```bash
# 接続テスト
npx supabase db remote status

# サービスロールキーの確認
curl -H "apikey: YOUR_KEY" https://YOUR_PROJECT.supabase.co/rest/v1/
```

#### 3. Google認証エラー

1. OAuth同意画面が正しく設定されているか確認
2. リダイレクトURIが一致しているか確認
3. APIが有効化されているか確認

#### 4. TypeScriptビルドエラー

```bash
# TypeScript設定の確認
npx tsc --noEmit

# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

### ログの確認

```bash
# アプリケーションログ
tail -f logs/app.log

# MCPサーバーログ
tail -f logs/mcp-*.log

# エラーログのみ
grep ERROR logs/*.log
```

## 本番環境へのデプロイ

### Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel --prod

# 環境変数の設定
vercel env add DEEPSEEK_API_KEY production
vercel env add SUPABASE_URL production
# ... 他の環境変数も同様に設定
```

### PM2での運用

```bash
# PM2のインストール
npm install -g pm2

# アプリケーションの起動
pm2 start ecosystem.config.js

# ログの確認
pm2 logs

# 自動起動設定
pm2 startup
pm2 save
```

## セキュリティ上の注意

1. **環境変数の管理**
   - `.env`ファイルは絶対にGitにコミットしない
   - 本番環境では環境変数を安全に管理する

2. **APIキーのローテーション**
   - 定期的にAPIキーを更新
   - 不要なキーは削除

3. **アクセス制限**
   - Supabaseの行レベルセキュリティ（RLS）を有効化
   - APIエンドポイントに認証を実装

## サポート

問題が解決しない場合：

1. GitHubのIssuesで報告
2. ドキュメントの確認
3. コミュニティフォーラムで質問

---

最終更新日: 2025-07-06
バージョン: 1.0.0