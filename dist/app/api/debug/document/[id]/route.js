"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
async function GET(request, { params }) {
    try {
        const { id } = params;
        if (!id || !mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({
                error: 'Invalid document ID'
            }, { status: 400 });
        }
        // ドキュメントを取得（生のデータ）
        const document = await mongodb_client_1.db.findById('documents', id);
        if (!document) {
            return server_1.NextResponse.json({
                error: 'Document not found'
            }, { status: 404 });
        }
        // すべてのフィールドを表示
        return server_1.NextResponse.json({
            _id: document._id,
            allFields: Object.entries(document).map(([key, value]) => ({
                key,
                value: value?.toString ? value.toString() : value,
                type: typeof value
            })),
            rawDocument: document
        });
    }
    catch (error) {
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch document'
        }, { status: 500 });
    }
}
