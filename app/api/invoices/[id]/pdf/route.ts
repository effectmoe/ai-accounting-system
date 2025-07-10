import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

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

    // 一時的なプレースホルダーHTMLを生成
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>請求書 ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: "Noto Sans JP", sans-serif; margin: 40px; }
    h1 { text-align: center; margin-bottom: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .company-info { margin-bottom: 20px; }
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
      <p>${invoice.customerSnapshot.address || ''}</p>
      <p>${invoice.customerSnapshot.phone || ''}</p>
    </div>
    <div>
      <p>請求書番号: ${invoice.invoiceNumber}</p>
      <p>請求日: ${new Date(invoice.invoiceDate).toLocaleDateString('ja-JP')}</p>
      <p>支払期限: ${new Date(invoice.dueDate).toLocaleDateString('ja-JP')}</p>
    </div>
  </div>

  <div class="company-info">
    <p>${invoice.companySnapshot.companyName}</p>
    <p>${invoice.companySnapshot.address || ''}</p>
    <p>${invoice.companySnapshot.phone || ''}</p>
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

    // HTMLをPDF代わりに返す（一時的な対応）
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.html"`,
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