"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
async function POST(request) {
    try {
        const body = await request.json();
        const { companyId, importJobs, notificationEmail } = body;
        if (!companyId || !importJobs || !Array.isArray(importJobs)) {
            return server_1.NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
        }
        // バッチインポートジョブを作成（MongoDB実装）
        const db = mongodb_client_1.DatabaseService.getInstance();
        const batch = await db.create(mongodb_client_1.Collections.IMPORT_BATCHES, {
            companyId: companyId,
            totalJobs: importJobs.length,
            completedJobs: 0,
            failedJobs: 0,
            status: 'in_progress',
        });
        return server_1.NextResponse.json({
            success: true,
            batchId: batch._id,
            message: 'バッチインポートを開始しました',
        });
    }
    catch (error) {
        console.error('Batch import error:', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'バッチインポートの開始に失敗しました' }, { status: 500 });
    }
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batchId');
        const companyId = searchParams.get('companyId');
        if (!batchId || !companyId) {
            return server_1.NextResponse.json({ error: 'batchIdとcompanyIdが必要です' }, { status: 400 });
        }
        // MongoDBからバッチ情報を取得
        const db = mongodb_client_1.DatabaseService.getInstance();
        const batch = await db.findById(mongodb_client_1.Collections.IMPORT_BATCHES, batchId);
        if (!batch || batch.companyId !== companyId) {
            return server_1.NextResponse.json({ error: 'バッチが見つかりません' }, { status: 404 });
        }
        const jobs = await db.findMany(mongodb_client_1.Collections.IMPORT_BATCHES, {
            batchId: batchId
        }).sort({ createdAt: 1 }).toArray();
        return server_1.NextResponse.json({
            batch,
            jobs: jobs || [],
        });
    }
    catch (error) {
        console.error('Get batch import status error:', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'バッチ情報の取得に失敗しました' }, { status: 500 });
    }
}
