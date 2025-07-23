#!/usr/bin/env node
import { OCRProcessor } from '../lib/ocr-processor';
import { AccountCategoryAI } from '../lib/account-category-ai';

// テスト用の駐車場領収書データ
const mockParkingReceiptText = `タイムズ福岡城三の丸
タイムズ24株式会社

領収書

日付: 2025年1月15日

入庫: 10:30
出庫: 15:45
駐車時間: 5時間15分

基本料金: 400円/30分
駐車料金: 4,200円

お支払い金額: 4,200円

ありがとうございました`;

async function testParkingReceiptOCR() {
  console.log('=== 駐車場領収書OCRテスト開始 ===\n');
  
  try {
    // OCRプロセッサーのインスタンスを作成
    const ocrProcessor = new OCRProcessor();
    
    // テキスト解析をテスト
    console.log('1. OCRテキスト解析テスト');
    console.log('入力テキスト:');
    console.log(mockParkingReceiptText);
    console.log('\n');
    
    const parsedResult = ocrProcessor.parseReceiptText(mockParkingReceiptText);
    console.log('解析結果:');
    console.log(JSON.stringify(parsedResult, null, 2));
    console.log('\n');
    
    // 駐車場判定のテスト
    console.log('2. 駐車場領収書判定テスト');
    console.log('receiptType:', parsedResult.receiptType);
    console.log('companyName:', parsedResult.companyName);
    console.log('facilityName:', parsedResult.facilityName);
    console.log('entryTime:', parsedResult.entryTime);
    console.log('exitTime:', parsedResult.exitTime);
    console.log('parkingDuration:', parsedResult.parkingDuration);
    console.log('\n');
    
    // 仕訳データ生成のテスト
    console.log('3. 仕訳データ生成テスト');
    const ocrResult = {
      ...parsedResult,
      text: mockParkingReceiptText,
      confidence: 0.95
    };
    
    const journalEntry = await ocrProcessor.createJournalEntry(ocrResult as any, 'test-account-id');
    console.log('仕訳データ:');
    console.log(JSON.stringify(journalEntry, null, 2));
    console.log('\n');
    
    // 勘定科目AIのテスト
    console.log('4. 勘定科目AI判定テスト');
    const categoryAI = new AccountCategoryAI();
    const prediction = await categoryAI.predictAccountCategory(ocrResult as any, 'test-company-id');
    console.log('AI判定結果:');
    console.log('勘定科目:', prediction.category);
    console.log('信頼度:', prediction.confidence);
    console.log('判定理由:', prediction.reasoning);
    console.log('\n');
    
    // まとめ
    console.log('=== テスト結果まとめ ===');
    console.log('✅ 駐車場領収書として正しく認識:', parsedResult.receiptType === 'parking');
    console.log('✅ 運営会社名を正しく抽出:', parsedResult.companyName === 'タイムズ24株式会社');
    console.log('✅ 施設名を正しく抽出:', parsedResult.facilityName === 'タイムズ福岡城三の丸');
    console.log('✅ 勘定科目が旅費交通費:', journalEntry.debitAccount === '旅費交通費');
    console.log('✅ AI判定も旅費交通費:', prediction.category === '旅費交通費');
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  }
}

// テスト実行
testParkingReceiptOCR();