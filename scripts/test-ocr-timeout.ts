import fs from 'fs';
import path from 'path';

/**
 * OCRタイムアウトのテストスクリプト
 * タイムアウト修正が正常に動作することを確認
 */

async function testOCRTimeout() {
  console.log('🔍 OCR Timeout Test Starting...');
  console.log('================================\n');

  const apiUrl = 'https://accounting-automation.vercel.app/api/ocr/analyze';
  
  // テスト画像のパスを取得（実際のテストでは適切な画像ファイルを使用）
  const testImagePath = path.join(process.cwd(), 'public', 'test-invoice.jpg');
  
  // テスト用のFormDataを作成
  const formData = new FormData();
  
  // 実際のファイルがない場合はモックデータを使用
  const mockFile = new File(['test'], 'test-invoice.jpg', { type: 'image/jpeg' });
  formData.append('file', mockFile);
  formData.append('documentType', 'invoice');
  formData.append('companyId', '11111111-1111-1111-1111-111111111111');

  console.log('📤 Sending OCR request...');
  console.log(`URL: ${apiUrl}`);
  console.log(`Document Type: invoice`);
  console.log(`Start Time: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(65000) // 65秒のクライアント側タイムアウト
    });

    const elapsed = Date.now() - startTime;
    
    console.log(`\n✅ Response received after ${elapsed}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('\n🎉 OCR analysis completed successfully!');
      console.log('Processing Method:', data.processingMethod);
      console.log('Model:', data.model);
      if (data.processingTime) {
        console.log('Processing Time:', data.processingTime);
      }
      console.log('\nExtracted Data Summary:');
      if (data.data) {
        console.log('- Vendor:', data.data.vendor?.name || 'N/A');
        console.log('- Customer:', data.data.customer?.name || 'N/A');
        console.log('- Total Amount:', data.data.totalAmount || 'N/A');
      }
    } else {
      console.log('\n❌ OCR analysis failed');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
      if (data.processingTime) {
        console.log('Processing Time before error:', data.processingTime, 'ms');
      }
    }
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`\n❌ Request failed after ${elapsed}ms`);
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('⏱️  Client-side timeout exceeded (65 seconds)');
    }
  }
  
  console.log('\n================================');
  console.log('Test completed');
}

// スクリプトを実行
testOCRTimeout().catch(console.error);