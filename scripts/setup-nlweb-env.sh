#!/bin/bash
# NLWeb環境変数設定スクリプト

echo "🔧 NLWeb環境変数設定開始"

# DeepSeek APIをNLWebエンドポイントとして設定
echo "📝 Vercel環境変数を設定中..."

# NLWeb環境変数をVercelに設定
npx vercel env add NLWEB_MCP_ENDPOINT production --force
echo "https://api.deepseek.com/v1"

npx vercel env add NLWEB_MCP_KEY production --force
echo "sk-97f6efd342ba4f7cb1d98e4ac26ac720"

echo "✅ Vercel環境変数設定完了"
echo ""
echo "📋 設定内容:"
echo "  NLWEB_MCP_ENDPOINT=https://api.deepseek.com/v1"
echo "  NLWEB_MCP_KEY=sk-97f6efd342ba4f7cb1d98e4ac26ac720"
echo ""
echo "🎯 これにより以下が可能になります:"
echo "  - DeepSeek APIによる自然言語理解"
echo "  - 会計専門用語の適切な解釈"
echo "  - インテント分析とエンティティ抽出"
echo "  - 構造化データの自動生成支援"