#!/bin/bash

# Vercel統合のロールバックスクリプト
# 作成日: 2025-07-18

echo "=== Vercel統合ロールバックスクリプト ==="
echo ""

# バックアップファイルの確認
BACKUP_FILE="backup/.env.local.backup"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ エラー: バックアップファイルが見つかりません: $BACKUP_FILE"
    exit 1
fi

echo "✅ バックアップファイルが見つかりました: $BACKUP_FILE"
echo ""

# 現在の.env.localのバックアップ
if [ -f ".env.local" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    CURRENT_BACKUP="backup/.env.local.before_rollback_$TIMESTAMP"
    cp .env.local "$CURRENT_BACKUP"
    echo "📁 現在の.env.localをバックアップしました: $CURRENT_BACKUP"
fi

# ロールバックの実行
echo ""
echo "🔄 ロールバックを実行しますか？ (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    cp "$BACKUP_FILE" .env.local
    echo "✅ ロールバックが完了しました"
    echo ""
    
    # 重要な環境変数の確認
    echo "📋 現在のMongoDB設定:"
    grep "MONGODB" .env.local | head -3
    echo ""
    
    echo "📋 現在のPerplexity設定:"
    grep "PERPLEXITY" .env.local | head -1
    echo ""
    
    echo "⚠️  注意事項:"
    echo "1. Vercelダッシュボードの環境変数も手動で更新する必要があります"
    echo "2. vercel env pull を実行してVercelの環境変数を同期してください"
    echo "3. アプリケーションを再起動してください"
else
    echo "❌ ロールバックがキャンセルされました"
fi