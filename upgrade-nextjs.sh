#!/bin/bash

echo "=== Next.jsアップグレードスクリプト ==="
echo ""
echo "現在のバージョン情報:"
npm ls react react-dom next | grep -E "react@|react-dom@|next@"

echo ""
echo "1. Next.jsを最新バージョンにアップグレードします..."
npm install next@latest

echo ""
echo "2. 関連パッケージもアップグレードします..."
npm install eslint-config-next@latest

echo ""
echo "3. アップグレード後のバージョンを確認します..."
npm ls react react-dom next | grep -E "react@|react-dom@|next@"

echo ""
echo "完了しました！"
echo "次のコマンドでアプリケーションを起動してください:"
echo "npm run dev"