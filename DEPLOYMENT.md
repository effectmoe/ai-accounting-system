# Vercelデプロイ手順

## 1. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定してください：

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト `accounting-automation` を選択
3. Settings → Environment Variables に移動
4. 以下の環境変数を追加：

### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseの公開アノンキー | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのサービスロールキー | `eyJhbGci...` |

### オプション（OCR機能を使用する場合）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Cloud サービスアカウントキーのJSON | `{"type": "service_account"...}` |
| `GOOGLE_CLOUD_PROJECT_ID` | Google CloudプロジェクトID | `my-project-123456` |
| `ENABLE_OCR` | OCR機能を有効化 | `true` |

## 2. Supabaseの設定

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editorで `/supabase/migrations/` 内のSQLファイルを順番に実行
3. Settings → API からURLとキーを取得

## 3. デプロイ

環境変数設定後、以下のコマンドでデプロイ：

```bash
vercel --prod
```

## 4. 動作確認

デプロイ完了後、以下を確認：

1. トップページでAIチャット機能
2. PDFファイルのアップロード（モックデータ表示）
3. 文書生成とPDFダウンロード

## トラブルシューティング

### ビルドエラーの場合
- 環境変数が正しく設定されているか確認
- `npm run build` がローカルで成功するか確認

### データベース接続エラー
- Supabaseの設定が正しいか確認
- Row Level Security (RLS) が適切に設定されているか確認