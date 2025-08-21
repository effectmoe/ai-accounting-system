import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { generateCompactInvoiceHTML, generateInvoiceFilename, generateSafeFilename } from '@/lib/pdf-compact-generator';
import { generateInvoicePDFWithPuppeteer } from '@/lib/pdf-puppeteer-generator';
import { generateInvoicePDFWithJsPDF } from '@/lib/jspdf-invoice-generator';

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
    
    // PDFエンジンの選択（URLパラメータまたは自動）
    const engine = url.searchParams.get('engine') || 'auto';
    let pdfBuffer: Buffer;
    let usedEngine = engine;
    
    if (engine === 'jspdf') {
      // jsPDFを直接使用
      logger.debug('Using jsPDF engine directly');
      pdfBuffer = await generateInvoicePDFWithJsPDF(invoice, companyInfo, showDescriptions);
      usedEngine = 'jspdf';
    } else if (engine === 'puppeteer') {
      // Puppeteerを直接使用
      logger.debug('Using Puppeteer engine directly');
      pdfBuffer = await generateInvoicePDFWithPuppeteer(invoice, companyInfo, showDescriptions);
      usedEngine = 'puppeteer';
    } else {
      // 自動選択（Puppeteer → jsPDF フォールバック）
      logger.debug('Using auto engine selection (Puppeteer -> jsPDF fallback)');
      try {
        pdfBuffer = await generateInvoicePDFWithPuppeteer(invoice, companyInfo, showDescriptions);
        usedEngine = 'puppeteer';
        logger.debug('Successfully generated PDF with Puppeteer');
      } catch (puppeteerError) {
        logger.warn('Puppeteer PDF generation failed, falling back to jsPDF:', puppeteerError);
        try {
          pdfBuffer = await generateInvoicePDFWithJsPDF(invoice, companyInfo, showDescriptions);
          usedEngine = 'jspdf-fallback';
          logger.debug('Successfully generated PDF with jsPDF fallback');
        } catch (jsPDFError) {
          logger.error('Both Puppeteer and jsPDF failed:', { puppeteerError, jsPDFError });
          throw new Error('All PDF generation engines failed');
        }
      }
    }
    
    // 新しい命名規則でファイル名を生成: 請求日_帳表名_顧客名
    const filename = generateInvoiceFilename(invoice);
    const safeFilename = generateSafeFilename(invoice);
    logger.debug('Generated filename:', filename);
    logger.debug('Safe filename for header:', safeFilename);
    logger.debug('Used PDF engine:', usedEngine);
    
    // 日本語ファイル名をRFC 5987準拠でエンコード
    const encodedFilename = encodeURIComponent(filename);
    
    // PDFを返す
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        'X-PDF-Engine': usedEngine,
        'X-PDF-Size': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Invoice PDF generation error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    logger.error('Invoice ID:', params.id);
    logger.error('Invoice number:', invoice?.invoiceNumber || 'Unknown');
    
    // Vercel環境かどうかをログに出力
    logger.error('Environment info:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      isVercel: !!process.env.VERCEL,
    });
    
    // 詳細なエラー情報を返す
    if (error instanceof Error) {
      const errorInfo = {
        error: 'Failed to generate invoice PDF',
        message: error.message,
        type: error.constructor.name,
        invoiceId: params.id,
        invoiceNumber: invoice?.invoiceNumber || 'Unknown',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
      };
      
      // エラーがPuppeteer関連の場合、具体的な解決策をメッセージに含める
      if (error.message.includes('Chromium') || error.message.includes('puppeteer') || error.message.includes('Protocol error')) {
        errorInfo.message += ' - Try using ?engine=jspdf parameter for fallback PDF generation';
      }
      
      return NextResponse.json(errorInfo, { status: 500 });
    }
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred during PDF generation',
        timestamp: new Date().toISOString(),
        invoiceId: params.id,
      },
      { status: 500 }
    );
  }
}