"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.runtime = exports.dynamic = void 0;
exports.GET = GET;
exports.DELETE = DELETE;
exports.PUT = PUT;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
const mongodb_1 = require("mongodb");
exports.dynamic = 'force-dynamic';
async function GET(request, { params }) {
    try {
        const id = params.id;
        logger_1.logger.debug('===== Journal Detail API GET Request Start =====');
        logger_1.logger.debug('Journal ID:', id);
        logger_1.logger.debug('Environment check:', {
            NODE_ENV: process.env.NODE_ENV,
            MONGODB_URI_exists: !!process.env.MONGODB_URI,
            USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
            timestamp: new Date().toISOString()
        });
        // IDの検証
        if (!id) {
            return server_1.NextResponse.json({
                success: false,
                error: '仕訳IDが指定されていません'
            }, { status: 400 });
        }
        // ObjectIdの形式チェック
        let objectId;
        try {
            objectId = new mongodb_1.ObjectId(id);
        }
        catch (error) {
            logger_1.logger.error('Invalid ObjectId format:', id);
            return server_1.NextResponse.json({
                success: false,
                error: '無効な仕訳IDです'
            }, { status: 400 });
        }
        // 仕訳を取得
        logger_1.logger.debug('Fetching journal from database...');
        const journal = await mongodb_client_1.db.findOne('journals', { _id: objectId });
        if (!journal) {
            logger_1.logger.warn('Journal not found:', id);
            return server_1.NextResponse.json({
                success: false,
                error: '指定された仕訳が見つかりませんでした'
            }, { status: 404 });
        }
        logger_1.logger.debug('Journal fetched successfully:', {
            id: journal._id,
            journalNumber: journal.journalNumber,
            status: journal.status,
            linesCount: journal.lines?.length || 0
        });
        const response = {
            success: true,
            journal
        };
        logger_1.logger.debug('===== Journal Detail API GET Request End =====');
        return server_1.NextResponse.json(response);
    }
    catch (error) {
        logger_1.logger.error('===== Journal Detail API Error =====');
        logger_1.logger.error('Error object:', error);
        logger_1.logger.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: typeof error,
            constructor: error?.constructor?.name
        });
        // エラーメッセージの詳細化
        let errorMessage = '予期しないエラーが発生しました';
        if (error instanceof Error) {
            if (error.message.includes('MONGODB_URI')) {
                errorMessage = 'データベース接続設定が不足しています';
            }
            else if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'データベースに接続できません';
            }
            else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
                errorMessage = 'データベース接続がタイムアウトしました';
            }
            else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
                errorMessage = 'データベース認証に失敗しました';
            }
            else {
                errorMessage = error.message;
            }
        }
        return server_1.NextResponse.json({
            success: false,
            error: errorMessage,
            debug: process.env.NODE_ENV === 'development' ? {
                errorType: error?.constructor?.name,
                errorMessage: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            } : undefined
        }, { status: 500 });
    }
}
// DELETE メソッド（将来の実装用）
async function DELETE(request, { params }) {
    try {
        const id = params.id;
        logger_1.logger.debug('===== Journal Delete API Request Start =====');
        logger_1.logger.debug('Journal ID:', id);
        // ObjectIdの形式チェック
        let objectId;
        try {
            objectId = new mongodb_1.ObjectId(id);
        }
        catch (error) {
            return server_1.NextResponse.json({
                success: false,
                error: '無効な仕訳IDです'
            }, { status: 400 });
        }
        // 仕訳を削除
        const result = await mongodb_client_1.db.deleteOne('journals', { _id: objectId });
        if (result.deletedCount === 0) {
            return server_1.NextResponse.json({
                success: false,
                error: '指定された仕訳が見つかりませんでした'
            }, { status: 404 });
        }
        logger_1.logger.debug('Journal deleted successfully:', id);
        return server_1.NextResponse.json({
            success: true,
            message: '仕訳が正常に削除されました'
        });
    }
    catch (error) {
        logger_1.logger.error('Journal Delete Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '仕訳の削除に失敗しました'
        }, { status: 500 });
    }
}
// PUT メソッド（将来の実装用）
async function PUT(request, { params }) {
    try {
        const id = params.id;
        const body = await request.json();
        logger_1.logger.debug('===== Journal Update API Request Start =====');
        logger_1.logger.debug('Journal ID:', id);
        logger_1.logger.debug('Update data:', body);
        // ObjectIdの形式チェック
        let objectId;
        try {
            objectId = new mongodb_1.ObjectId(id);
        }
        catch (error) {
            return server_1.NextResponse.json({
                success: false,
                error: '無効な仕訳IDです'
            }, { status: 400 });
        }
        // 更新データから不要なフィールドを削除
        const { _id, ...updateData } = body;
        updateData.updatedAt = new Date();
        // 仕訳を更新
        const result = await mongodb_client_1.db.updateOne('journals', { _id: objectId }, { $set: updateData });
        if (result.matchedCount === 0) {
            return server_1.NextResponse.json({
                success: false,
                error: '指定された仕訳が見つかりませんでした'
            }, { status: 404 });
        }
        // 更新後の仕訳を取得
        const updatedJournal = await mongodb_client_1.db.findOne('journals', { _id: objectId });
        logger_1.logger.debug('Journal updated successfully:', id);
        return server_1.NextResponse.json({
            success: true,
            journal: updatedJournal
        });
    }
    catch (error) {
        logger_1.logger.error('Journal Update Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '仕訳の更新に失敗しました'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
exports.maxDuration = 30;
