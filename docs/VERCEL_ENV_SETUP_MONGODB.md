# Vercel環境変数設定ガイド - MongoDB & DeepSeek

## 概要
このドキュメントでは、accounting-automationプロジェクトのVercel環境変数の設定方法について説明します。

## 必要な環境変数

### 1. データベース関連
- `MONGODB_URI`: MongoDB接続文字列
  ```
  mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster
  ```

### 2. AI関連
- `DEEPSEEK_API_KEY`: DeepSeek APIキー
  ```
  sk-97f6efd342ba4f7cb1d98e4ac26ac720
  ```

### 3. Google Cloud関連
- `GOOGLE_CLIENT_EMAIL`: サービスアカウントのメールアドレス
- `GOOGLE_CLIENT_ID`: クライアントID
- `GOOGLE_CLOUD_PROJECT_ID`: プロジェクトID
- `GOOGLE_PRIVATE_KEY`: 秘密鍵（複数行）
- `GOOGLE_PRIVATE_KEY_ID`: 秘密鍵ID

### 4. Supabase関連
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 公開用APIキー
- `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー

### 5. OCR関連
- `ENABLE_OCR`: OCR機能の有効/無効（"true"/"false"）
- `GAS_OCR_URL`: Google Apps Script OCRエンドポイント
- `GAS_WEBHOOK_URL`: Google Apps Script Webhookエンドポイント

## 設定方法

### 方法1: スクリプトを使用した自動設定（推奨）

1. Vercel CLIをインストール
   ```bash
   npm install -g vercel
   ```

2. プロジェクトルートで設定スクリプトを実行
   ```bash
   ./scripts/setup-vercel-env.sh
   ```

3. プロンプトに従ってVercelにログインし、プロジェクトをリンク

### 方法2: Vercel Webコンソールから手動設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 対象プロジェクトを選択
3. Settings → Environment Variables に移動
4. 各環境変数を追加：
   - Key: 環境変数名
   - Value: 環境変数の値
   - Environment: Production を選択
   - 「Save」をクリック

### 方法3: Vercel CLIを使用した手動設定

```bash
# Vercelにログイン
vercel login

# プロジェクトをリンク
vercel link

# 環境変数を追加（例: MONGODB_URI）
echo "mongodb+srv://..." | vercel env add MONGODB_URI production

# 複数行の環境変数（GOOGLE_PRIVATE_KEY）の場合
cat <<EOF | vercel env add GOOGLE_PRIVATE_KEY production
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCihYCAXAgLR5HQ
...
-----END PRIVATE KEY-----
EOF
```

## vercel.jsonの設定

`vercel.json`ファイルには、環境変数の参照が設定されています：

```json
{
  "env": {
    "MONGODB_URI": "@mongodb_uri",
    "DEEPSEEK_API_KEY": "@deepseek_api_key",
    // ... 他の環境変数
  }
}
```

`@`記号は、Vercelの環境変数システムから値を取得することを示します。

## 確認方法

### 1. CLI で確認
```bash
vercel env ls
```

### 2. Webコンソールで確認
1. Vercel Dashboardにアクセス
2. プロジェクト → Settings → Environment Variables

### 3. デプロイ後の動作確認
デプロイ後、Function Logsで環境変数が正しく読み込まれているか確認：
- Vercel Dashboard → Functions → Logs

## トラブルシューティング

### 環境変数が反映されない場合
1. キャッシュをクリア
   ```bash
   vercel --force
   ```

2. 再デプロイ
   ```bash
   vercel --prod
   ```

### MongoDB接続エラーの場合
1. MongoDB Atlasのネットワークアクセスで、Vercelの関数からのアクセスを許可
2. IP Whitelist に `0.0.0.0/0` を追加（本番環境では適切に制限）

### 秘密鍵の改行が正しく処理されない場合
- 環境変数に設定する際、改行文字（\n）が正しくエスケープされているか確認
- Vercel Webコンソールで設定する場合は、実際の改行を含めて貼り付け

## セキュリティに関する注意事項

1. **環境変数の値を公開リポジトリにコミットしない**
   - `.env.local`ファイルは`.gitignore`に含まれていることを確認

2. **APIキーの定期的な更新**
   - 特にDEEPSEEK_API_KEYなどの外部サービスのキーは定期的に更新

3. **最小権限の原則**
   - MongoDB接続ユーザーは必要最小限の権限のみ付与
   - Supabaseのサービスロールキーは本番環境でのみ使用

## 更新日: 2025-07-16

### 更新内容
- vercel.jsonに環境変数参照を追加
- 自動設定スクリプト（setup-vercel-env.sh）を作成
- 環境変数の設定方法を3つの方法で詳細化

## 関連ドキュメント
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)