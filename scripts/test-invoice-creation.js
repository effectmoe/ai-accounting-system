// 請求書作成機能のテストスクリプト
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testInvoiceCreation() {
  console.log('=== 請求書作成機能テスト開始 ===\n');
  
  try {
    // 1. 顧客リスト取得テスト
    console.log('1. 顧客リスト取得テスト');
    const customersResponse = await fetch(`${BASE_URL}/api/customers`);
    const customersData = await customersResponse.json();
    console.log('ステータス:', customersResponse.status);
    console.log('顧客数:', customersData.customers?.length || 0);
    if (customersData.customers?.length > 0) {
      console.log('最初の顧客:', {
        _id: customersData.customers[0]._id,
        companyName: customersData.customers[0].companyName,
        name: customersData.customers[0].name
      });
    }
    console.log('');
    
    // 2. AI会話解析テスト
    console.log('2. AI会話解析テスト');
    const analyzeResponse = await fetch(`${BASE_URL}/api/invoices/analyze-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: '山田商事さんに、ウェブサイト制作費として50万円の請求書を作成してください。納期は今月末です。'
      })
    });
    
    const analyzeData = await analyzeResponse.json();
    console.log('ステータス:', analyzeResponse.status);
    if (analyzeResponse.ok) {
      console.log('解析結果:', {
        customerName: analyzeData.data?.customerName,
        totalAmount: analyzeData.data?.totalAmount,
        items: analyzeData.data?.items?.length
      });
    } else {
      console.log('エラー:', analyzeData.error);
    }
    console.log('');
    
    // 3. 請求書作成テスト
    console.log('3. 請求書作成テスト');
    if (customersData.customers?.length > 0) {
      const testCustomer = customersData.customers[0];
      const invoiceData = {
        customerId: testCustomer._id,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [{
          description: 'テスト商品',
          quantity: 1,
          unitPrice: 10000,
          amount: 10000,
          taxRate: 0.1,
          taxAmount: 1000
        }],
        notes: 'テスト請求書',
        paymentMethod: 'bank_transfer'
      };
      
      const invoiceResponse = await fetch(`${BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      
      const invoiceResult = await invoiceResponse.json();
      console.log('ステータス:', invoiceResponse.status);
      if (invoiceResponse.ok) {
        console.log('作成された請求書:', {
          _id: invoiceResult._id,
          invoiceNumber: invoiceResult.invoiceNumber,
          totalAmount: invoiceResult.totalAmount
        });
      } else {
        console.log('エラー:', invoiceResult.error);
      }
    }
    
    console.log('\n=== テスト完了 ===');
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

// Node.jsでfetchを使用するための設定
if (!global.fetch) {
  global.fetch = fetch;
}

testInvoiceCreation();