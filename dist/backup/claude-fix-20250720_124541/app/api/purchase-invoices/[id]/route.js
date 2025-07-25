"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const purchase_invoice_service_1 = require("@/services/purchase-invoice.service");
const logger_1 = require("@/lib/logger");
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// GET: 特定の仕入請求書を取得
async function GET(request, { params }) {
    try {
        const purchaseInvoiceService = new purchase_invoice_service_1.PurchaseInvoiceService();
        const invoice = await purchaseInvoiceService.getPurchaseInvoice(params.id);
        if (!invoice) {
            return server_1.NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(invoice);
    }
    catch (error) {
        logger_1.logger.error('Error in GET /api/purchase-invoices/[id]:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch purchase invoice' }, { status: 500 });
    }
}
// PUT: 仕入請求書を更新
async function PUT(request, { params }) {
    try {
        const invoiceData = await request.json();
        const purchaseInvoiceService = new purchase_invoice_service_1.PurchaseInvoiceService();
        logger_1.logger.debug('[Purchase Invoice PUT] Updating invoice:', params.id, JSON.stringify(invoiceData, null, 2));
        const invoice = await purchaseInvoiceService.updatePurchaseInvoice(params.id, invoiceData);
        if (!invoice) {
            return server_1.NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(invoice);
    }
    catch (error) {
        logger_1.logger.error('Error in PUT /api/purchase-invoices/[id]:', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update purchase invoice' }, { status: 500 });
    }
}
// DELETE: 仕入請求書を削除
async function DELETE(request, { params }) {
    try {
        const purchaseInvoiceService = new purchase_invoice_service_1.PurchaseInvoiceService();
        const deleted = await purchaseInvoiceService.deletePurchaseInvoice(params.id);
        if (!deleted) {
            return server_1.NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error in DELETE /api/purchase-invoices/[id]:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete purchase invoice' }, { status: 500 });
    }
}
