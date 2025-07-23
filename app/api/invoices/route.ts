import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { InvoiceStatus } from '@/types/collections';
import { ActivityLogService } from '@/services/activity-log.service';
import { logger } from '@/lib/logger';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const invoiceService = new InvoiceService();
    
    // クエリパラメータの取得
    const customerId = searchParams.get('customerId') || undefined;
    const status = searchParams.get('status') as InvoiceStatus | undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const isGeneratedByAI = searchParams.get('isGeneratedByAI') === 'true' ? true : undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const result = await invoiceService.searchInvoices({
      customerId,
      status,
      dateFrom,
      dateTo,
      isGeneratedByAI,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.debug('Invoice creation request:', JSON.stringify(body, null, 2));
    
    const invoiceService = new InvoiceService();
    
    // データの前処理：フロントエンドのdescriptionをitemNameに変換
    const processedItems = body.items.map((item: any) => ({
      ...item,
      itemName: item.description || item.itemName || '',
      description: item.description || '',
      totalAmount: item.amount + item.taxAmount,
      sortOrder: 0
    }));
    
    // 請求書番号を生成（body.invoiceNumberが指定されていない場合）
    const invoiceNumber = body.invoiceNumber || await invoiceService.generateInvoiceNumber();
    
    // invoiceDateを除外してinvoiceDataを作成
    const { invoiceDate, ...restBody } = body;
    
    const invoiceData = {
      ...restBody,
      invoiceNumber,
      items: processedItems,
      issueDate: new Date(invoiceDate), // フロントエンドのinvoiceDateをissueDateに変換
      dueDate: new Date(body.dueDate),
      status: body.status || 'unpaid', // デフォルトステータスを設定
      subtotal: 0, // 後で計算
      taxAmount: 0, // 後で計算
      totalAmount: 0, // 後で計算
    };
    
    // 合計金額を計算
    let subtotal = 0;
    let taxAmount = 0;
    
    processedItems.forEach((item: any) => {
      subtotal += item.amount || 0;
      taxAmount += item.taxAmount || 0;
    });
    
    invoiceData.subtotal = subtotal;
    invoiceData.taxAmount = taxAmount;
    invoiceData.totalAmount = subtotal + taxAmount;
    
    logger.debug('Processed invoice data:', JSON.stringify(invoiceData, null, 2));
    
    // AI会話からの作成の場合も含めて、追加のデータをセット
    if (body.isGeneratedByAI && body.aiConversationId) {
      invoiceData.isGeneratedByAI = true;
      invoiceData.aiConversationId = body.aiConversationId;
    }
    
    // 請求書を作成
    const invoice = await invoiceService.createInvoice(invoiceData);
    logger.debug('Invoice created:', invoice);
    
    // アクティビティログを記録
    try {
      const customerName = invoice.customer?.companyName || '不明な顧客';
      await ActivityLogService.logInvoiceCreated(
        invoice._id.toString(),
        customerName,
        invoice.totalAmount
      );
      logger.info('Activity log recorded for invoice creation');
    } catch (logError) {
      logger.error('Failed to log activity for invoice creation:', logError);
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    logger.error('Error creating invoice:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to create invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}