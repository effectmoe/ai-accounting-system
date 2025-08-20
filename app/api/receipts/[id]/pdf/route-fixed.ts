import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { logger } from '@/lib/logger';
import { generateReceiptHTML, generateReceiptFilename, generateSafeReceiptFilename } from '@/lib/receipt-html-generator';
import { 
  generateReceiptPDFWithPuppeteer, 
  generateReceiptPDFWithJsPDF,
  generateReceiptPDFWithAutoFallback 
} from '@/lib/pdf-receipt-puppeteer-generator-fixed';

const receiptService = new ReceiptService();

/**
 * GET /api/receipts/[id]/pdf - 領収書のPDFを生成（改善版）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    logger.debug('Starting receipt PDF generation for ID:', params.id);
    
    // 領収書を取得
    const receipt = await receiptService.getReceipt(params.id);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // URLクエリパラメータでモードを判定
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') === 'true';
    const isPrintMode = url.searchParams.get('print') === 'true';
    const format = url.searchParams.get('format') || 'pdf'; // pdf or html
    const engine = url.searchParams.get('engine') || 'auto'; // puppeteer, jspdf, auto
    
    // HTMLを生成
    logger.debug('Generating receipt HTML for:', receipt.receiptNumber);
    const htmlContent = generateReceiptHTML(receipt);
    
    // ファイル名を生成
    const filename = generateReceiptFilename(receipt);
    const safeFilename = generateSafeReceiptFilename(receipt);
    logger.debug('Generated filename:', filename);
    logger.debug('Safe filename for header:', safeFilename);
    
    // 日本語ファイル名をRFC 5987準拠でエンコード
    const encodedFilename = encodeURIComponent(filename);
    
    // 印刷モード：自動的に印刷ダイアログを開くHTMLを返す
    if (isPrintMode) {
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
    
    // PDF生成モード
    if (format === 'pdf') {
      try {
        let pdfBuffer: Buffer;
        
        // エンジン選択に基づいてPDF生成
        switch (engine) {
          case 'jspdf':
            logger.debug('Using jsPDF engine for PDF generation');
            pdfBuffer = await generateReceiptPDFWithJsPDF(receipt);
            break;
          case 'puppeteer':
            logger.debug('Using Puppeteer engine for PDF generation');
            pdfBuffer = await generateReceiptPDFWithPuppeteer(receipt);
            break;
          case 'auto':
          default:
            logger.debug('Using auto-fallback PDF generation');
            pdfBuffer = await generateReceiptPDFWithAutoFallback(receipt);
            break;
        }
        
        const processingTime = Date.now() - startTime;
        logger.debug(`PDF generation completed in ${processingTime}ms, size: ${pdfBuffer.length} bytes`);
        
        // PDFを返す
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': isDownload 
              ? `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
              : `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
            'Content-Length': pdfBuffer.length.toString(),
            'X-Processing-Time': processingTime.toString(),
            'Cache-Control': 'private, max-age=300', // 5分間キャッシュ
          },
        });
      } catch (pdfError) {
        const processingTime = Date.now() - startTime;
        logger.error('PDF generation failed, falling back to HTML:', {
          error: pdfError instanceof Error ? pdfError.message : 'Unknown error',
          processingTime,
          receiptId: params.id,
          engine
        });
        
        // PDF生成に失敗した場合、HTMLでフォールバック
        return new NextResponse(htmlContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': isDownload 
              ? `attachment; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`
              : `inline; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`,
            'X-Fallback': 'true',
            'X-Error': pdfError instanceof Error ? pdfError.message : 'Unknown error',
          },
        });
      }
    }
    
    // HTMLモード（デフォルト）
    const processingTime = Date.now() - startTime;
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': isDownload 
          ? `attachment; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`
          : `inline; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`,
        'X-Processing-Time': processingTime.toString(),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error generating receipt PDF:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      receiptId: params.id,
      processingTime
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTime 
      },
      { status: 500 }
    );
  }
}