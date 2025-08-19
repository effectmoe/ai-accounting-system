import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { logger } from '@/lib/logger';
import { generateReceiptHTML, generateReceiptFilename, generateSafeReceiptFilename } from '@/lib/receipt-html-generator';

const receiptService = new ReceiptService();

/**
 * GET /api/receipts/[id]/pdf - 領収書のPDFを生成（見積書と同じ方式）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    
    // 通常モード：HTMLを返す（見積書と同じ方式）
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
    logger.error('Error generating receipt PDF:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}