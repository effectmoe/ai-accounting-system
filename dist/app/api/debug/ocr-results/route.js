"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
async function GET(request) {
    try {
        // 最新のOCR結果を5件取得
        const ocrResults = await mongodb_client_1.db.find('ocrResults', {}, {
            limit: 5,
            sort: { createdAt: -1 }
        });
        // 各OCR結果の詳細を表示
        const formattedResults = ocrResults.map(result => ({
            _id: result._id,
            fileName: result.fileName,
            sourceFileId: result.sourceFileId,
            gridfsFileId: result.gridfsFileId,
            fileId: result.fileId,
            documentId: result.documentId,
            status: result.status,
            createdAt: result.createdAt,
            allKeys: Object.keys(result)
        }));
        return server_1.NextResponse.json({
            count: ocrResults.length,
            results: formattedResults,
            message: '最新のOCR結果を表示しています'
        });
    }
    catch (error) {
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch OCR results'
        }, { status: 500 });
    }
}
