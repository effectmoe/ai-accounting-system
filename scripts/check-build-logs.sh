#!/bin/bash

echo "🔍 Vercelビルドログを確認中..."
echo ""

# 最新のコミット情報
echo "📋 最新のコミット:"
git log -1 --oneline
echo ""

# 現在のブランチ
echo "🌿 現在のブランチ:"
git branch --show-current
echo ""

# リモートの状態
echo "📡 リモートリポジトリの状態:"
git fetch origin
git status -uno
echo ""

# 最近のコミット履歴
echo "📜 最近のコミット履歴:"
git log --oneline -10
echo ""

echo "✅ 確認完了"
echo ""
echo "💡 ヒント: Vercelのダッシュボードで最新のビルドステータスを確認してください"
echo "   https://vercel.com/effectmoes-projects/accounting-automation/deployments"