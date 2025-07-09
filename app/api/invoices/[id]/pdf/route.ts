import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import InvoicePDFTemplate from '@/components/invoice-pdf-template';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    
    // 請求書データを取得
    const invoice = await db.collection('invoices').findOne({
      _id: new ObjectId(params.id)
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // PDFを生成
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDFTemplate, {
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate.toISOString(),
          dueDate: invoice.dueDate.toISOString(),
          customerSnapshot: invoice.customerSnapshot,
          companySnapshot: invoice.companySnapshot,
          items: invoice.items,
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          paymentMethod: invoice.paymentMethod,
          notes: invoice.notes,
        }
      })
    );

    // PDFファイル名を生成
    const fileName = `請求書_${invoice.invoiceNumber}_${invoice.customerSnapshot.companyName}.pdf`;
    const encodedFileName = encodeURIComponent(fileName);

    // PDFレスポンスを返す
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}