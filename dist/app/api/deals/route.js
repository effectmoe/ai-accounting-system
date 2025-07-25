"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const deal_service_1 = require("@/services/deal.service");
const logger_1 = require("@/lib/logger");
// GET: 案件一覧取得
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const params = {
            status: searchParams.get('status'),
            dealType: searchParams.get('dealType'),
            customerId: searchParams.get('customerId') || undefined,
            search: searchParams.get('search') || undefined,
            page: searchParams.get('page') ? parseInt(searchParams.get('page')) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 20,
            sortBy: searchParams.get('sortBy') || 'startDate',
            sortOrder: (searchParams.get('sortOrder') || 'desc')
        };
        // 日付範囲のパラメータ
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (startDate && endDate) {
            params.dateRange = {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        }
        const result = await deal_service_1.DealService.getDeals(params);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error fetching deals:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }
}
// POST: 案件作成
async function POST(request) {
    try {
        const data = await request.json();
        // 必須フィールドのバリデーション
        if (!data.dealName || !data.customerId) {
            return server_1.NextResponse.json({ error: 'Deal name and customer ID are required' }, { status: 400 });
        }
        // デフォルト値の設定
        data.startDate = data.startDate || new Date();
        data.dealType = data.dealType || 'sale';
        const deal = await deal_service_1.DealService.createDeal(data);
        return server_1.NextResponse.json(deal, { status: 201 });
    }
    catch (error) {
        logger_1.logger.error('Error creating deal:', error);
        return server_1.NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
    }
}
