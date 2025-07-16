#!/bin/bash

# Emergency deployment script for the 3 fixes
# Run this if Mastra agent cannot execute Git commands

echo "🚀 Starting emergency deployment..."
echo "📁 Current directory: $(pwd)"

# Change to project directory
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation || {
    echo "❌ Failed to change directory"
    exit 1
}

# Check Git status
echo "📊 Git status:"
git status

# Add all changes
echo "➕ Adding all changes..."
git add .

# Create commit with detailed message
echo "💾 Creating commit..."
git commit -m "Fix: FAQ保存・履歴表示・Deploy Agent の3つの重要問題を修正

🔧 FAQ保存機能の修正:
- MongoDB URI環境変数設定とAPI実装
- デバッグログとエラーハンドリング強化
- FAQ保存・一覧取得機能の実装

🔧 履歴表示機能の修正:
- データベース名統一とAPIレスポンス形式統一
- セッションID検索ロジック改善
- クライアント側UI実装とデータアクセス修正

🔧 Vercel Deploy Agentの修正:
- Mastraランタイム基盤整備
- GitHubIntegration API実装
- Mastra 0.10.10対応とログ機能追加

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to main branch
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Deployment initiated!"
echo "🔗 Check Vercel dashboard for deployment status"
echo "📱 https://vercel.com/dashboard"