import { NextRequest } from 'next/server';
import { GET } from '../app/api/ocr-results/route';

async function testOCRAPI() {
  console.log('=== OCR API直接テスト開始 ===');

  try {
    // APIエンドポイントを直接テスト
    const testUrl = 'http://localhost:3001/api/ocr-results?page=1&limit=20';
    const request = new NextRequest(testUrl);
    
    console.log('テストURL:', testUrl);
    console.log('リクエスト詳細:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });

    // APIハンドラーを直接呼び出し
    const response = await GET(request);
    
    console.log('レスポンスステータス:', response.status);
    
    const responseData = await response.json();
    console.log('レスポンスデータ:', JSON.stringify(responseData, null, 2));

  } catch (error) {
    console.error('テストエラー:', error);
    console.error('エラースタック:', error.stack);
  } finally {
    process.exit(0);
  }
}

testOCRAPI();