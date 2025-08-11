#\!/bin/bash

# テスト用の見積データ
QUOTE_ID="68982763e9f5b89ba7a4e4d0"
API_URL="https://accounting-automation.vercel.app"

# メール送信テスト
echo "Testing email send API..."
curl -s -X POST "${API_URL}/api/quotes/${QUOTE_ID}/send" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "info@effect.moe",
    "recipientName": "テスト太郎",
    "customMessage": "テストメッセージです",
    "attachPdf": false
  }' | jq '.'

