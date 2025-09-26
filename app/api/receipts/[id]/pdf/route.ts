import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { generateCompactReceiptHTML, generateReceiptFilename, generateSafeReceiptFilename } from '@/lib/pdf-receipt-html-generator';

import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 領収書を取得
    const receiptService = new ReceiptService();
    const receipt = await receiptService.getReceipt(params.id);

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // URLクエリパラメータでダウンロードモードを判定
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') === 'true';
    const isPrintMode = url.searchParams.get('print') === 'true';
    const showDescriptions = url.searchParams.get('showDescriptions') !== 'false'; // デフォルトは表示

    // HTMLを生成（コンパクト版を使用）
    logger.debug('Generating compact receipt HTML for:', receipt.receiptNumber);
    logger.debug('Show descriptions:', showDescriptions);
    const htmlContent = generateCompactReceiptHTML(receipt, companyInfo, showDescriptions);

    // 新しい命名規則でファイル名を生成: 発行日_帳表名_顧客名
    const filename = generateReceiptFilename(receipt);
    const safeFilename = generateSafeReceiptFilename(receipt);
    logger.debug('Generated filename:', filename);
    logger.debug('Safe filename for header:', safeFilename);

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
    logger.error('Receipt PDF generation error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // 詳細なエラー情報を返す
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to generate receipt',
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