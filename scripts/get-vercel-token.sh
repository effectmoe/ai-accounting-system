#!/bin/bash

# Vercel トークンを取得するスクリプト

echo "Vercelのアカウントトークンを生成します..."
echo ""
echo "以下の手順に従ってください："
echo "1. https://vercel.com/account/tokens にアクセス"
echo "2. 'Create Token' をクリック"
echo "3. トークン名を入力（例: 'accounting-automation-deploy'）"
echo "4. スコープはデフォルトのままでOK"
echo "5. 'Create' をクリック"
echo "6. 生成されたトークンをコピー"
echo ""
echo "トークンを取得したら、以下のコマンドで環境変数に設定してください："
echo ""
echo "export VERCEL_TOKEN='your-token-here'"
echo ""
echo "または、.env.localファイルに追加："
echo "VERCEL_TOKEN=your-token-here"