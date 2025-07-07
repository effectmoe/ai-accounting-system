#!/bin/bash

# GAS Web AppのテストスクリプトWebhook URL
WEBHOOK_URL="https://script.google.com/macros/s/AKfycbw7IWu_-O-neFeUw48qBpfyfA5952_qdRNQ7LYEFh1pRMY4se8g93p1_UtFGdqEJnSm/exec"

# GET リクエストのテスト
echo "=== GET リクエストのテスト ==="
curl -L "$WEBHOOK_URL"
echo -e "\n"

# POST リクエストのテスト（プッシュ通知のシミュレーション）
echo "=== POST リクエストのテスト ==="
curl -L -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "drive#changes",
    "id": "test-notification",
    "resourceId": "test-resource",
    "resourceUri": "https://www.googleapis.com/drive/v3/files/test",
    "token": "test-token",
    "expiration": "1234567890000"
  }'
echo -e "\n"