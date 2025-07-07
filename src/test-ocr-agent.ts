#!/usr/bin/env node

import { ocrAgent } from './agents/ocr-agent';
import path from 'path';
import fs from 'fs';

// OCRエージェントのテスト
async function testOCRAgent() {
  console.log('🧪 Testing OCR Agent with MCP Server Integration...\n');

  // テスト用の画像ファイル作成（Base64エンコードされたサンプル画像）
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testImagePath = path.join(__dirname, '../test-receipt.png');
  
  // テスト画像ファイルを作成
  fs.writeFileSync(testImagePath, Buffer.from(testImageBase64, 'base64'));
  console.log(`📄 Created test image: ${testImagePath}`);

  const testCases = [
    {
      name: 'Local File Test',
      input: {
        filePath: testImagePath,
        fileType: 'image' as const,
        language: 'ja' as const,
        extractType: 'receipt' as const,
        validationEnabled: true,
      },
    },
    {
      name: 'Handwritten Document Test',
      input: {
        filePath: testImagePath,
        fileType: 'image' as const,
        language: 'ja' as const,
        extractType: 'handwritten' as const,
        preferredProviders: ['handwriting_ocr' as const],
        validationEnabled: true,
      },
    },
    {
      name: 'Google Vision Test',
      input: {
        filePath: testImagePath,
        fileType: 'image' as const,
        language: 'ja' as const,
        extractType: 'general' as const,
        preferredProviders: ['google_vision' as const],
        validationEnabled: false,
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Running: ${testCase.name}`);
    console.log('Input:', JSON.stringify(testCase.input, null, 2));

    try {
      const startTime = Date.now();
      const result = await ocrAgent.execute({ input: testCase.input });
      const duration = Date.now() - startTime;

      console.log('✅ Test Result:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Duration: ${duration}ms`);
      
      if (result.success) {
        console.log(`   Text Length: ${result.text?.length || 0} chars`);
        console.log(`   Confidence: ${result.confidence}`);
        console.log(`   Vendor: ${result.vendor || 'N/A'}`);
        console.log(`   Amount: ${result.amount || 'N/A'}`);
        console.log(`   Date: ${result.date || 'N/A'}`);
        console.log(`   Provider: ${result.provider}`);
        
        if (result.validation) {
          console.log(`   Validation: ${result.validation.isValid ? 'PASS' : 'FAIL'}`);
          if (result.validation.errors?.length > 0) {
            console.log(`   Errors: ${result.validation.errors.join(', ')}`);
          }
          if (result.validation.warnings?.length > 0) {
            console.log(`   Warnings: ${result.validation.warnings.join(', ')}`);
          }
        }
      } else {
        console.log(`   Error: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Test Failed: ${error.message}`);
    }

    console.log('─'.repeat(50));
  }

  // クリーンアップ
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
    console.log(`🗑️  Cleaned up test file: ${testImagePath}`);
  }
}

// エラーハンドリング
async function main() {
  try {
    await testOCRAgent();
    console.log('\n✅ All OCR Agent tests completed');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// 環境変数チェック
function checkEnvironment() {
  console.log('🔧 Environment Check:');
  
  const requiredVars = [
    'DEEPSEEK_API_KEY',
    'HANDWRITING_OCR_API_KEY', 
    'GOOGLE_CLOUD_API_KEY',
    'GAS_OCR_URL',
  ];

  const optional = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  let hasRequired = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: configured`);
    } else {
      console.log(`   ❌ ${varName}: missing`);
      hasRequired = false;
    }
  });

  optional.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${value ? '✅' : '⚠️'} ${varName}: ${value ? 'configured' : 'optional - not set'}`);
  });

  if (!hasRequired) {
    console.log('\n⚠️  Some required environment variables are missing.');
    console.log('   The test will run but some providers may fail.');
  }

  console.log('');
}

// 実行
if (require.main === module) {
  checkEnvironment();
  main();
}