# Supabase セットアップガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ
4. 「New project」をクリック
5. 以下を入力：
   - Project name: `accounting-automation`
   - Database Password: 強力なパスワードを生成
   - Region: `Northeast Asia (Tokyo)`

## 2. 環境変数の取得

プロジェクト作成後、**Settings** → **API** から以下をコピー：

```bash
# Supabase URL (公開用)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Supabase Anon Key (公開用)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (サーバー側のみ)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. データベースの初期化

### SQL Editorで実行する順番：

1. **001_initial_schema.sql** - 基本テーブルの作成
2. **002_add_missing_columns.sql** - 追加カラム
3. **003_import_batches.sql** - インポート機能
4. **004_items_and_tags.sql** - 商品・タグ管理
5. **005_partners.sql** - 取引先管理
6. **006_documents.sql** - 文書管理

各SQLファイルは `/supabase/migrations/` フォルダにあります。

## 4. Vercel環境変数の設定

1. [Vercel Dashboard](https://vercel.com) にアクセス
2. プロジェクト `accounting-automation` を選択
3. **Settings** → **Environment Variables**
4. 以下の3つを追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseから取得したURL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseから取得したAnon Key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseから取得したService Role Key | Production, Preview, Development |

## 5. 再デプロイ

環境変数設定後、Vercelで再デプロイ：

```bash
vercel --prod
```

または、Vercelダッシュボードの「Redeploy」ボタンをクリック。

## トラブルシューティング

### よくあるエラー

1. **Invalid API key**
   - API Keyが正しくコピーされているか確認
   - 環境変数名が正確か確認

2. **Table not found**
   - SQLマイグレーションが実行されているか確認
   - 実行順序が正しいか確認

3. **CORS error**
   - SupabaseダッシュボードでCORS設定を確認
   - Authentication → URL Configuration でサイトURLを追加

## セキュリティ注意事項

- `SUPABASE_SERVICE_ROLE_KEY` は**絶対に**クライアント側で使用しない
- `.env.local` ファイルはGitにコミットしない
- 本番環境では必ずRow Level Security (RLS) を有効化する