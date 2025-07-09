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
    const invoiceService = new InvoiceService();
    
    // AI会話からの作成の場合
    if (body.isGeneratedByAI && body.aiConversationId) {
      const invoice = await invoiceService.createInvoiceFromAIConversation({
        customerId: body.customerId,
        items: body.items,
        dueDate: new Date(body.dueDate),
        aiConversationId: body.aiConversationId,
        notes: body.notes,
        paymentMethod: body.paymentMethod,
      });
      
      return NextResponse.json(invoice);
    }
    
    // 通常の作成
    const invoice = await invoiceService.createInvoice(body);
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}