import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import ReactPDF from '@react-pdf/renderer';
import { PDFDocument } from '@/src/lib/pdf-generator';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    
    // 請求書を取得
    const invoice = await db.findOne('invoices', { _id: new ObjectId(params.id) });
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // リレーションデータを取得
    if (invoice.customerId) {
      invoice.customer = await db.findOne('customers', { _id: new ObjectId(invoice.customerId) });
    }

    // PDFデータを準備
    const pdfData = {
      documentType: 'invoice' as const,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      partner: {
        name: invoice.customer?.companyName || invoice.customerName || '',
        address: invoice.customer?.address || '',
        phone: invoice.customer?.phone || '',
        email: invoice.customer?.email || ''
      },
      items: invoice.items.map((item: any) => ({
        name: item.itemName || item.description || '',
        description: item.itemName || item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0.1,
        amount: item.amount,
        taxAmount: item.taxAmount || Math.round(item.amount * (item.taxRate || 0.1))
      })),
      subtotal: invoice.subtotal,
      tax: invoice.taxAmount,
      taxAmount: invoice.taxAmount,
      total: invoice.totalAmount,
      totalAmount: invoice.totalAmount,
      notes: invoice.notes || '',
      paymentTerms: invoice.paymentTerms || '銀行振込',
      company: {
        name: invoice.companySnapshot?.companyName || '',
        address: invoice.companySnapshot?.address || '',
        phone: invoice.companySnapshot?.phone || '',
        email: invoice.companySnapshot?.email || '',
        registrationNumber: invoice.companySnapshot?.registrationNumber || '',
        bankAccount: invoice.companySnapshot?.bankAccount || '',
        sealImageUrl: invoice.companySnapshot?.sealImageUrl || invoice.companySnapshot?.stampImage || ''
      }
    };
    
    // 社印の存在を確認
    if (pdfData.company.sealImageUrl) {
      console.log('Company seal URL:', pdfData.company.sealImageUrl);
    }

    // PDFを生成
    try {
      // React PDFライブラリを使用してPDFを生成
      const pdfStream = await ReactPDF.renderToStream(
        React.createElement(PDFDocument, { data: pdfData })
      );
      
      // PDFバイナリを収集
      const chunks: Uint8Array[] = [];
      for await (const chunk of pdfStream) {
        chunks.push(chunk);
      }
      const pdfBuffer = Buffer.concat(chunks);
      
      // URLクエリパラメータでダウンロードモードを判定
      const url = new URL(request.url);
      const isDownload = url.searchParams.get('download') === 'true';
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': isDownload 
            ? `attachment; filename="${invoice.invoiceNumber}.pdf"`
            : `inline; filename="${invoice.invoiceNumber}.pdf"`,
        },
      });
    } catch (pdfError) {
      console.error('PDF generation failed, falling back to HTML:', pdfError);
      
      // PDF生成が失敗した場合はHTMLを返す（フォールバック）
      const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>請求書 ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: "Noto Sans JP", sans-serif; margin: 40px; position: relative; }
    h1 { text-align: center; margin-bottom: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .company-info { margin-bottom: 20px; position: relative; }
    .seal-area { position: absolute; right: 0; top: 0; }
    .seal-img { width: 80px; height: 80px; object-fit: contain; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    .amount { text-align: right; }
    .total-section { text-align: right; margin-top: 20px; }
    .total-row { font-size: 1.2em; font-weight: bold; }
  </style>
</head>
<body>
  <h1>請 求 書</h1>
  
  <div class="header">
    <div>
      <h2>${invoice.customerSnapshot.companyName} 御中</h2>
      <p>請求番号: ${invoice.invoiceNumber}</p>
      <p>請求日: ${new Date(invoice.invoiceDate).toLocaleDateString('ja-JP')}</p>
      <p>支払期限: ${new Date(invoice.dueDate).toLocaleDateString('ja-JP')}</p>
    </div>
    <div></div>
  </div>

  <div class="company-info">
    <p>${invoice.companySnapshot.companyName}</p>
    <p>${invoice.companySnapshot.address || ''}</p>
    <p>${invoice.companySnapshot.phone || ''}</p>
    ${pdfData.company.sealImageUrl ? `
    <div class="seal-area">
      <img src="${pdfData.company.sealImageUrl}" alt="社印" class="seal-img" />
    </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>品目</th>
        <th>数量</th>
        <th>単価</th>
        <th>金額</th>
        <th>消費税</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item: any) => `
        <tr>
          <td>${item.itemName || item.description || ''}</td>
          <td class="amount">${item.quantity}</td>
          <td class="amount">¥${item.unitPrice.toLocaleString()}</td>
          <td class="amount">¥${item.amount.toLocaleString()}</td>
          <td class="amount">¥${item.taxAmount.toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <p>小計: ¥${invoice.subtotal.toLocaleString()}</p>
    <p>消費税: ¥${invoice.taxAmount.toLocaleString()}</p>
    <p class="total-row">合計: ¥${invoice.totalAmount.toLocaleString()}</p>
  </div>

  ${invoice.notes ? `<p>備考: ${invoice.notes}</p>` : ''}
</body>
</html>
      `;
      
      const url = new URL(request.url);
      const isDownload = url.searchParams.get('download') === 'true';
      
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': isDownload 
            ? `attachment; filename="${invoice.invoiceNumber}.html"`
            : `inline; filename="${invoice.invoiceNumber}.html"`,
        },
      });
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';