/**
 * AI駆動のOCRシステムのテストスクリプト
 * 
 * 実行方法:
 * npm run test-ai-ocr
 * 
 * または直接実行:
 * npx ts-node scripts/test-ai-driven-ocr.ts
 */

import { OCRAIOrchestrator } from '../lib/ocr-ai-orchestrator';

// テスト用のモックOCRデータ
const mockOcrData = {
  pages: [
    {
      pageNumber: 1,
      lines: [
        { content: '見積書', boundingBox: [100, 50, 200, 80] },
        { content: '合同会社アソウタイセイプリンティング', boundingBox: [400, 100, 600, 130] },
        { content: '〒123-4567 東京都渋谷区道玄坂1-2-3', boundingBox: [400, 130, 600, 160] },
        { content: 'TEL: 03-1234-5678', boundingBox: [400, 160, 600, 190] },
        { content: '株式会社CROP御中', boundingBox: [50, 200, 250, 230] },
        { content: '件名: 印刷物', boundingBox: [50, 280, 250, 310] },
        { content: '発行日: 2024年8月28日', boundingBox: [50, 320, 250, 350] },
        { content: '品名', boundingBox: [50, 400, 100, 430] },
        { content: '数量', boundingBox: [200, 400, 250, 430] },
        { content: '単価', boundingBox: [300, 400, 350, 430] },
        { content: '金額', boundingBox: [450, 400, 500, 430] },
        { content: '領収書（3枚複写・1冊50組）', boundingBox: [50, 450, 300, 480] },
        { content: '1', boundingBox: [200, 450, 250, 480] },
        { content: '5,000', boundingBox: [300, 450, 350, 480] },
        { content: '5,000', boundingBox: [450, 450, 500, 480] },
        { content: '小計', boundingBox: [400, 500, 450, 530] },
        { content: '5,000', boundingBox: [450, 500, 500, 530] },
        { content: '消費税(10%)', boundingBox: [400, 530, 450, 560] },
        { content: '500', boundingBox: [450, 530, 500, 560] },
        { content: '合計', boundingBox: [400, 560, 450, 590] },
        { content: '5,500', boundingBox: [450, 560, 500, 590] }
      ]
    }
  ],
  fields: {
    vendorName: 'アソウタイセイプリンティング',
    customerName: '株式会社CROP御中',
    subject: '印刷物'
  },
  tables: [
    {
      cells: [
        { content: '品名', rowIndex: 0, columnIndex: 0 },
        { content: '数量', rowIndex: 0, columnIndex: 1 },
        { content: '単価', rowIndex: 0, columnIndex: 2 },
        { content: '金額', rowIndex: 0, columnIndex: 3 },
        { content: '領収書（3枚複写・1冊50組）', rowIndex: 1, columnIndex: 0 },
        { content: '1', rowIndex: 1, columnIndex: 1 },
        { content: '5,000', rowIndex: 1, columnIndex: 2 },
        { content: '5,000', rowIndex: 1, columnIndex: 3 }
      ]
    }
  ]
};

async function testAIDrivenOCR() {
  console.log('=== AI駆動のOCRシステムテスト開始 ===');
  
  try {
    const orchestrator = new OCRAIOrchestrator();
    
    console.log('1. OCRAIOrchestrator インスタンス作成完了');
    
    // テストリクエストの作成
    const testRequest = {
      ocrResult: mockOcrData,
      documentType: 'supplier-quote' as const,
      companyId: '11111111-1111-1111-1111-111111111111'
    };
    
    console.log('2. テストリクエスト作成完了');
    console.log('   - 文書タイプ:', testRequest.documentType);
    console.log('   - 会社ID:', testRequest.companyId);
    
    // AI駆動の解析実行
    console.log('3. AI駆動のOCR解析開始...');
    const startTime = Date.now();
    
    const result = await orchestrator.orchestrateOCRResult(testRequest);
    
    const endTime = Date.now();
    console.log(`4. AI駆動のOCR解析完了 (${endTime - startTime}ms)`);
    
    // 結果の検証
    console.log('5. 解析結果の検証:');
    console.log('   - 件名:', result.subject);
    console.log('   - 仕入先:', result.vendor.name);
    console.log('   - 顧客:', result.customer.name);
    console.log('   - 商品数:', result.items.length);
    console.log('   - 総額:', result.totalAmount);
    console.log('   - 税額:', result.taxAmount);
    console.log('   - 小計:', result.subtotal);
    console.log('   - 発行日:', result.issueDate);
    
    // 商品明細の表示
    if (result.items.length > 0) {
      console.log('6. 商品明細:');
      result.items.forEach((item, index) => {
        console.log(`   商品${index + 1}:`, {
          name: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount
        });
      });
    }
    
    // 成功判定
    const isSuccess = 
      result.subject === '印刷物' &&
      result.vendor.name.includes('アソウタイセイプリンティング') &&
      result.customer.name.includes('CROP') &&
      result.totalAmount === 5500 &&
      result.items.length > 0;
    
    console.log('7. テスト結果:', isSuccess ? '✅ 成功' : '❌ 失敗');
    
    if (isSuccess) {
      console.log('=== AI駆動のOCRシステムテスト完了 ===');
      console.log('AI駆動のOCRシステムは正常に動作しています！');
    } else {
      console.log('=== AI駆動のOCRシステムテスト失敗 ===');
      console.log('期待値と実際の値が異なります。');
    }
    
    return isSuccess;
    
  } catch (error) {
    console.error('8. テストエラー:', error);
    console.log('=== AI駆動のOCRシステムテスト失敗 ===');
    
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
      console.error('スタックトレース:', error.stack);
    }
    
    return false;
  }
}

// テスト実行
if (require.main === module) {
  testAIDrivenOCR()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}