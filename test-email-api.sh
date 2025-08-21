#\!/bin/bash

# テスト用の見積データ
QUOTE_ID="68982763e9f5b89ba7a4e4d0"
API_URL="https://accounting-automation.vercel.app"

# メール送信テスト（新しい統合エンドポイントを使用）
echo "Testing email send API..."
curl -s -X POST "${API_URL}/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "quote",
    "documentId": "'${QUOTE_ID}'",
    "to": "info@effect.moe",
    "subject": "見積書送信テスト",
    "body": "テストメッセージです",
    "attachPdf": false
  }' | jq '.'

