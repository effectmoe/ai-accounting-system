import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { generatePDFFromInvoiceData, generateInvoiceFilename } from '@/lib/pdf-jspdf-japanese';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 請求書を取得
    const invoiceService = new InvoiceService();
    const invoice = await invoiceService.getInvoice(params.id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // PDFを生成
    try {
      console.log('Attempting PDF generation with Japanese jsPDF for invoice:', invoice.invoiceNumber);
      
      // データの検証
      if (!invoice.customer && !invoice.customerSnapshot) {
        throw new Error('Customer information is missing');
      }
      if (!invoice.items || invoice.items.length === 0) {
        throw new Error('Invoice items are missing');
      }
      
      // 日本語対応jsPDFを使用してPDFを生成
      const pdfBuffer = await generatePDFFromInvoiceData(invoice, companyInfo);
      
      console.log('PDF generated successfully with Japanese jsPDF, buffer size:', pdfBuffer.length);
      
      // 新しい命名規則でファイル名を生成: 請求日_帳表名_顧客名
      const filename = generateInvoiceFilename(invoice);
      console.log('Generated filename:', filename);
      
      // URLクエリパラメータでダウンロードモードを判定
      const url = new URL(request.url);
      const isDownload = url.searchParams.get('download') === 'true';
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': isDownload 
            ? `attachment; filename="${filename}"`
            : `inline; filename="${filename}"`,
        },
      });
    } catch (pdfError) {
      console.error('PDF generation failed, falling back to HTML:', pdfError);
      console.error('PDF error details:', {
        message: pdfError instanceof Error ? pdfError.message : 'Unknown',
        stack: pdfError instanceof Error ? pdfError.stack : 'No stack',
        type: pdfError instanceof Error ? pdfError.constructor.name : 'Unknown type'
      });
      
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
      <h2>${invoice.customer?.companyName || invoice.customer?.name || '顧客名未設定'} 御中</h2>
      <p>請求番号: ${invoice.invoiceNumber}</p>
      <p>請求日: ${new Date(invoice.issueDate || invoice.invoiceDate).toLocaleDateString('ja-JP')}</p>
      <p>支払期限: ${new Date(invoice.dueDate).toLocaleDateString('ja-JP')}</p>
    </div>
    <div></div>
  </div>

  <div class="company-info">
    <p>${companyInfo?.companyName || '会社名未設定'}</p>
    <p>${companyInfo ? [
      companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
      companyInfo.prefecture || '',
      companyInfo.city || '',
      companyInfo.address1 || '',
      companyInfo.address2 || ''
    ].filter(Boolean).join(' ') : ''}</p>
    <p>${companyInfo?.phone ? `TEL: ${companyInfo.phone}` : ''}</p>
    ${companyInfo?.sealImageUrl ? `
    <div class="seal-area">
      <img src="${companyInfo.sealImageUrl}" alt="社印" class="seal-img" />
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
          <td class="amount">${item.quantity || 0}</td>
          <td class="amount">¥${(item.unitPrice || 0).toLocaleString()}</td>
          <td class="amount">¥${(item.amount || 0).toLocaleString()}</td>
          <td class="amount">¥${(item.taxAmount || 0).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <p>小計: ¥${(invoice.subtotal || 0).toLocaleString()}</p>
    <p>消費税: ¥${(invoice.taxAmount || 0).toLocaleString()}</p>
    <p class="total-row">合計: ¥${(invoice.totalAmount || 0).toLocaleString()}</p>
  </div>

  ${invoice.notes ? `<p>備考: ${invoice.notes}</p>` : ''}
</body>
</html>
      `;
      
      const url = new URL(request.url);
      const isDownload = url.searchParams.get('download') === 'true';
      
      // HTMLファイル名も新しい命名規則を使用
      const htmlFilename = generateInvoiceFilename(invoice).replace('.pdf', '.html');
      
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': isDownload 
            ? `attachment; filename="${htmlFilename}"`
            : `inline; filename="${htmlFilename}"`,
        },
      });
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 詳細なエラー情報を返す
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to generate PDF', 
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          type: error.name
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: 'Unknown error' },
      { status: 500 }
    );
  }
}

// jsPDFはランタイム設定不要