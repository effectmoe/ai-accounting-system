"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const invoice_service_1 = require("@/services/invoice.service");
const company_info_service_1 = require("@/services/company-info.service");
const pdf_compact_generator_1 = require("@/lib/pdf-compact-generator");
const logger_1 = require("@/lib/logger");
async function GET(request, { params }) {
    try {
        // 請求書を取得
        const invoiceService = new invoice_service_1.InvoiceService();
        const invoice = await invoiceService.getInvoice(params.id);
        if (!invoice) {
            return server_1.NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }
        // 会社情報を取得
        const companyInfoService = new company_info_service_1.CompanyInfoService();
        const companyInfo = await companyInfoService.getCompanyInfo();
        // HTMLを生成（コンパクト版を使用）
        logger_1.logger.debug('Generating compact invoice HTML for:', invoice.invoiceNumber);
        const htmlContent = (0, pdf_compact_generator_1.generateCompactInvoiceHTML)(invoice, companyInfo);
        // 新しい命名規則でファイル名を生成: 請求日_帳表名_顧客名
        const filename = (0, pdf_compact_generator_1.generateInvoiceFilename)(invoice);
        const safeFilename = (0, pdf_compact_generator_1.generateSafeFilename)(invoice);
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
        logger_1.logger.error('Invoice PDF generation error:', error);
        logger_1.logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // 詳細なエラー情報を返す
        if (error instanceof Error) {
            return server_1.NextResponse.json({
                error: 'Failed to generate invoice',
                message: error.message,
                type: error.constructor.name
            }, { status: 500 });
        }
        return server_1.NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
