#!/bin/bash

# Azure Form Recognizer + MongoDB システムのVercelデプロイスクリプト

echo "🚀 Vercelへのデプロイを開始します..."
echo ""

# 環境変数の読み込み
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
fi

# 必須環境変数のチェック
if [ -z "$AZURE_FORM_RECOGNIZER_ENDPOINT" ] || [ -z "$AZURE_FORM_RECOGNIZER_KEY" ] || [ -z "$MONGODB_URI" ]; then
    echo "❌ 必須環境変数が設定されていません"
    echo "以下の変数を.env.localに設定してください:"
    echo "  - AZURE_FORM_RECOGNIZER_ENDPOINT"
    echo "  - AZURE_FORM_RECOGNIZER_KEY"
    echo "  - MONGODB_URI"
    exit 1
fi

echo "📋 環境変数を設定中..."

# 環境変数を設定（production, preview, development全て）
vercel env rm AZURE_FORM_RECOGNIZER_ENDPOINT --yes 2>/dev/null
echo "$AZURE_FORM_RECOGNIZER_ENDPOINT" | vercel env add AZURE_FORM_RECOGNIZER_ENDPOINT production preview development

vercel env rm AZURE_FORM_RECOGNIZER_KEY --yes 2>/dev/null
echo "$AZURE_FORM_RECOGNIZER_KEY" | vercel env add AZURE_FORM_RECOGNIZER_KEY production preview development

vercel env rm MONGODB_URI --yes 2>/dev/null
echo "$MONGODB_URI" | vercel env add MONGODB_URI production preview development

vercel env rm USE_AZURE_MONGODB --yes 2>/dev/null
echo "true" | vercel env add USE_AZURE_MONGODB production preview development

# 既存の環境変数も維持
if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    vercel env rm NEXT_PUBLIC_SUPABASE_URL --yes 2>/dev/null
    echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
fi

if [ ! -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY --yes 2>/dev/null
    echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development
fi

if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    vercel env rm SUPABASE_SERVICE_ROLE_KEY --yes 2>/dev/null
    echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production preview development
fi

echo "✅ 環境変数の設定が完了しました"
echo ""

echo "🚀 本番環境へデプロイ中..."
vercel --prod --yes

echo ""
echo "✨ デプロイが完了しました！"
echo ""
echo "📍 以下のURLで確認できます:"
echo "  - メインページ: https://accounting-automation.vercel.app"
echo "  - ヘルスチェック: https://accounting-automation.vercel.app/api/health"
echo "  - システム状態: https://accounting-automation.vercel.app/test-azure-mongodb"