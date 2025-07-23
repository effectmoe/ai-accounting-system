#!/bin/bash

echo "=== Next.js JavaScript実行問題の修正スクリプト ==="
echo ""
echo "現在のバージョン情報:"
npm ls react react-dom next | grep -E "react@|react-dom@|next@"

echo ""
echo "1. node_modulesとlockファイルを削除します..."
rm -rf node_modules package-lock.json

echo ""
echo "2. Reactを18.2.0に固定してインストールします..."
npm install react@18.2.0 react-dom@18.2.0 --save-exact

echo ""
echo "3. 他の依存関係をインストールします..."
npm install

echo ""
echo "4. インストール後のバージョンを確認します..."
npm ls react react-dom next | grep -E "react@|react-dom@|next@"

echo ""
echo "完了しました！"
echo "次のコマンドでアプリケーションを起動してください:"
echo "npm run dev"