# Vercel環境変数設定ガイド

## 必要な環境変数

以下の環境変数をVercelのプロジェクト設定で追加してください：

### Azure Form Recognizer
```
AZURE_FORM_RECOGNIZER_ENDPOINT=https://tonychu.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=4DjR99SFSIUGceYFNzdRnYUyvphNS5OuvijyDhOgSQyvgkVsOXohJQQJ99BGACxCCsyXJ3w3AAALACOGyPdP
```

### MongoDB Atlas
```
MONGODB_URI=mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster
```

### システム切り替え
```
USE_AZURE_MONGODB=true
NEXT_PUBLIC_USE_AZURE_MONGODB=true
```

### その他の環境変数（既存システム用）
```
NEXT_PUBLIC_SUPABASE_URL=https://clqpfmroqcnvyxdzadln.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ
```

## 設定手順

1. Vercelダッシュボードにログイン
2. プロジェクト（accounting-automation）を選択
3. Settings > Environment Variables に移動
4. 上記の環境変数を追加（Production, Preview, Development すべてにチェック）
5. 「Save」をクリック
6. デプロイメントを再実行するか、新しいコミットをプッシュ

## 確認方法

環境変数が正しく設定されているか確認：
```bash
curl https://accounting-automation.vercel.app/api/ocr/analyze
```

レスポンスに `configuration` フィールドが含まれ、すべて "Configured" になっていることを確認。