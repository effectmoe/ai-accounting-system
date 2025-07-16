#!/bin/bash

# FAQ and History fixes deployment script
echo "🚀 Deploying FAQ and History fixes..."

# Navigate to project directory
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation

# Add all changes
git add .

# Create commit
git commit -m "Fix: FAQボタンと履歴機能を修正

- FAQボタンにクリックイベントハンドラを追加
- FAQ保存確認ダイアログを実装  
- チャット履歴取得・表示機能を追加
- FAQ保存APIエンドポイントを作成 (/api/faq/save)
- 履歴一覧APIエンドポイントを作成 (/api/chat-history/list)
- conversationデータ構造のデバッグログ追加

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to main branch
git push origin main

echo "✅ Deployment completed!"
echo "🔗 Check Vercel dashboard for deployment status"