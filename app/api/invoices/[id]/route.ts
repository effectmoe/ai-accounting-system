import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { InvoiceStatus } from '@/types/collections';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceService = new InvoiceService();
    const invoice = await invoiceService.getInvoiceById(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const invoiceService = new InvoiceService();
    
    // ステータス更新の場合
    if (body.status && Object.keys(body).length === 1) {
      const invoice = await invoiceService.updateInvoiceStatus(params.id, body.status as InvoiceStatus);
      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(invoice);
    }
    
    // 支払い記録の場合
    if (body.paidAmount !== undefined && body.paymentDate) {
      const invoice = await invoiceService.recordPayment(
        params.id, 
        body.paidAmount,
        new Date(body.paymentDate)
      );
      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(invoice);
    }
    
    // 通常の更新
    const invoice = await invoiceService.updateInvoice(params.id, body);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceService = new InvoiceService();
    
    // キャンセル（論理削除）
    const invoice = await invoiceService.cancelInvoice(params.id);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invoice' },
      { status: 500 }
    );
  }
}