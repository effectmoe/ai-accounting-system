import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { RecurringInvoice } from '@/types/recurring-invoice';

// 定期請求書の仕訳データを生成するAPI
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid recurring invoice ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    const recurringInvoice = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!recurringInvoice) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    // 仕訳データを生成
    const journalEntries = generateJournalEntries(recurringInvoice);

    return NextResponse.json({
      recurringInvoice,
      journalEntries
    });
  } catch (error) {
    console.error('Error generating journal entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateJournalEntries(invoice: RecurringInvoice) {
  const entries = [];
  
  // 基本の売上仕訳
  if (invoice.paymentMethod === 'credit_card' && invoice.paymentService) {
    // クレジットカード決済の場合：手数料を考慮した仕訳
    const processingFeePer = Math.round(
      invoice.monthlyAmount * (invoice.processingFeeRate || 0) + 
      (invoice.processingFeeFixed || 0)
    );
    const netAmount = invoice.monthlyAmount - processingFeePer;
    
    entries.push({
      description: `定期請求 - ${invoice.title} (${getPaymentServiceLabel(invoice.paymentService)})`,
      entries: [
        {
          account: getPaymentServiceAccount(invoice.paymentService), // Square売掛金 or PayPal売掛金
          debit: netAmount, // 手数料差引後の金額
          credit: 0
        },
        {
          account: '支払手数料', // 決済手数料
          debit: processingFeePer,
          credit: 0
        },
        {
          account: '売上高', // 売上
          debit: 0,
          credit: invoice.monthlyAmount // 総請求金額
        }
      ],
      paymentMethod: invoice.paymentMethod,
      paymentService: invoice.paymentService,
      processingFee: processingFeePer,
      netAmount: netAmount,
      totalAmount: invoice.monthlyAmount
    });
  } else {
    // 銀行振込等の場合：通常の仕訳
    entries.push({
      description: `定期請求 - ${invoice.title}`,
      entries: [
        {
          account: getAccountForPaymentMethod(invoice.paymentMethod),
          debit: invoice.monthlyAmount,
          credit: 0
        },
        {
          account: '売上高',
          debit: 0,
          credit: invoice.monthlyAmount
        }
      ],
      paymentMethod: invoice.paymentMethod,
      totalAmount: invoice.monthlyAmount
    });
  }

  return entries;
}

function getPaymentServiceLabel(service: string): string {
  switch (service) {
    case 'square': return 'Square';
    case 'paypal': return 'PayPal';
    default: return service;
  }
}

function getPaymentServiceAccount(service: string): string {
  switch (service) {
    case 'square': return 'Square売掛金';
    case 'paypal': return 'PayPal売掛金';
    default: return '売掛金';
  }
}

function getAccountForPaymentMethod(paymentMethod?: string): string {
  switch (paymentMethod) {
    case 'bank_transfer': return '売掛金';
    case 'cash': return '現金';
    case 'credit_card': return '売掛金';
    case 'invoice': return '売掛金';
    default: return '売掛金';
  }
}