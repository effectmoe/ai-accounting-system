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
    console.log('PUT /api/invoices/[id] - params:', params);
    const body = await request.json();
    console.log('PUT /api/invoices/[id] - body:', body);
    
    const invoiceService = new InvoiceService();
    
    // ステータス更新の場合
    if (body.status && Object.keys(body).length === 1) {
      console.log('Updating invoice status:', params.id, body.status);
      const invoice = await invoiceService.updateInvoiceStatus(params.id, body.status as InvoiceStatus);
      if (!invoice) {
        console.log('Invoice not found for status update:', params.id);
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
      console.log('Invoice status updated successfully');
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to update invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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