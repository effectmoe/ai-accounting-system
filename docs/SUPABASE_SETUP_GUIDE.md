# Supabase セットアップガイド

## 1. Supabaseアカウントの作成

### 1.1 アカウント登録
1. https://app.supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントまたはメールアドレスで登録

## 2. 新規プロジェクトの作成

### 2.1 プロジェクト作成手順
1. ダッシュボードで「New project」をクリック
2. 以下の情報を入力：
   - **Project name**: `mastra-accounting` (任意の名前)
   - **Database Password**: 強力なパスワードを設定（後で使用するので保存しておく）
   - **Region**: `Northeast Asia (Tokyo)` (日本からのアクセスが多い場合)
   - **Pricing Plan**: `Free` (開発用) または `Pro` (本番用)

3. 「Create new project」をクリック
4. プロジェクトの作成完了まで約2分待つ

## 3. APIキーの取得

### 3.1 プロジェクトURLとキーの確認方法

1. **プロジェクトダッシュボード**から「Settings」アイコン（歯車）をクリック
2. 左側メニューから「API」を選択
3. 以下の情報をコピー：

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon (public) key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role (secret) key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.2 各キーの説明

- **Project URL**: APIエンドポイントのベースURL
- **anon (public) key**: クライアントサイドで使用する公開キー（RLSで保護）
- **service_role key**: サーバーサイドで使用する秘密キー（RLSをバイパス）

⚠️ **重要**: service_role keyは絶対に公開しないでください。サーバーサイドのみで使用します。

## 4. .envファイルへの設定

### 4.1 .envファイルの更新

```bash
# .envファイルを開く
nano .env  # またはお好みのエディタで
```

以下の値を更新：
```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（anon keyをペースト）
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（service_role keyをペースト）

# Next.js用（クライアントサイド）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（anon keyをペースト）
```

## 5. データベースの設定

### 5.1 SQL Editorでのマイグレーション実行

1. Supabaseダッシュボードで「SQL Editor」をクリック
2. 「New query」をクリック
3. 以下のSQLを実行してpg_bigm拡張を有効化：

```sql
-- 日本語全文検索用の拡張
CREATE EXTENSION IF NOT EXISTS pg_bigm;
```

### 5.2 ローカルマイグレーションの適用

プロジェクトディレクトリで以下を実行：

```bash
# Supabase CLIでリモートプロジェクトにリンク
supabase link --project-ref xxxxxxxxxxxxx  # Project URLのxxxxxxxxxxxxx部分

# パスワードを入力（プロジェクト作成時に設定したデータベースパスワード）

# マイグレーションを適用
supabase db push
```

## 6. 認証の設定（オプション）

### 6.1 認証プロバイダーの有効化

1. Supabaseダッシュボードで「Authentication」→「Providers」
2. 必要なプロバイダーを有効化：
   - Email（デフォルトで有効）
   - Google
   - GitHub
   など

### 6.2 認証URLの設定

「Authentication」→「URL Configuration」で以下を設定：

- **Site URL**: `http://localhost:3000` (開発用)
- **Redirect URLs**: 
  ```
  http://localhost:3000/**
  https://your-production-domain.com/**
  ```

## 7. Row Level Security (RLS) の確認

### 7.1 RLSの有効化確認

1. 「Table Editor」でテーブルを選択
2. 各テーブルでRLSが有効になっていることを確認
3. 必要に応じてポリシーを調整

## 8. 接続テスト

### 8.1 Node.jsでの接続テスト

```bash
# プロジェクトディレクトリで実行
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('Supabase client created successfully!');
console.log('Project URL:', process.env.SUPABASE_URL);
"
```

### 8.2 curlでのAPIテスト

```bash
# プロジェクトのヘルスチェック
curl -X GET "YOUR_SUPABASE_URL/rest/v1/" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 9. トラブルシューティング

### 9.1 よくある問題

**問題**: 「Invalid API key」エラー
- **解決**: キーが正しくコピーされているか確認（前後の空白に注意）

**問題**: CORS エラー
- **解決**: Supabaseダッシュボードで許可するドメインを追加

**問題**: RLS ポリシーエラー
- **解決**: service_role keyを使用するか、適切なRLSポリシーを設定

### 9.2 デバッグ方法

1. Supabaseダッシュボードの「Logs」→「API logs」でリクエストを確認
2. ブラウザの開発者ツールでネットワークタブを確認
3. `supabase status`でローカル環境の状態を確認

## 10. 本番環境への移行

### 10.1 本番用チェックリスト

- [ ] 強力なデータベースパスワードの設定
- [ ] RLSポリシーの適切な設定
- [ ] バックアップの設定
- [ ] カスタムドメインの設定（Pro plan以上）
- [ ] 環境変数の本番用設定

### 10.2 料金プラン

- **Free**: 開発・テスト用
  - 500MB データベース
  - 1GB ストレージ
  - 50,000 月間アクティブユーザー

- **Pro** ($25/月): 本番用
  - 8GB データベース
  - 100GB ストレージ
  - 100,000 月間アクティブユーザー

## 関連リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Status](https://status.supabase.com)
- [Supabase GitHub](https://github.com/supabase/supabase)