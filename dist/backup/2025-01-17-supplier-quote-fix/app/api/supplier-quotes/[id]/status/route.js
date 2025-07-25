"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
const server_1 = require("next/server");
const supplier_quote_service_1 = require("@/services/supplier-quote.service");
// PUT: 仕入先見積書ステータス更新
async function PUT(request, { params }) {
    try {
        const { status, statusDate } = await request.json();
        if (!status) {
            return server_1.NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        const quote = await supplierQuoteService.updateSupplierQuoteStatus(params.id, status, statusDate ? new Date(statusDate) : new Date());
        if (!quote) {
            return server_1.NextResponse.json({ error: 'Supplier quote not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(quote);
    }
    catch (error) {
        console.error('Error in PUT /api/supplier-quotes/[id]/status:', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update supplier quote status' }, { status: 500 });
    }
}
