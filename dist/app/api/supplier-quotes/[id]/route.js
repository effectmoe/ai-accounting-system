"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supplier_quote_service_1 = require("@/services/supplier-quote.service");
const logger_1 = require("@/lib/logger");
// GET: 仕入先見積書詳細取得
async function GET(request, { params }) {
    try {
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        const quote = await supplierQuoteService.getSupplierQuote(params.id);
        if (!quote) {
            return server_1.NextResponse.json({ error: 'Supplier quote not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(quote);
    }
    catch (error) {
        logger_1.logger.error('Error in GET /api/supplier-quotes/[id]:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch supplier quote' }, { status: 500 });
    }
}
// PUT: 仕入先見積書更新
async function PUT(request, { params }) {
    try {
        const updateData = await request.json();
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        const quote = await supplierQuoteService.updateSupplierQuote(params.id, updateData);
        if (!quote) {
            return server_1.NextResponse.json({ error: 'Supplier quote not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(quote);
    }
    catch (error) {
        logger_1.logger.error('Error in PUT /api/supplier-quotes/[id]:', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update supplier quote' }, { status: 500 });
    }
}
// DELETE: 仕入先見積書削除
async function DELETE(request, { params }) {
    try {
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        const success = await supplierQuoteService.deleteSupplierQuote(params.id);
        if (!success) {
            return server_1.NextResponse.json({ error: 'Supplier quote not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error in DELETE /api/supplier-quotes/[id]:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete supplier quote' }, { status: 500 });
    }
}
