"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const purchase_invoice_service_1 = require("@/services/purchase-invoice.service");
const logger_1 = require("@/lib/logger");
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// GET: 月次集計を取得
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const year = searchParams.get('year');
        const month = searchParams.get('month');
        if (!year || !month) {
            return server_1.NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
        }
        const purchaseInvoiceService = new purchase_invoice_service_1.PurchaseInvoiceService();
        const aggregation = await purchaseInvoiceService.getMonthlyAggregation(parseInt(year, 10), parseInt(month, 10));
        return server_1.NextResponse.json(aggregation);
    }
    catch (error) {
        logger_1.logger.error('Error in GET /api/purchase-invoices/monthly-aggregation:', error);
        return server_1.NextResponse.json({ error: 'Failed to get monthly aggregation' }, { status: 500 });
    }
}
