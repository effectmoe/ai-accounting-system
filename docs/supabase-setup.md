# Supabase セットアップガイド

## 1. Supabaseプロジェクトを作成

1. [app.supabase.com](https://app.supabase.com) にアクセス
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - Organization: 既存の組織を選択または新規作成
   - Project name: `ai-accounting-system`
   - Database Password: 強力なパスワードを設定（保存しておく）
   - Region: Japan (Tokyo)
4. 「Create new project」をクリック

## 2. データベーステーブルを作成

### 方法1: SQL Editorを使用（推奨）

1. 左メニューから「SQL Editor」を選択
2. 「New Query」をクリック
3. `/supabase/migrations/001_create_tables.sql` の内容をコピー＆ペースト
4. 「Run」をクリック

### 方法2: Table Editorを使用

1. 左メニューから「Table Editor」を選択
2. 「Create a new table」をクリック
3. 手動でテーブルを作成（SQLの方が簡単です）

## 3. Storageバケットを作成

1. 左メニューから「Storage」を選択
2. 「Create a new bucket」をクリック
3. Bucket name: `receipts`
4. Public bucket: ON（レシート画像を表示するため）
5. 「Create bucket」をクリック

## 4. 環境変数を取得

1. 左メニューから「Settings」→「API」を選択
2. 以下の値をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 5. 環境変数を設定

### ローカル開発（.env.local）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel（本番環境）

1. Vercelダッシュボード → Settings → Environment Variables
2. 以下を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 6. 認証設定（オプション）

現在はデモモードで動作しますが、本番環境では認証を実装してください：

1. Supabase Dashboard → Authentication → Providers
2. 必要な認証プロバイダーを有効化（Email, Google, etc.）

## 7. 動作確認

1. ローカルで開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで http://localhost:3000 を開く

3. レシートをアップロードして、以下を確認：
   - OCR処理が動作する
   - データがSupabaseに保存される
   - 一覧に表示される

## トラブルシューティング

### エラー: "relation 'transactions' does not exist"
→ SQLが実行されていません。SQL Editorで再度実行してください。

### エラー: "permission denied for table transactions"
→ RLSポリシーが正しく設定されていません。SQLを確認してください。

### エラー: "Invalid API key"
→ 環境変数が正しく設定されていません。.env.localを確認してください。