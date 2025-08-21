import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { convertQuoteHTMLtoPDF } from '@/lib/quote-html-to-pdf-server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info(`[Quote Preview PDF] Starting PDF generation for quote ID: ${params.id}`);
    
    // 見積書を取得
    const quoteService = new QuoteService();
    const quote = await quoteService.getQuote(params.id);
    
    if (!quote) {
      logger.error(`[Quote Preview PDF] Quote not found: ${params.id}`);
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    logger.info(`[Quote Preview PDF] Found quote: ${quote.quoteNumber}`);
    
    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();
    
    logger.info('[Quote Preview PDF] Got company info, generating PDF...');
    
    // PDFを生成（メール送信時と同じ関数を使用）
    const pdfBuffer = await convertQuoteHTMLtoPDF(quote, companyInfo || {}, true);
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      logger.error('[Quote Preview PDF] PDF buffer is empty');
      return NextResponse.json(
        { error: 'PDF generation failed - empty buffer' },
        { status: 500 }
      );
    }
    
    // BufferまたはUint8Arrayを適切に処理
    const buffer = Buffer.isBuffer(pdfBuffer) 
      ? pdfBuffer 
      : Buffer.from(pdfBuffer);
    
    logger.info(`[Quote Preview PDF] PDF generated successfully, size: ${buffer.length} bytes`);
    logger.info(`[Quote Preview PDF] PDF header: ${buffer.slice(0, 5).toString('ascii')}`);
    
    // PDFヘッダーの検証
    if (!buffer.slice(0, 5).toString('ascii').startsWith('%PDF')) {
      logger.error('[Quote Preview PDF] Invalid PDF header');
      return NextResponse.json(
        { error: 'Generated file is not a valid PDF' },
        { status: 500 }
      );
    }
    
    // PDFファイル名を生成
    const issueDate = new Date(quote.issueDate).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '');
    
    const customerName = quote.customerSnapshot?.name || quote.customer?.name || '顧客名なし';
    const filename = `quote_${quote.quoteNumber}.pdf`;
    const encodedFilename = encodeURIComponent(filename);
    
    // NextResponseを使用してPDFを返す
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    logger.error('[Quote Preview PDF] Error:', error);
    logger.error('[Quote Preview PDF] Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError'
      },
      { status: 500 }
    );
  }
}