#!/bin/bash

echo "🚀 不足している環境変数をVercelに追加します..."

# NEXTAUTH_SECRET
echo "📝 NEXTAUTH_SECRET を設定中..."
echo "4er65C69/eTw0tq9xaO96tKNd3aSuzTDV5mklHJQMaQ=" | vercel env add NEXTAUTH_SECRET production
echo "4er65C69/eTw0tq9xaO96tKNd3aSuzTDV5mklHJQMaQ=" | vercel env add NEXTAUTH_SECRET preview
echo "4er65C69/eTw0tq9xaO96tKNd3aSuzTDV5mklHJQMaQ=" | vercel env add NEXTAUTH_SECRET development

# NEXTAUTH_URL
echo "📝 NEXTAUTH_URL を設定中..."
echo "https://accounting-automation.vercel.app" | vercel env add NEXTAUTH_URL production
echo "https://accounting-automation-preview.vercel.app" | vercel env add NEXTAUTH_URL preview
echo "http://localhost:3000" | vercel env add NEXTAUTH_URL development

# GOOGLE_CLIENT_SECRET (プレースホルダー - 実際の値に置き換える必要があります)
echo "📝 GOOGLE_CLIENT_SECRET を設定中..."
echo "⚠️  GOOGLE_CLIENT_SECRET は後で実際の値に更新してください"
echo "GOCSPX-your-google-client-secret" | vercel env add GOOGLE_CLIENT_SECRET production
echo "GOCSPX-your-google-client-secret" | vercel env add GOOGLE_CLIENT_SECRET preview
echo "GOCSPX-your-google-client-secret" | vercel env add GOOGLE_CLIENT_SECRET development

# その他のオプション環境変数（空の値で設定）
echo "📝 MIDSCENE_API_KEY を設定中..."
echo "" | vercel env add MIDSCENE_API_KEY production
echo "" | vercel env add MIDSCENE_API_KEY preview
echo "" | vercel env add MIDSCENE_API_KEY development

echo "📝 MIDSCENE_CHROME_EXTENSION_ID を設定中..."
echo "" | vercel env add MIDSCENE_CHROME_EXTENSION_ID production
echo "" | vercel env add MIDSCENE_CHROME_EXTENSION_ID preview
echo "" | vercel env add MIDSCENE_CHROME_EXTENSION_ID development

echo "📝 NLWEB_API_KEY を設定中..."
echo "" | vercel env add NLWEB_API_KEY production
echo "" | vercel env add NLWEB_API_KEY preview
echo "" | vercel env add NLWEB_API_KEY development

echo "📝 NLWEB_SITE_URL を設定中..."
echo "" | vercel env add NLWEB_SITE_URL production
echo "" | vercel env add NLWEB_SITE_URL preview
echo "" | vercel env add NLWEB_SITE_URL development

echo "✅ 環境変数の追加が完了しました！"
echo ""
echo "⚠️  重要: GOOGLE_CLIENT_SECRET を実際の値に更新してください："
echo "   1. Google Cloud Consoleにアクセス"
echo "   2. OAuth 2.0 クライアントIDのシークレットを取得"
echo "   3. Vercelダッシュボードで更新"
echo ""
echo "📌 次のステップ："
echo "   vercel --prod"