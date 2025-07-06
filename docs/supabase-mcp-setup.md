---
title: Supabase MCP設定ガイド - Mastra会計システム統合
created: 2025-07-05 14:30
updated: 2025-07-05 14:30
tags: [Supabase, MCP, Claude Desktop, AI会計, データベース統合]
category: guide
author: Claude & tonychustudio
---

# Supabase MCP設定ガイド - Mastra会計システム統合

## TL;DR

Supabase MCPをClaude Desktopに統合することで、AI会計システムのデータベース操作を自然言語で実行できるようになります。仕訳入力、残高照会、レポート生成などの会計業務を会話形式で処理可能。設定時間約20分。

## 目次

- [概要](#概要)
- [Supabase MCPの特徴](#supabase-mcpの特徴)
- [前提条件](#前提条件)
- [ステップ1: Supabase MCP Serverのインストール](#ステップ1-supabase-mcp-serverのインストール)
- [ステップ2: 認証情報の準備](#ステップ2-認証情報の準備)
- [ステップ3: Claude Desktop設定](#ステップ3-claude-desktop設定)
- [ステップ4: 動作確認](#ステップ4-動作確認)
- [会計システム特有の設定](#会計システム特有の設定)
- [活用例](#活用例)
- [セキュリティ設定](#セキュリティ設定)
- [トラブルシューティング](#トラブルシューティング)
- [GAS MCP統合の検討](#gas-mcp統合の検討)

## 概要

Supabase MCPは、Claude DesktopからSupabaseデータベースを直接操作できるModel Context Protocolサーバーです。Mastra会計システムと統合することで、以下が可能になります：

- 🗃️ **データベース操作**: テーブルの読み書き、クエリ実行
- 📊 **リアルタイム分析**: 売上集計、経費分析をその場で実行
- 🔄 **自動仕訳生成**: 取引データから仕訳を自動作成
- 📝 **レポート作成**: 月次・年次レポートの即時生成
- 🔐 **Row Level Security**: 会社別のデータアクセス制御

## Supabase MCPの特徴

### 主要機能

1. **SQL実行**
   - 任意のSQLクエリの実行
   - トランザクション管理
   - バッチ処理対応

2. **テーブル操作**
   - CRUD操作（作成・読取・更新・削除）
   - 一括インポート/エクスポート
   - リレーション管理

3. **リアルタイム機能**
   - データ変更の監視
   - Webhookトリガー
   - イベント通知

4. **セキュリティ**
   - Row Level Security (RLS)
   - 認証・認可の統合
   - 監査ログ

## 前提条件

### 必須要件
- Claude Desktop（インストール済み）
- Supabaseプロジェクト（設定済み）
- Node.js 18以上
- npm または yarn

### Supabaseプロジェクト情報
以下の情報が必要です：
- Project URL
- Service Role Key（RLSをバイパスする権限）
- Database URL（直接接続用）

## ステップ1: Supabase MCP Serverのインストール

### 1.1 公式サーバーのインストール

```bash
# npmを使用する場合
npm install -g @modelcontextprotocol/server-supabase

# yarnを使用する場合
yarn global add @modelcontextprotocol/server-supabase
```

### 1.2 インストール確認

```bash
# バージョン確認
mcp-server-supabase --version

# ヘルプ表示
mcp-server-supabase --help
```

### 1.3 ローカルインストール（推奨）

プロジェクト固有の設定を管理する場合：

```bash
# プロジェクトディレクトリに移動
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation

# ローカルインストール
npm install @modelcontextprotocol/server-supabase

# package.jsonにスクリプト追加
npm pkg set scripts.mcp-supabase="mcp-server-supabase"
```

## ステップ2: 認証情報の準備

### 2.1 Supabaseダッシュボードから情報取得

1. [Supabaseダッシュボード](https://app.supabase.com)にログイン
2. 対象プロジェクトを選択
3. 「Settings」→「API」から以下をコピー：

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. 「Settings」→「Database」から：

```
Connection string: postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

### 2.2 環境変数ファイルの作成

```bash
# MCP設定ディレクトリ作成
mkdir -p ~/.config/mcp-supabase

# 環境変数ファイル作成
cat > ~/.config/mcp-supabase/.env << 'EOF'
# Supabase接続情報
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# オプション設定
SUPABASE_SCHEMA=public
SUPABASE_POOL_MIN=2
SUPABASE_POOL_MAX=10
EOF

# ファイル権限設定（重要）
chmod 600 ~/.config/mcp-supabase/.env
```

## ステップ3: Claude Desktop設定

### 3.1 設定ファイルの場所

- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### 3.2 Supabase MCP設定の追加

既存の設定に以下を追加：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": [
        "/usr/local/lib/node_modules/@modelcontextprotocol/server-supabase/dist/index.js"
      ],
      "env": {
        "SUPABASE_URL": "https://xxxxxxxxxxxxx.supabase.co",
        "SUPABASE_SERVICE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "SUPABASE_SCHEMA": "public"
      }
    }
  }
}
```

### 3.3 高度な設定（カスタムクエリ対応）

Mastra会計システム専用の設定：

```json
{
  "mcpServers": {
    "supabase-accounting": {
      "command": "node",
      "args": [
        "/usr/local/lib/node_modules/@modelcontextprotocol/server-supabase/dist/index.js",
        "--config", "/Users/tonychustudio/.config/mcp-supabase/mastra-config.json"
      ],
      "env": {
        "SUPABASE_URL": "https://xxxxxxxxxxxxx.supabase.co",
        "SUPABASE_SERVICE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "SUPABASE_SCHEMA": "public",
        "SUPABASE_ENABLE_RLS": "false",
        "SUPABASE_LOG_LEVEL": "info"
      }
    }
  }
}
```

## ステップ4: 動作確認

### 4.1 Claude Desktop再起動

1. Claude Desktopを完全に終了
2. 再度起動
3. MCPアイコンが表示されることを確認

### 4.2 接続テスト

Claude Desktopで以下のコマンドを試してください：

```
「Supabaseのテーブル一覧を表示して」
```

期待される応答：
- companies
- accounts
- transactions
- documents
- journal_entries
- など

### 4.3 データ取得テスト

```
「companiesテーブルから全ての会社情報を取得して」
```

## 会計システム特有の設定

### 5.1 カスタムクエリ設定

`~/.config/mcp-supabase/mastra-config.json`を作成：

```json
{
  "customQueries": {
    "月次売上集計": {
      "sql": "SELECT DATE_TRUNC('month', transaction_date) as month, SUM(amount) as total FROM transactions WHERE type = 'income' AND company_id = $1 GROUP BY month ORDER BY month DESC",
      "params": ["company_id"]
    },
    "勘定科目別残高": {
      "sql": "SELECT a.code, a.name, a.balance, a.account_type FROM accounts a WHERE a.company_id = $1 AND a.is_active = true ORDER BY a.code",
      "params": ["company_id"]
    },
    "未処理仕訳": {
      "sql": "SELECT * FROM journal_entries WHERE status = 'pending' AND company_id = $1 ORDER BY created_at DESC",
      "params": ["company_id"]
    }
  },
  "tableAliases": {
    "仕訳": "journal_entries",
    "取引": "transactions",
    "勘定科目": "accounts",
    "会社": "companies",
    "書類": "documents"
  }
}
```

### 5.2 Row Level Security設定

各テーブルにRLSポリシーを設定：

```sql
-- 会社別アクセス制御
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON transactions
  FOR ALL 
  USING (company_id = current_setting('app.current_company_id')::uuid);

-- 監査ログの自動記録
CREATE OR REPLACE FUNCTION log_data_changes() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    current_setting('app.current_user_id', true)::uuid,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 活用例

### 6.1 日次業務

```
ユーザー: 「今日の売上を集計して」

Claude: 本日（2025-07-05）の売上を集計します。

[Supabase クエリ実行]
SELECT 
  COUNT(*) as 取引数,
  SUM(amount) as 売上合計,
  SUM(tax_amount) as 消費税合計
FROM transactions 
WHERE type = 'income' 
  AND transaction_date = CURRENT_DATE
  AND company_id = 'xxx-xxx-xxx';

結果：
- 取引数: 15件
- 売上合計: ¥523,450
- 消費税合計: ¥47,586
- 税込合計: ¥571,036
```

### 6.2 仕訳入力

```
ユーザー: 「現金10万円の売上を記帳して」

Claude: 現金売上10万円の仕訳を作成します。

[仕訳作成]
借方: 現金 100,000円
貸方: 売上高 90,909円
貸方: 仮受消費税 9,091円

この仕訳をデータベースに登録しました。
仕訳番号: JE-2025-0705-001
```

### 6.3 月次レポート生成

```
ユーザー: 「先月の損益計算書を作成して」

Claude: 2025年6月の損益計算書を作成します。

[複数テーブルから集計]
売上高: ¥15,234,500
売上原価: ¥8,456,200
売上総利益: ¥6,778,300

販売費及び一般管理費: ¥3,245,600
営業利益: ¥3,532,700

経常利益: ¥3,498,200
```

## セキュリティ設定

### 7.1 アクセス制限

```json
{
  "security": {
    "allowedTables": [
      "companies",
      "accounts", 
      "transactions",
      "documents",
      "journal_entries"
    ],
    "deniedOperations": [
      "DROP",
      "TRUNCATE",
      "ALTER"
    ],
    "readOnlyMode": false,
    "requireCompanyContext": true
  }
}
```

### 7.2 監査ログ設定

```json
{
  "audit": {
    "enabled": true,
    "logAllQueries": true,
    "sensitiveDataMasking": true,
    "retentionDays": 90
  }
}
```

## トラブルシューティング

### エラー: "Connection refused"

**原因**: Supabase URLまたはキーが正しくない

**解決方法**:
1. Supabaseダッシュボードで接続情報を再確認
2. 環境変数が正しく設定されているか確認
3. ファイアウォール設定を確認

### エラー: "Permission denied"

**原因**: RLSポリシーまたは権限不足

**解決方法**:
1. Service Roleキーを使用しているか確認
2. RLSポリシーを一時的に無効化してテスト
3. データベースユーザーの権限を確認

### エラー: "MCP server not found"

**原因**: パスまたはインストールの問題

**解決方法**:
```bash
# グローバルインストールパスを確認
npm list -g @modelcontextprotocol/server-supabase

# 正しいパスを設定に反映
which mcp-server-supabase
```

## GAS MCP統合の検討

### 現在のGAS統合状況

現在、Google Apps Script (GAS) の直接的なMCPサーバーは確認されていません。ただし、以下の代替方法で統合可能です：

### 8.1 GAS Web Apps経由の統合

既存のGAS OCR APIのように、Web Appsとして公開してHTTP経由で連携：

```javascript
// GAS側の実装例
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  
  switch(data.action) {
    case 'importFromSheet':
      return importTransactionsFromSheet(data.sheetId);
    case 'exportToSheet':
      return exportToGoogleSheets(data.data);
    default:
      return ContentService.createTextOutput(
        JSON.stringify({error: 'Unknown action'})
      ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 8.2 Google Drive MCP経由の連携

既に設定済みのGoogle Drive MCPを使用して、スプレッドシートとの連携を実現：

```
ユーザー: 「経費精算シートから今月のデータをインポートして」

Claude: Google Driveから経費精算シートを取得し、Supabaseにインポートします。

[処理フロー]
1. Google Drive MCPでシート取得
2. データ形式を変換
3. Supabase MCPで一括インポート
```

### 8.3 将来的なGAS MCP実装案

GAS専用MCPサーバーの実装構想：

```json
{
  "mcpServers": {
    "gas": {
      "command": "node",
      "args": ["gas-mcp-server"],
      "env": {
        "GAS_SCRIPT_ID": "xxxxx",
        "GAS_API_KEY": "xxxxx",
        "GAS_OAUTH_TOKEN": "xxxxx"
      }
    }
  }
}
```

## まとめ

Supabase MCPの設定により、Mastra会計システムのデータベース操作が大幅に効率化されます。自然言語での問い合わせ、複雑な集計処理、自動仕訳生成など、AI支援による会計業務の革新が実現します。

### 次のステップ

1. **パフォーマンスチューニング**
   - インデックスの最適化
   - クエリキャッシュの設定
   - 接続プールの調整

2. **高度な統合**
   - Webhookによる自動処理
   - リアルタイム通知
   - 外部システム連携

3. **セキュリティ強化**
   - 詳細な監査ログ
   - データ暗号化
   - バックアップ自動化

詳細な技術情報は[Supabase MCP公式ドキュメント](https://github.com/modelcontextprotocol/servers/tree/main/supabase)を参照してください。