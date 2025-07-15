# Supabase クイックスタートガイド

## 📋 5分でSupabaseをセットアップ

### ステップ1: Supabaseでプロジェクト作成
1. https://app.supabase.com にアクセス
2. GitHubでサインイン（推奨）またはメールで登録
3. 「New project」をクリック
4. 以下を入力:
   - Project name: `mastra-accounting`
   - Database Password: 強力なパスワード（保存必須）
   - Region: `Northeast Asia (Tokyo)`

### ステップ2: APIキーをコピー
プロジェクト作成後（約2分）:

1. **Settings（歯車アイコン）** → **API** をクリック
2. 以下の3つをコピー:

```
📍 Project URL: 
   https://xxxxxxxxxxxxx.supabase.co

🔑 anon key (public): 
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

🔐 service_role key (secret): 
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ステップ3: .envファイルに設定

```bash
# プロジェクトディレクトリで
cd mastra-accounting-automation
cp .env.example .env
```

`.env`ファイルを編集:
```env
SUPABASE_URL=コピーしたProject URL
SUPABASE_ANON_KEY=コピーしたanon key
SUPABASE_SERVICE_KEY=コピーしたservice_role key
NEXT_PUBLIC_SUPABASE_URL=コピーしたProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=コピーしたanon key
```

### ステップ4: 接続確認

```bash
# 簡単な接続テスト
npm run test:supabase
```

または手動で:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
console.log('✅ Supabase接続成功！');
"
```

## 🚀 これで完了！

次のステップ:
1. `npm run dev` で開発サーバー起動
2. http://localhost:3000 にアクセス

## ❓ トラブルシューティング

### エラー: Invalid API key
→ キーの前後の空白を確認

### エラー: Failed to connect
→ Project URLが正しいか確認

### エラー: Network error
→ インターネット接続を確認

詳細は [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) を参照