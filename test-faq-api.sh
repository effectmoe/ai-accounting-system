#!/bin/bash

# FAQ API テストスクリプト

# ベースURL
BASE_URL="http://localhost:3000/api/faq"

echo "=== FAQ API テスト ==="
echo ""

# 1. FAQ一覧取得テスト
echo "1. FAQ一覧取得テスト"
curl -X GET "$BASE_URL?limit=5" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# 2. 個別FAQ取得テスト（存在するFAQ IDを使用する必要があります）
FAQ_ID="678b5e1e6dd93ba7dd000001" # 実際のIDに置き換えてください
echo "2. 個別FAQ取得テスト (ID: $FAQ_ID)"
curl -X GET "$BASE_URL/$FAQ_ID" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# 3. FAQ更新テスト
echo "3. FAQ更新テスト (ID: $FAQ_ID)"
curl -X PUT "$BASE_URL/$FAQ_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "更新されたFAQの質問",
    "answer": "更新されたFAQの回答",
    "category": "tax-accounting",
    "tags": ["更新", "テスト"],
    "difficulty": "intermediate",
    "priority": 7,
    "isPublished": true,
    "qualityMetrics": {
      "accuracy": 90,
      "completeness": 90,
      "clarity": 90,
      "usefulness": 90
    }
  }' | jq '.'
echo ""

# 4. 新規FAQ作成テスト
echo "4. 新規FAQ作成テスト"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "テスト用のFAQの質問",
    "answer": "テスト用のFAQの回答",
    "category": "tax-accounting",
    "tags": ["テスト", "新規"],
    "difficulty": "beginner",
    "priority": 5,
    "contentType": "general",
    "isPublished": false
  }' | jq '.'
echo ""

# 5. FAQ削除テスト（慎重に実行してください）
# echo "5. FAQ削除テスト (ID: $FAQ_ID)"
# curl -X DELETE "$BASE_URL/$FAQ_ID" \
#   -H "Content-Type: application/json" | jq '.'
# echo ""

echo "=== テスト完了 ==="