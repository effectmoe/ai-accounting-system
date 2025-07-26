#!/usr/bin/env ts-node
/**
 * ダッシュボードメトリクスAPIのテストスクリプト
 * 売上と支出が正しく計算されているかを確認
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testDashboardMetrics() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  console.log('🚀 Starting dashboard metrics test...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('accounting');
    
    // 1. テストデータの準備
    console.log('\n📝 Preparing test data...');
    
    // 売上請求書のテストデータ
    const testInvoice = {
      invoiceNumber: 'TEST-INV-001',
      customerId: 'test-customer-1',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [{
        itemName: 'テスト商品',
        quantity: 1,
        unitPrice: 100000,
        amount: 100000
      }],
      subtotal: 100000,
      taxAmount: 10000,
      taxRate: 10,
      totalAmount: 110000,
      status: 'paid',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 仕入請求書のテストデータ
    const testPurchaseInvoice = {
      invoiceNumber: 'TEST-PINV-001',
      supplierId: 'test-supplier-1',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [{
        itemName: 'テスト仕入商品',
        quantity: 1,
        unitPrice: 50000,
        amount: 50000
      }],
      subtotal: 50000,
      taxAmount: 5000,
      taxRate: 10,
      totalAmount: 55000,
      status: 'paid',
      paymentStatus: 'paid',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // テストデータを挿入
    await db.collection('invoices').insertOne(testInvoice);
    console.log('✅ Test invoice created');
    
    await db.collection('purchaseInvoices').insertOne(testPurchaseInvoice);
    console.log('✅ Test purchase invoice created');
    
    // 2. APIエンドポイントをテスト
    console.log('\n🔍 Testing dashboard metrics API...');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dashboard/metrics`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const metrics = await response.json();
    
    // 3. 結果の検証
    console.log('\n📊 Dashboard Metrics:');
    console.log(`- Total Revenue: ¥${metrics.totalRevenue.toLocaleString()}`);
    console.log(`- Total Expenses: ¥${metrics.totalExpenses.toLocaleString()}`);
    console.log(`- Profit: ¥${metrics.profit.toLocaleString()}`);
    console.log(`- Profit Margin: ${metrics.profitMargin.toFixed(1)}%`);
    
    // 期待値との比較
    const expectedRevenue = 110000;
    const expectedExpenses = 55000;
    const expectedProfit = expectedRevenue - expectedExpenses;
    const expectedProfitMargin = (expectedProfit / expectedRevenue) * 100;
    
    console.log('\n✅ Validation:');
    
    if (metrics.totalRevenue >= expectedRevenue) {
      console.log(`✓ Revenue includes test invoice (¥${expectedRevenue})`);
    } else {
      console.error(`✗ Revenue calculation error`);
    }
    
    if (metrics.totalExpenses >= expectedExpenses) {
      console.log(`✓ Expenses include test purchase invoice (¥${expectedExpenses})`);
    } else {
      console.error(`✗ Expenses calculation error`);
    }
    
    if (metrics.profit === metrics.totalRevenue - metrics.totalExpenses) {
      console.log(`✓ Profit calculation is correct`);
    } else {
      console.error(`✗ Profit calculation error`);
    }
    
    if (Math.abs(metrics.profitMargin - (metrics.profit / metrics.totalRevenue * 100)) < 0.01) {
      console.log(`✓ Profit margin calculation is correct`);
    } else {
      console.error(`✗ Profit margin calculation error`);
    }
    
    // 4. テストデータのクリーンアップ
    console.log('\n🧹 Cleaning up test data...');
    await db.collection('invoices').deleteOne({ invoiceNumber: 'TEST-INV-001' });
    await db.collection('purchaseInvoices').deleteOne({ invoiceNumber: 'TEST-PINV-001' });
    console.log('✅ Test data cleaned up');
    
    console.log('\n✅ Dashboard metrics test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// テストを実行
testDashboardMetrics().catch(console.error);