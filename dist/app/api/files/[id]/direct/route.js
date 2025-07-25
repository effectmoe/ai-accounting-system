"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.runtime = void 0;
exports.GET = GET;
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
// Node.js Runtimeを使用（GridFSアクセスに必要）
exports.runtime = 'nodejs';
exports.maxDuration = 60; // 60秒のタイムアウト
async function GET(request, { params }) {
    try {
        const fileId = params.id;
        logger_1.logger.debug('Direct file API called with ID:', fileId);
        if (!fileId || !mongodb_1.ObjectId.isValid(fileId)) {
            return new Response('Invalid file ID', { status: 400 });
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const bucket = new mongodb_1.GridFSBucket(db);
        // ファイルの存在確認
        const files = await bucket.find({ _id: new mongodb_1.ObjectId(fileId) }).limit(1).toArray();
        if (files.length === 0) {
            return new Response('File not found', { status: 404 });
        }
        const file = files[0];
        const contentType = file.metadata?.mimeType || file.metadata?.contentType || file.contentType || 'application/pdf';
        // ストリーミングレスポンスを作成
        const downloadStream = bucket.openDownloadStream(new mongodb_1.ObjectId(fileId));
        // ReadableStreamを作成
        const stream = new ReadableStream({
            async start(controller) {
                downloadStream.on('data', (chunk) => {
                    controller.enqueue(new Uint8Array(chunk));
                });
                downloadStream.on('end', () => {
                    controller.close();
                });
                downloadStream.on('error', (error) => {
                    logger_1.logger.error('Stream error:', error);
                    controller.error(error);
                });
            },
            cancel() {
                downloadStream.destroy();
            }
        });
        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': file.length.toString(),
                'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`,
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff'
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Direct file error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
