"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const quote_service_1 = require("@/services/quote.service");
const company_info_service_1 = require("@/services/company-info.service");
const pdf_quote_html_generator_1 = require("@/lib/pdf-quote-html-generator");
const logger_1 = require("@/lib/logger");
async function GET(request, { params }) {
    try {
        // 見積書を取得
        const quoteService = new quote_service_1.QuoteService();
        const quote = await quoteService.getQuote(params.id);
        if (!quote) {
            return server_1.NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }
        // 会社情報を取得
        const companyInfoService = new company_info_service_1.CompanyInfoService();
        const companyInfo = await companyInfoService.getCompanyInfo();
        // HTMLを生成（コンパクト版を使用）
        logger_1.logger.debug('Generating compact quote HTML for:', quote.quoteNumber);
        const htmlContent = (0, pdf_quote_html_generator_1.generateCompactQuoteHTML)(quote, companyInfo);
        // 新しい命名規則でファイル名を生成: 発行日_帳表名_顧客名
        const filename = (0, pdf_quote_html_generator_1.generateQuoteFilename)(quote);
        const safeFilename = (0, pdf_quote_html_generator_1.generateSafeQuoteFilename)(quote);
        logger_1.logger.debug('Generated filename:', filename);
        logger_1.logger.debug('Safe filename for header:', safeFilename);
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
            return new server_1.NextResponse(printHtml, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
            });
        }
        // 通常モード：HTMLを返す
        return new server_1.NextResponse(htmlContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': isDownload
                    ? `attachment; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`
                    : `inline; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Quote PDF generation error:', error);
        logger_1.logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // 詳細なエラー情報を返す
        if (error instanceof Error) {
            return server_1.NextResponse.json({
                error: 'Failed to generate quote',
                message: error.message,
                type: error.constructor.name
            }, { status: 500 });
        }
        return server_1.NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
