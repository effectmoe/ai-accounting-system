"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const supplier_quote_service_1 = require("@/services/supplier-quote.service");
const logger_1 = require("@/lib/logger");
// POST: 仕入先見積書番号生成
async function POST(request) {
    try {
        const supplierQuoteService = new supplier_quote_service_1.SupplierQuoteService();
        const quoteNumber = await supplierQuoteService.generateSupplierQuoteNumber();
        return server_1.NextResponse.json({ quoteNumber });
    }
    catch (error) {
        logger_1.logger.error('Error in POST /api/supplier-quotes/generate-number:', error);
        return server_1.NextResponse.json({ error: 'Failed to generate supplier quote number' }, { status: 500 });
    }
}
