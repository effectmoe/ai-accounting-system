"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supplier_quote_service_1 = require("@/services/supplier-quote.service");
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// GET: 仕入先見積書一覧取得
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const supplierId = searchParams.get('supplierId');
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const isGeneratedByAI = searchParams.get('isGeneratedByAI');
        const limit = searchParams.get('limit');
        const skip = searchParams.get('skip');
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        const searchParams_ = {
            supplierId: supplierId || undefined,
            status: status,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            isGeneratedByAI: isGeneratedByAI === 'true' ? true : isGeneratedByAI === 'false' ? false : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            skip: skip ? parseInt(skip, 10) : undefined,
        };
        const result = await supplierQuoteService.searchSupplierQuotes(searchParams_);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error('Error in GET /api/supplier-quotes:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch supplier quotes' }, { status: 500 });
    }
}
// POST: 仕入先見積書作成
async function POST(request) {
    try {
        const quoteData = await request.json();
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        // 見積書番号が指定されていない場合は自動生成
        if (!quoteData.quoteNumber) {
            quoteData.quoteNumber = await supplierQuoteService.generateSupplierQuoteNumber();
        }
        const quote = await supplierQuoteService.createSupplierQuote(quoteData);
        return server_1.NextResponse.json(quote, { status: 201 });
    }
    catch (error) {
        console.error('Error in POST /api/supplier-quotes:', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create supplier quote' }, { status: 500 });
    }
}
