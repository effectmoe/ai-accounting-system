#!/bin/bash

# シンプルヘルスチェックテスト

BASE_URL="${1:-http://localhost:3000}"

echo "========================================"
echo "  簡易ヘルスチェックテスト"
echo "========================================"
echo "テスト対象: $BASE_URL"
echo ""

# ヘルスチェックAPI
echo "1. ヘルスチェックAPI テスト"
if response=$(curl -s "${BASE_URL}/api/health"); then
    if echo "$response" | jq empty 2>/dev/null; then
        echo "✅ ヘルスチェックAPI: 正常"
        system=$(echo "$response" | jq -r '.system // "Unknown"')
        version=$(echo "$response" | jq -r '.version // "Unknown"')
        echo "   システム: $system"
        echo "   バージョン: $version"
    else
        echo "❌ ヘルスチェックAPI: 無効なレスポンス"
    fi
else
    echo "❌ ヘルスチェックAPI: 接続失敗"
fi

echo ""

# 環境変数チェックAPI
echo "2. 環境変数チェックAPI テスト"
if response=$(curl -s "${BASE_URL}/api/env-check"); then
    if echo "$response" | jq empty 2>/dev/null; then
        echo "✅ 環境変数チェックAPI: 正常"
        completeness=$(echo "$response" | jq -r '.completeness // "0%"')
        echo "   設定完了率: $completeness"
    else
        echo "❌ 環境変数チェックAPI: 無効なレスポンス"
    fi
else
    echo "❌ 環境変数チェックAPI: 接続失敗"
fi

echo ""

# ヘルスページ
echo "3. ヘルスページ アクセステスト"
if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health" | grep -q "200"; then
    echo "✅ ヘルスページ: アクセス可能"
else
    echo "❌ ヘルスページ: アクセス失敗"
fi

echo ""
echo "========================================"
echo "テスト完了"
echo "========================================"