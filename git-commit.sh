#!/bin/bash

# Git 操作を実行するスクリプト
echo "Starting Git operations..."

# プロジェクトディレクトリに移動
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation

# Git status確認
echo "=== Git Status ==="
git status

# 変更をaddして確認
echo "=== Adding changes ==="
git add app/api/knowledge/analyze-chat-stream/route.ts

# コミット実行
echo "=== Committing changes ==="
git commit -m "$(cat <<'EOF'
Debug: conversationデータ構造の詳細ログ追加

- searchTextがundefinedになる原因を特定するため
- conversationの型、配列状態、実際のデータを出力
- lastMessageの構造も詳細ログに追加

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# プッシュ実行
echo "=== Pushing to remote ==="
git push origin main

echo "Git operations completed."