"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const supplier_quote_service_1 = require("@/services/supplier-quote.service");
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// GET: 仕入先見積書月次集計
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month');
        if (!yearParam || !monthParam) {
            return server_1.NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
        }
        const year = parseInt(yearParam, 10);
        const month = parseInt(monthParam, 10);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return server_1.NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
        }
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        const aggregation = await supplierQuoteService.getMonthlyAggregation(year, month);
        return server_1.NextResponse.json(aggregation);
    }
    catch (error) {
        console.error('Error in GET /api/supplier-quotes/monthly-aggregation:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch monthly aggregation' }, { status: 500 });
    }
}
