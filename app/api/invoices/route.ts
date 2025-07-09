import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { InvoiceStatus } from '@/types/collections';

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
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Invoice creation request:', JSON.stringify(body, null, 2));
    
    const invoiceService = new InvoiceService();
    
    // データの前処理：フロントエンドのdescriptionをitemNameに変換
    const processedItems = body.items.map((item: any) => ({
      ...item,
      itemName: item.description || item.itemName || '',
      description: item.description || '',
      totalAmount: item.amount + item.taxAmount,
      sortOrder: 0
    }));
    
    const invoiceData = {
      ...body,
      items: processedItems,
      invoiceDate: new Date(body.invoiceDate),
      dueDate: new Date(body.dueDate),
    };
    
    console.log('Processed invoice data:', JSON.stringify(invoiceData, null, 2));
    
    // AI会話からの作成の場合
    if (body.isGeneratedByAI && body.aiConversationId) {
      const invoice = await invoiceService.createInvoiceFromAIConversation({
        customerId: body.customerId,
        items: processedItems,
        dueDate: new Date(body.dueDate),
        aiConversationId: body.aiConversationId,
        notes: body.notes,
        paymentMethod: body.paymentMethod,
      });
      
      console.log('AI Invoice created:', invoice);
      return NextResponse.json(invoice);
    }
    
    // 通常の作成
    const invoice = await invoiceService.createInvoice(invoiceData);
    console.log('Invoice created:', invoice);
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    console.error('Error details:', {
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