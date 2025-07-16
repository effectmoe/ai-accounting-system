import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { generateCompactInvoiceHTML, generateInvoiceFilename, generateSafeFilename } from '@/lib/pdf-compact-generator';

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

    // HTMLを生成（コンパクト版を使用）
    console.log('Generating compact invoice HTML for:', invoice.invoiceNumber);
    const htmlContent = generateCompactInvoiceHTML(invoice, companyInfo);
    
    // 新しい命名規則でファイル名を生成: 請求日_帳表名_顧客名
    const filename = generateInvoiceFilename(invoice);
    const safeFilename = generateSafeFilename(invoice);
    console.log('Generated filename:', filename);
    console.log('Safe filename for header:', safeFilename);
    
    // URLクエリパラメータでダウンロードモードを判定
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') === 'true';
    const isPrintMode = url.searchParams.get('print') === 'true';
    
    // 日本語ファイル名をRFC 5987準拠でエンコード
    const encodedFilename = encodeURIComponent(filename);
    
    // HTMLを返し、ブラウザの印刷機能を使ってPDFに変換
    if (isPrintMode) {
      // 印刷モード：自動的に印刷ダイアログを開くHTMLを返す
      const printHtml = `
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      `;
      
      return new NextResponse(printHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
    
    // 通常モード：HTMLを返す
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': isDownload 
          ? `attachment; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`
          : `inline; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`,
      },
    });
  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 詳細なエラー情報を返す
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to generate invoice', 
          message: error.message,
          type: error.constructor.name
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}