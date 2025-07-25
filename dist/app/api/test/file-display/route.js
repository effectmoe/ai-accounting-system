"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
async function GET(request) {
    try {
        // 最新のfileIdを持つ仕入先見積書を1件取得
        const quote = await mongodb_client_1.db.findOne('supplierQuotes', {
            fileId: { $exists: true, $ne: null }
        }, {
            sort: { createdAt: -1 }
        });
        if (!quote || !quote.fileId) {
            return server_1.NextResponse.json({
                success: false,
                message: 'fileIdを持つ仕入先見積書が見つかりません'
            });
        }
        return server_1.NextResponse.json({
            success: true,
            quoteId: quote._id?.toString(),
            quoteNumber: quote.quoteNumber,
            fileId: quote.fileId,
            fileIdType: typeof quote.fileId,
            fileIdString: String(quote.fileId),
            testUrls: {
                viewUrl: `/api/documents/${quote.fileId}/download`,
                directDownloadUrl: `/api/documents/${quote.fileId}/download?download=true`
            },
            createdAt: quote.createdAt
        });
    }
    catch (error) {
        logger_1.logger.error('Error in test file display:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
