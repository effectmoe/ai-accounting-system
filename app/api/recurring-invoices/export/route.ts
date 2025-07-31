import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RecurringInvoice, RecurringInvoiceStatus, RecurringFrequency } from '@/types/recurring-invoice';

function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as RecurringInvoiceStatus | null;
    const frequency = searchParams.get('frequency') as RecurringFrequency | null;

    // フィルター条件の構築
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (frequency) {
      filter.frequency = frequency;
    }
    
    if (search) {
      filter.$or = [
        { recurringInvoiceNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    // 定期請求書の取得（顧客情報を含む）
    const recurringInvoices = await collection.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { recurringInvoiceNumber: -1 }
      }
    ]).toArray();

    // CSV ヘッダー
    const headers = [
      '請求書番号',
      'タイトル',
      '顧客名',
      '頻度',
      '月額',
      '総契約金額',
      '総回数',
      '完了回数',
      '残回数',
      '開始日',
      '終了日',
      '次回請求日',
      'ステータス',
      '自動生成',
      '自動送信',
      '作成日',
      '更新日'
    ];

    // CSV データの生成
    const rows = recurringInvoices.map(invoice => {
      const frequency = getFrequencyLabel(invoice.frequency);
      const status = getStatusLabel(invoice.status);
      
      return [
        escapeCSV(invoice.recurringInvoiceNumber),
        escapeCSV(invoice.title),
        escapeCSV(invoice.customer?.companyName),
        escapeCSV(frequency),
        escapeCSV(invoice.monthlyAmount),
        escapeCSV(invoice.totalContractAmount),
        escapeCSV(invoice.totalInstallments),
        escapeCSV(invoice.completedInstallments),
        escapeCSV(invoice.remainingInstallments),
        escapeCSV(formatDate(invoice.startDate)),
        escapeCSV(formatDate(invoice.endDate)),
        escapeCSV(formatDate(invoice.nextInvoiceDate)),
        escapeCSV(status),
        escapeCSV(invoice.autoGenerate ? 'はい' : 'いいえ'),
        escapeCSV(invoice.autoSend ? 'はい' : 'いいえ'),
        escapeCSV(formatDate(invoice.createdAt)),
        escapeCSV(formatDate(invoice.updatedAt))
      ];
    });

    // BOM付きUTF-8でCSVを生成
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // レスポンスの作成
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="recurring-invoices-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error exporting recurring invoices:', error);
    return NextResponse.json(
      { error: 'エクスポート中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

function getFrequencyLabel(frequency: RecurringFrequency): string {
  const labels = {
    monthly: '毎月',
    'bi-monthly': '隔月',
    quarterly: '四半期',
    'semi-annually': '半年',
    annually: '年次',
    custom: 'カスタム'
  };
  return labels[frequency] || frequency;
}

function getStatusLabel(status: RecurringInvoiceStatus): string {
  const labels = {
    active: '有効',
    paused: '一時停止',
    completed: '完了',
    cancelled: 'キャンセル'
  };
  return labels[status] || status;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}