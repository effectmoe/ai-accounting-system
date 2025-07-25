"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const purchase_invoice_service_1 = require("@/services/purchase-invoice.service");
const logger_1 = require("@/lib/logger");
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// PATCH: 仕入請求書のステータスを更新
async function PATCH(request, { params }) {
    try {
        const { status } = await request.json();
        if (!status) {
            return server_1.NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }
        const purchaseInvoiceService = new purchase_invoice_service_1.PurchaseInvoiceService();
        const invoice = await purchaseInvoiceService.updateStatus(params.id, status);
        if (!invoice) {
            return server_1.NextResponse.json({ error: 'Purchase invoice not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(invoice);
    }
    catch (error) {
        logger_1.logger.error('Error in PATCH /api/purchase-invoices/[id]/status:', error);
        return server_1.NextResponse.json({ error: 'Failed to update purchase invoice status' }, { status: 500 });
    }
}
