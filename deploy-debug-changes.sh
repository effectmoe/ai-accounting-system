#!/bin/bash

# Debug changes deployment script
# デバッグログ追加の変更をデプロイ

echo "🚀 Debug changes deployment starting..."
echo "📂 Current directory: $(pwd)"

# Check git status
echo "📋 Checking git status..."
git status

# Add the modified file
echo "📁 Adding modified files..."
git add app/api/knowledge/analyze-chat-stream/route.ts

# Check what will be committed
echo "📄 Changes to be committed:"
git diff --cached --name-only

# Create commit
echo "💾 Creating commit..."
git commit -m "Debug: conversationデータ構造の詳細ログ追加

- searchTextがundefinedになる原因を特定するため
- conversationの型、配列状態、実際のデータを出力
- lastMessageの構造も詳細ログに追加

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to main branch!"
    echo "🌐 Vercel will automatically deploy the changes"
    echo "📊 You can monitor the deployment at: https://vercel.com/dashboard"
else
    echo "❌ Failed to push to main branch"
    exit 1
fi

echo "🎉 Deployment process completed!"