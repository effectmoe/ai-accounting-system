"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const quote_service_1 = require("@/services/quote.service");
async function POST(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        console.log('[POST /api/quotes/[id]/convert-to-invoice] Quote ID:', id);
        console.log('[POST /api/quotes/[id]/convert-to-invoice] Invoice data:', JSON.stringify(body, null, 2));
        const quoteService = new quote_service_1.QuoteService();
        // 見積書を請求書に変換
        const invoice = await quoteService.convertToInvoice(id, body);
        console.log('[POST /api/quotes/[id]/convert-to-invoice] Invoice created:', invoice._id);
        return server_1.NextResponse.json(invoice);
    }
    catch (error) {
        console.error('Error converting quote to invoice:', error);
        return server_1.NextResponse.json({
            error: 'Failed to convert quote to invoice',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
