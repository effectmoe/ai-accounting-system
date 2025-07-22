#!/bin/bash

# Vercelのキャッシュを完全にクリアするスクリプト

echo "🔧 Vercelキャッシュクリアスクリプトを開始します..."

# 1. ローカルキャッシュの削除
echo "📁 ローカルキャッシュを削除しています..."
rm -rf .vercel
rm -rf .next
rm -rf node_modules/.cache
echo "✅ ローカルキャッシュを削除しました"

# 2. package-lock.jsonを更新（依存関係の再インストールを強制）
echo "📦 package-lock.jsonを更新しています..."
touch package-lock.json
echo "✅ package-lock.jsonを更新しました"

# 3. vercel.jsonのFORCE_REBUILDを更新
echo "🔄 vercel.jsonのFORCE_REBUILDを更新しています..."
current_date=$(date +"%Y-%m-%d-%H%M%S")
sed -i.bak "s/\"FORCE_REBUILD\": \".*\"/\"FORCE_REBUILD\": \"$current_date\"/" vercel.json
rm vercel.json.bak
echo "✅ FORCE_REBUILDを更新しました: $current_date"

# 4. Gitにコミット（Vercelの自動デプロイをトリガー）
echo "📝 変更をGitにコミットしています..."
git add vercel.json
git commit -m "Force Vercel cache clear - $current_date"
echo "✅ 変更をコミットしました"

echo ""
echo "✨ キャッシュクリアの準備が完了しました！"
echo ""
echo "次のステップ:"
echo "1. 'git push' でVercelの自動デプロイをトリガー"
echo "2. または 'vercel --prod --force' で手動デプロイ"
echo "3. ブラウザでも Ctrl+Shift+R (Windows/Linux) または Cmd+Shift+R (Mac) でキャッシュをクリア"
echo ""
echo "追加のトラブルシューティング:"
echo "- Vercelダッシュボードで 'Settings > Functions > Purge Data Cache' を実行"
echo "- CloudflareやCDNを使用している場合は、そちらのキャッシュもクリア"