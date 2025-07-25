"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
exports.POST = POST;
const server_1 = require("next/server");
const deal_service_1 = require("@/services/deal.service");
const logger_1 = require("@/lib/logger");
// GET: 案件詳細取得
async function GET(request, { params }) {
    try {
        const deal = await deal_service_1.DealService.getDealById(params.id);
        return server_1.NextResponse.json(deal);
    }
    catch (error) {
        logger_1.logger.error('Error fetching deal:', error);
        if (error.message === 'Deal not found') {
            return server_1.NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
    }
}
// PUT: 案件更新
async function PUT(request, { params }) {
    try {
        const data = await request.json();
        // _idフィールドを除外
        const { _id, id, ...updateData } = data;
        const deal = await deal_service_1.DealService.updateDeal(params.id, updateData);
        return server_1.NextResponse.json(deal);
    }
    catch (error) {
        logger_1.logger.error('Error updating deal:', error);
        if (error.message === 'Deal not found') {
            return server_1.NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
    }
}
// DELETE: 案件削除
async function DELETE(request, { params }) {
    try {
        const result = await deal_service_1.DealService.deleteDeal(params.id);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error deleting deal:', error);
        if (error.message === 'Deal not found') {
            return server_1.NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
    }
}
// POST: 案件アクティビティ追加
async function POST(request, { params }) {
    try {
        const { action, ...data } = await request.json();
        if (action === 'add-activity') {
            const result = await deal_service_1.DealService.addActivity(params.id, data);
            return server_1.NextResponse.json(result);
        }
        return server_1.NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    catch (error) {
        logger_1.logger.error('Error processing deal action:', error);
        if (error.message === 'Deal not found') {
            return server_1.NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: 'Failed to process deal action' }, { status: 500 });
    }
}
