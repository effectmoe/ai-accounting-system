"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
async function GET(request) {
    try {
        // 最新の10件の仕入先見積書を取得
        const quotes = await mongodb_client_1.db.find('supplierQuotes', {}, {
            sort: { createdAt: -1 },
            limit: 10
        });
        // fileIdの状態をチェック
        const fileIdInfo = quotes.map(quote => ({
            _id: quote._id?.toString(),
            quoteNumber: quote.quoteNumber,
            fileId: quote.fileId,
            fileIdType: typeof quote.fileId,
            fileIdValue: quote.fileId ? String(quote.fileId) : null,
            hasFileId: !!quote.fileId,
            ocrResultId: quote.ocrResultId?.toString(),
            createdAt: quote.createdAt
        }));
        return server_1.NextResponse.json({
            success: true,
            count: fileIdInfo.length,
            quotes: fileIdInfo,
            message: 'fileIdの状態をチェックしました'
        });
    }
    catch (error) {
        logger_1.logger.error('Error checking supplier quote files:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
