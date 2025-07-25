"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const purchase_invoice_service_1 = require("@/services/purchase-invoice.service");
const logger_1 = require("@/lib/logger");
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// GET: 仕入請求書番号を生成
async function GET(request) {
    try {
        const purchaseInvoiceService = new purchase_invoice_service_1.PurchaseInvoiceService();
        const invoiceNumber = await purchaseInvoiceService.generatePurchaseInvoiceNumber();
        return server_1.NextResponse.json({ invoiceNumber });
    }
    catch (error) {
        logger_1.logger.error('Error in GET /api/purchase-invoices/generate-number:', error);
        return server_1.NextResponse.json({ error: 'Failed to generate purchase invoice number' }, { status: 500 });
    }
}
