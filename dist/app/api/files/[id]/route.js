"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.runtime = void 0;
exports.HEAD = HEAD;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
// HEADメソッド：ファイル存在確認（高速）
async function HEAD(request, { params }) {
    try {
        const fileId = params.id;
        if (!fileId || !mongodb_1.ObjectId.isValid(fileId)) {
            return new server_1.NextResponse(null, { status: 400 });
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const bucket = new mongodb_1.GridFSBucket(db);
        // タイムアウト付きでファイル存在確認
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
        const findPromise = bucket.find({ _id: new mongodb_1.ObjectId(fileId) }).limit(1).toArray();
        const files = await Promise.race([findPromise, timeoutPromise]);
        if (files.length === 0) {
            return new server_1.NextResponse(null, { status: 404 });
        }
        const file = files[0];
        const contentType = file.metadata?.mimeType || file.contentType || 'application/octet-stream';
        return new server_1.NextResponse(null, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': file.length.toString(),
                'Cache-Control': 'public, max-age=3600'
            }
        });
    }
    catch (error) {
        logger_1.logger.error('File HEAD request error:', error);
        return new server_1.NextResponse(null, { status: 500 });
    }
}
async function GET(request, { params }) {
    try {
        const fileId = params.id;
        logger_1.logger.debug('File API GET called with ID:', fileId);
        // Check if this is a browser request or API request
        const acceptHeader = request.headers.get('accept') || '';
        const isBrowserRequest = acceptHeader.includes('text/html') || acceptHeader.includes('image/');
        if (!fileId || !mongodb_1.ObjectId.isValid(fileId)) {
            logger_1.logger.debug('Invalid file ID:', fileId);
            if (isBrowserRequest) {
                return new server_1.NextResponse('Invalid file ID', { status: 400 });
            }
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid file ID'
            }, { status: 400 });
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const bucket = new mongodb_1.GridFSBucket(db);
        // タイムアウト付きでファイル検索
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('File search timeout')), 10000));
        const findPromise = bucket.find({ _id: new mongodb_1.ObjectId(fileId) }).limit(1).toArray();
        const files = await Promise.race([findPromise, timeoutPromise]);
        logger_1.logger.debug('Found files:', files.length);
        if (files.length === 0) {
            logger_1.logger.debug('File not found in GridFS');
            if (isBrowserRequest) {
                return new server_1.NextResponse('File not found', { status: 404 });
            }
            return server_1.NextResponse.json({
                success: false,
                error: 'File not found'
            }, { status: 404 });
        }
        const file = files[0];
        logger_1.logger.debug('File found:', {
            id: file._id,
            filename: file.filename,
            contentType: file.contentType,
            metadata: file.metadata,
            length: file.length
        });
        // Determine content type from metadata or file extension
        let contentType = file.metadata?.mimeType || file.metadata?.contentType || file.contentType || 'application/octet-stream';
        // If content type is generic, try to determine from filename
        if (contentType === 'application/octet-stream' && file.filename) {
            const ext = file.filename.toLowerCase().split('.').pop();
            const mimeTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            contentType = mimeTypes[ext] || contentType;
        }
        logger_1.logger.debug('Serving file with content type:', contentType);
        // ストリーミングレスポンスを作成
        const downloadStream = bucket.openDownloadStream(new mongodb_1.ObjectId(fileId));
        // ReadableStreamを作成
        const stream = new ReadableStream({
            async start(controller) {
                downloadStream.on('data', (chunk) => {
                    controller.enqueue(new Uint8Array(chunk));
                });
                downloadStream.on('end', () => {
                    logger_1.logger.debug('Stream ended successfully');
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
        return new server_1.NextResponse(stream, {
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
        logger_1.logger.error('File retrieval error:', error);
        const isBrowserRequest = request.headers.get('accept')?.includes('text/html') ||
            request.headers.get('accept')?.includes('image/');
        if (error.message === 'File search timeout') {
            if (isBrowserRequest) {
                return new server_1.NextResponse('File search timeout', { status: 504 });
            }
            return server_1.NextResponse.json({
                success: false,
                error: 'File search timeout'
            }, { status: 504 });
        }
        if (isBrowserRequest) {
            return new server_1.NextResponse('Failed to retrieve file', { status: 500 });
        }
        return server_1.NextResponse.json({
            error: 'サーバーエラーが発生しました'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
exports.maxDuration = 60; // 60秒のタイムアウト設定
