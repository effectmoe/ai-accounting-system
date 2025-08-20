#!/usr/bin/env tsx

/**
 * Vercel環境でのPuppeteer動作テスト
 * 
 * 使用方法:
 * npm run test:puppeteer
 * または
 * tsx scripts/test-puppeteer-vercel.ts
 */

import { logger } from '../lib/logger';
import { generateReceiptPDFWithPuppeteer, generateReceiptPDFWithJsPDF, generateReceiptPDFWithAutoFallback } from '../lib/pdf-receipt-puppeteer-generator-fixed';

// テスト用の領収書データ
const testReceipt = {
  id: 'test-receipt-001',
  receiptNumber: 'R-2025-001',
  issueDate: new Date().toISOString(),
  customerName: 'テスト株式会社',
  totalAmount: 11000,
  subtotal: 10000,
  taxAmount: 1000,
  taxRate: 0.1,
  subject: 'システム開発費として',
  items: [
    {
      description: 'ウェブシステム開発',
      quantity: 1,
      unit: '式',
      unitPrice: 10000,
      amount: 10000
    }
  ],
  issuerName: 'AAMシステム株式会社',
  issuerAddress: '東京都渋谷区1-1-1',
  issuerPhone: '03-1234-5678',
  notes: 'お支払いありがとうございました。'
};

async function testPuppeteerEnvironment() {
  console.log('🔍 Puppeteer環境テスト開始');
  console.log('=' .repeat(50));
  
  // 環境情報を表示
  console.log('📊 環境情報:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`VERCEL: ${process.env.VERCEL}`);
  console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV}`);
  console.log(`VERCEL_URL: ${process.env.VERCEL_URL}`);
  console.log(`AWS_LAMBDA_FUNCTION_NAME: ${process.env.AWS_LAMBDA_FUNCTION_NAME}`);
  console.log();
  
  const tests = [
    {
      name: 'jsPDF（安全なフォールバック）',
      fn: () => generateReceiptPDFWithJsPDF(testReceipt)
    },
    {
      name: 'Puppeteer（メイン機能）',
      fn: () => generateReceiptPDFWithPuppeteer(testReceipt)
    },
    {
      name: 'Auto Fallback（推奨）',
      fn: () => generateReceiptPDFWithAutoFallback(testReceipt)
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`🧪 テスト実行中: ${test.name}`);
    const startTime = Date.now();
    
    try {
      const pdfBuffer = await test.fn();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ 成功: ${test.name}`);
      console.log(`   生成時間: ${duration}ms`);
      console.log(`   PDFサイズ: ${pdfBuffer.length} bytes`);
      console.log();
      
      results.push({
        name: test.name,
        success: true,
        duration,
        size: pdfBuffer.length,
        error: null
      });
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`❌ 失敗: ${test.name}`);
      console.log(`   実行時間: ${duration}ms`);
      console.log(`   エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log();
      
      results.push({
        name: test.name,
        success: false,
        duration,
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // 結果サマリー
  console.log('📋 テスト結果サマリー');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  let totalDuration = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.duration}ms`);
    if (result.success) {
      successCount++;
      console.log(`   PDFサイズ: ${result.size} bytes`);
    } else {
      console.log(`   エラー: ${result.error}`);
    }
    totalDuration += result.duration;
  });
  
  console.log();
  console.log(`成功率: ${successCount}/${results.length} (${Math.round(successCount / results.length * 100)}%)`);
  console.log(`総実行時間: ${totalDuration}ms`);
  
  // 推奨事項
  console.log();
  console.log('💡 推奨事項:');
  
  if (results.find(r => r.name.includes('Puppeteer') && r.success)) {
    console.log('✅ Puppeteerが正常に動作しています');
    console.log('   本番環境でPuppeteerを使用可能です');
  } else {
    console.log('⚠️  Puppeteerの動作に問題があります');
    console.log('   Auto FallbackまたはjsPDFの使用を推奨します');
  }
  
  if (results.find(r => r.name.includes('Auto Fallback') && r.success)) {
    console.log('✅ Auto Fallbackが正常に動作しています');
    console.log('   本番環境での推奨設定です');
  }
  
  // Vercel固有の推奨事項
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    console.log();
    console.log('🚀 Vercel環境用の追加推奨事項:');
    console.log('1. vercel.jsonでPDF生成APIの maxDuration を 45秒に設定');
    console.log('2. memory を 1024MB に設定');
    console.log('3. 環境変数で PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true を設定');
    console.log('4. @sparticuz/chromium の最新バージョンを使用');
  }
  
  console.log();
  console.log('🎉 テスト完了');
}

// メイン実行
if (require.main === module) {
  testPuppeteerEnvironment().catch(error => {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  });
}

export { testPuppeteerEnvironment };