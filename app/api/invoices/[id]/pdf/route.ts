import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { generateCompactInvoiceHTML, generateInvoiceFilename, generateSafeFilename } from '@/lib/pdf-compact-generator';
import { generateInvoicePDFWithPuppeteer } from '@/lib/pdf-puppeteer-generator';

import { logger } from '@/lib/logger';
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

    // URLクエリパラメータでダウンロードモードを判定
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') === 'true';
    const isPrintMode = url.searchParams.get('print') === 'true';
    const showDescriptions = url.searchParams.get('showDescriptions') !== 'false'; // デフォルトはtrue

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // 印刷モードまたはプレビューモード（HTMLを返す）
    if (isPrintMode || !isDownload) {
      // HTMLを生成（コンパクト版を使用）
      logger.debug('Generating compact invoice HTML for:', invoice.invoiceNumber);
      logger.debug('Show descriptions:', showDescriptions);
      const htmlContent = generateCompactInvoiceHTML(invoice, companyInfo, showDescriptions);
      
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
      
      // プレビューモード：HTMLを返す
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // ダウンロードモード：PDFを生成して返す
    logger.debug('Generating PDF for invoice:', invoice.invoiceNumber);
    logger.debug('Show descriptions:', showDescriptions);
    
    // PuppeteerでPDFを生成（プレビューと同じshowDescriptionsパラメータを使用）
    const pdfBuffer = await generateInvoicePDFWithPuppeteer(invoice, companyInfo, showDescriptions);
    
    // 新しい命名規則でファイル名を生成: 請求日_帳表名_顧客名
    const filename = generateInvoiceFilename(invoice);
    const safeFilename = generateSafeFilename(invoice);
    logger.debug('Generated filename:', filename);
    logger.debug('Safe filename for header:', safeFilename);
    
    // 日本語ファイル名をRFC 5987準拠でエンコード
    const encodedFilename = encodeURIComponent(filename);
    
    // PDFを返す
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    logger.error('Invoice PDF generation error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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