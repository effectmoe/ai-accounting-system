#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testOCREndpoint() {
  console.log('🧪 Testing OCR endpoint...\n');

  // テスト用の画像を作成（1x1の白いピクセル）
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  );

  // エンドポイントURL
  const urls = [
    'http://localhost:3000/api/ocr/analyze',
    'https://accounting-automation.vercel.app/api/ocr/analyze'
  ];

  for (const url of urls) {
    console.log(`\n📍 Testing: ${url}`);
    console.log('─'.repeat(50));

    try {
      // FormDataを作成
      const formData = new FormData();
      formData.append('file', testImageBuffer, {
        filename: 'test-receipt.png',
        contentType: 'image/png'
      });
      formData.append('companyId', 'test-company');

      // リクエストを送信
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      const responseText = await response.text();
      let responseJson;
      
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { rawResponse: responseText };
      }

      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Response:', JSON.stringify(responseJson, null, 2));

      if (!response.ok) {
        console.error('❌ Request failed');
        if (responseJson.error) {
          console.error('Error:', responseJson.error);
        }
        if (responseJson.details) {
          console.error('Details:', responseJson.details);
        }
      } else {
        console.log('✅ Request successful');
      }

    } catch (error) {
      console.error('❌ Connection error:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  }

  console.log('\n✨ Test complete');
}

// 実行
testOCREndpoint().catch(console.error);