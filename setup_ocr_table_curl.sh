#!/bin/bash

# Supabase接続情報
SUPABASE_URL="https://cjqwqvvxqvlufrvnmqtx.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcXdxdnZ4cXZsdWZydm5tcXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE0MjEyMSwiZXhwIjoyMDUxNzE4MTIxfQ.9sPzTD7c7a7n65K0rwZ3Vgc8Rx2xlwZ0j0F7J-4gKGs"

echo "Creating OCR results table in Supabase..."

# テーブル作成のSQL
SQL_CREATE_TABLE='
CREATE TABLE IF NOT EXISTS ocr_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('"'"'utc'"'"'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('"'"'utc'"'"'::text, NOW()) NOT NULL,
  file_id TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  ocr_text TEXT NOT NULL,
  document_type TEXT,
  vendor TEXT,
  date DATE,
  amount DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2),
  user_id UUID,
  status TEXT DEFAULT '"'"'completed'"'"'
);
'

# Supabase REST APIを使用してテーブルの存在を確認
echo "Checking if table exists..."
RESPONSE=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/ocr_results?limit=1" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

echo "Response: $RESPONSE"

# テーブルが存在しない場合のエラーメッセージをチェック
if [[ $RESPONSE == *"relation \"public.ocr_results\" does not exist"* ]]; then
  echo "Table does not exist. Creating table using SQL Editor would be required."
  echo ""
  echo "Please execute the following SQL in Supabase SQL Editor:"
  echo ""
  cat create_ocr_table.sql
  echo ""
  echo "You can access the SQL Editor at:"
  echo "${SUPABASE_URL}/project/default/editor/sql"
else
  echo "Table might already exist or connection successful."
fi

# テスト用：テーブルにダミーデータを挿入してみる
echo ""
echo "Testing table access..."
TEST_DATA='{
  "file_id": "test_'$(date +%s)'",
  "file_name": "test.pdf",
  "ocr_text": "This is a test OCR result",
  "document_type": "invoice",
  "vendor": "Test Company",
  "date": "'$(date +%Y-%m-%d)'",
  "amount": 100.00,
  "tax_amount": 10.00,
  "status": "completed"
}'

INSERT_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/ocr_results" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$TEST_DATA")

echo "Insert test response: $INSERT_RESPONSE"

if [[ $INSERT_RESPONSE == *"file_id"* ]]; then
  echo "✅ Table is working correctly!"
  
  # テストデータを削除
  FILE_ID=$(echo $INSERT_RESPONSE | grep -o '"file_id":"[^"]*"' | cut -d'"' -f4)
  curl -s -X DELETE \
    "${SUPABASE_URL}/rest/v1/ocr_results?file_id=eq.${FILE_ID}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
  
  echo "Test data cleaned up."
fi