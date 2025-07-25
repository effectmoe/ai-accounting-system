"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const quote_service_1 = require("@/services/quote.service");
const company_info_service_1 = require("@/services/company-info.service");
async function GET(request, { params }) {
    try {
        const { id } = params;
        console.log('[GET /api/quotes/[id]] Quote ID:', id);
        const quoteService = new quote_service_1.QuoteService();
        const quote = await quoteService.getQuote(id);
        if (!quote) {
            return server_1.NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }
        // 会社情報を取得してcompanySnapshotを追加
        const companyInfoService = new company_info_service_1.CompanyInfoService();
        const companyInfo = await companyInfoService.getCompanyInfo();
        const quoteWithCompanySnapshot = {
            ...quote,
            status: quote.status, // ステータスを明示的に含める
            companySnapshot: {
                companyName: companyInfo?.companyName || '会社名未設定',
                address: companyInfo ? [
                    companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
                    companyInfo.prefecture || '',
                    companyInfo.city || '',
                    companyInfo.address1 || '',
                    companyInfo.address2 || ''
                ].filter(Boolean).join(' ') : '',
                phone: companyInfo?.phone,
                email: companyInfo?.email,
                invoiceRegistrationNumber: companyInfo?.registrationNumber || '',
                stampImage: companyInfo?.sealUrl
            }
        };
        return server_1.NextResponse.json(quoteWithCompanySnapshot);
    }
    catch (error) {
        console.error('Error fetching quote:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
    }
}
async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        console.log('[PUT /api/quotes/[id]] Quote ID:', id);
        console.log('[PUT /api/quotes/[id]] Update data:', JSON.stringify(body, null, 2));
        const quoteService = new quote_service_1.QuoteService();
        // データの前処理：フロントエンドのdescriptionをitemNameに変換
        if (body.items) {
            body.items = body.items.map((item) => ({
                ...item,
                itemName: item.description || item.itemName || '',
                description: item.description || '',
            }));
        }
        // quoteDateの変換
        if (body.quoteDate) {
            body.issueDate = new Date(body.quoteDate);
            delete body.quoteDate;
        }
        // validityDateの変換
        if (body.validityDate) {
            body.validityDate = new Date(body.validityDate);
        }
        // 合計金額を再計算
        if (body.items) {
            let subtotal = 0;
            let taxAmount = 0;
            body.items.forEach((item) => {
                subtotal += item.amount || 0;
                taxAmount += item.taxAmount || 0;
            });
            body.subtotal = subtotal;
            body.taxAmount = taxAmount;
            body.totalAmount = subtotal + taxAmount;
        }
        const updatedQuote = await quoteService.updateQuote(id, body);
        if (!updatedQuote) {
            return server_1.NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(updatedQuote);
    }
    catch (error) {
        console.error('Error updating quote:', error);
        return server_1.NextResponse.json({
            error: 'Failed to update quote',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function DELETE(request, { params }) {
    try {
        const { id } = params;
        console.log('[DELETE /api/quotes/[id]] Quote ID:', id);
        const quoteService = new quote_service_1.QuoteService();
        const deleted = await quoteService.deleteQuote(id);
        if (!deleted) {
            return server_1.NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting quote:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
    }
}
