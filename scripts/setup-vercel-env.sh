#!/bin/bash

# Vercel環境変数設定スクリプト
# 使用方法: ./scripts/setup-vercel-env.sh

echo "Vercel環境変数の設定を開始します..."

# Vercel CLIがインストールされているか確認
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLIがインストールされていません。"
    echo "npm install -g vercel でインストールしてください。"
    exit 1
fi

# .env.localファイルが存在するか確認
if [ ! -f ".env.local" ]; then
    echo ".env.localファイルが見つかりません。"
    exit 1
fi

echo "Vercelにログインしてください..."
vercel login

echo "プロジェクトをリンクしています..."
vercel link

# 環境変数を設定
echo "環境変数を設定しています..."

# MONGODB_URI
MONGODB_URI=$(grep "^MONGODB_URI=" .env.local | cut -d '=' -f2-)
if [ ! -z "$MONGODB_URI" ]; then
    echo "MONGODB_URIを設定中..."
    echo "$MONGODB_URI" | vercel env add MONGODB_URI production
fi

# DEEPSEEK_API_KEY
DEEPSEEK_API_KEY=$(grep "^DEEPSEEK_API_KEY=" .env.local | cut -d '=' -f2-)
if [ ! -z "$DEEPSEEK_API_KEY" ]; then
    echo "DEEPSEEK_API_KEYを設定中..."
    echo "$DEEPSEEK_API_KEY" | vercel env add DEEPSEEK_API_KEY production
fi

# Google関連の環境変数
GOOGLE_CLIENT_EMAIL=$(grep "^GOOGLE_CLIENT_EMAIL=" .env.local | cut -d '=' -f2-)
if [ ! -z "$GOOGLE_CLIENT_EMAIL" ]; then
    echo "GOOGLE_CLIENT_EMAILを設定中..."
    echo "$GOOGLE_CLIENT_EMAIL" | vercel env add GOOGLE_CLIENT_EMAIL production
fi

GOOGLE_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" .env.local | cut -d '=' -f2-)
if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
    echo "GOOGLE_CLIENT_IDを設定中..."
    echo "$GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID production
fi

GOOGLE_CLOUD_PROJECT_ID=$(grep "^GOOGLE_CLOUD_PROJECT_ID=" .env.local | cut -d '=' -f2-)
if [ ! -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    echo "GOOGLE_CLOUD_PROJECT_IDを設定中..."
    echo "$GOOGLE_CLOUD_PROJECT_ID" | vercel env add GOOGLE_CLOUD_PROJECT_ID production
fi

# Google Private Key（複数行対応）
echo "GOOGLE_PRIVATE_KEYを設定中..."
awk '/^GOOGLE_PRIVATE_KEY=/{p=1} p{print} /-----END PRIVATE KEY-----/{p=0}' .env.local | sed 's/^GOOGLE_PRIVATE_KEY=//' | vercel env add GOOGLE_PRIVATE_KEY production

GOOGLE_PRIVATE_KEY_ID=$(grep "^GOOGLE_PRIVATE_KEY_ID=" .env.local | cut -d '=' -f2-)
if [ ! -z "$GOOGLE_PRIVATE_KEY_ID" ]; then
    echo "GOOGLE_PRIVATE_KEY_IDを設定中..."
    echo "$GOOGLE_PRIVATE_KEY_ID" | vercel env add GOOGLE_PRIVATE_KEY_ID production
fi

# Supabase関連の環境変数
NEXT_PUBLIC_SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2-)
if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "NEXT_PUBLIC_SUPABASE_URLを設定中..."
    echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
fi

NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2-)
if [ ! -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEYを設定中..."
    echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
fi

SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d '=' -f2-)
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "SUPABASE_SERVICE_ROLE_KEYを設定中..."
    echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
fi

# OCR関連の環境変数
ENABLE_OCR=$(grep "^ENABLE_OCR=" .env.local | cut -d '=' -f2-)
if [ ! -z "$ENABLE_OCR" ]; then
    echo "ENABLE_OCRを設定中..."
    echo "$ENABLE_OCR" | vercel env add ENABLE_OCR production
fi

GAS_OCR_URL=$(grep "^GAS_OCR_URL=" .env.local | cut -d '=' -f2-)
if [ ! -z "$GAS_OCR_URL" ]; then
    echo "GAS_OCR_URLを設定中..."
    echo "$GAS_OCR_URL" | vercel env add GAS_OCR_URL production
fi

GAS_WEBHOOK_URL=$(grep "^GAS_WEBHOOK_URL=" .env.local | cut -d '=' -f2- | tr -d '\n')
if [ ! -z "$GAS_WEBHOOK_URL" ]; then
    echo "GAS_WEBHOOK_URLを設定中..."
    echo "$GAS_WEBHOOK_URL" | vercel env add GAS_WEBHOOK_URL production
fi

echo "環境変数の設定が完了しました。"
echo "設定された環境変数を確認するには、以下のコマンドを実行してください："
echo "vercel env ls"