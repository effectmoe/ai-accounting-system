import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { CustomerService } from '@/services/customer.service';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

// POST: テスト用のサンプル請求書を作成
export async function POST(request: NextRequest) {
  try {
    const invoiceService = new InvoiceService();
    const customerService = new CustomerService();
    
    // テスト用顧客を作成または取得
    let testCustomer;
    try {
      testCustomer = await customerService.createCustomer({
        companyName: 'テスト株式会社',
        companyNameKana: 'テストカブシキガイシャ',
        email: 'test@example.com',
        phone: '03-1234-5678',
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        address1: '千代田1-1-1',
        paymentTerms: 30,
        isActive: true
      });
    } catch (error) {
      // 既存の顧客を取得
      const customers = await customerService.searchCustomers({});
      testCustomer = customers.customers[0];
      if (!testCustomer) {
        throw new Error('テスト用顧客の作成に失敗しました');
      }
    }
    
    // 複数のステータスでサンプル請求書を作成
    const sampleInvoices = [
      {
        customerId: testCustomer._id,
        issueDate: new Date('2025-01-01'),
        dueDate: new Date('2025-01-31'),
        status: 'sent',
        items: [{
          itemName: 'Webサイト制作',
          description: 'コーポレートサイトの制作',
          quantity: 1,
          unitPrice: 500000,
          amount: 500000,
          taxRate: 0.1,
          taxAmount: 50000
        }],
        notes: 'テスト用請求書（送信済み）'
      },
      {
        customerId: testCustomer._id,
        issueDate: new Date('2025-01-15'),
        dueDate: new Date('2025-02-14'),
        status: 'paid',
        items: [{
          itemName: 'システム保守',
          description: '月次システム保守',
          quantity: 1,
          unitPrice: 100000,
          amount: 100000,
          taxRate: 0.1,
          taxAmount: 10000
        }],
        notes: 'テスト用請求書（支払済み）',
        paidDate: new Date('2025-01-20'),
        paidAmount: 110000
      },
      {
        customerId: testCustomer._id,
        issueDate: new Date('2025-01-20'),
        dueDate: new Date('2025-02-19'),
        status: 'draft',
        items: [{
          itemName: 'コンサルティング',
          description: 'IT戦略コンサルティング',
          quantity: 10,
          unitPrice: 50000,
          amount: 500000,
          taxRate: 0.1,
          taxAmount: 50000
        }],
        notes: 'テスト用請求書（下書き）'
      }
    ];
    
    const createdInvoices = [];
    
    for (const invoiceData of sampleInvoices) {
      // 合計金額を計算
      const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = invoiceData.items.reduce((sum, item) => sum + item.taxAmount, 0);
      const totalAmount = subtotal + taxAmount;
      
      // 請求書番号を生成
      const invoiceNumber = await invoiceService.generateInvoiceNumber();
      
      const invoice = await invoiceService.createInvoice({
        ...invoiceData,
        invoiceNumber,
        subtotal,
        taxAmount,
        totalAmount
      });
      
      createdInvoices.push(invoice);
    }
    
    logger.info(`Created ${createdInvoices.length} sample invoices`);
    
    return NextResponse.json({
      success: true,
      message: `${createdInvoices.length}件のサンプル請求書を作成しました`,
      invoices: createdInvoices.map(inv => ({
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalAmount: inv.totalAmount
      }))
    });
  } catch (error) {
    logger.error('Error creating sample invoices:', error);
    return NextResponse.json(
      { error: 'Failed to create sample invoices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}