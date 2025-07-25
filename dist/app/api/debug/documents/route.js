"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
async function GET(request) {
    try {
        // 最新のドキュメントを5件取得
        const documents = await mongodb_client_1.db.find('documents', {}, {
            limit: 5,
            sort: { createdAt: -1 }
        });
        // 各ドキュメントの詳細を表示
        const formattedDocs = documents.map(doc => ({
            _id: doc._id,
            documentType: doc.documentType,
            vendorName: doc.vendorName,
            sourceFileId: doc.sourceFileId,
            gridfsFileId: doc.gridfsFileId,
            fileId: doc.fileId,
            ocrResultId: doc.ocrResultId,
            createdAt: doc.createdAt,
            allKeys: Object.keys(doc)
        }));
        return server_1.NextResponse.json({
            count: documents.length,
            documents: formattedDocs,
            message: '最新のドキュメントを表示しています'
        });
    }
    catch (error) {
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch documents'
        }, { status: 500 });
    }
}
