"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const action = searchParams.get('action') || 'list';
        logger_1.logger.debug('[Debug File Flow] Action:', action);
        const bucket = await (0, mongodb_client_1.getGridFSBucket)();
        const db = await (0, mongodb_client_1.getDatabase)();
        if (action === 'list') {
            // List all GridFS files
            const files = await bucket.find({}).toArray();
            logger_1.logger.debug('[Debug File Flow] Found GridFS files:', files.length);
            // List all supplier quotes with their fileIds
            const supplierQuotes = await db.collection('supplierQuotes')
                .find({})
                .project({ _id: 1, quoteNumber: 1, fileId: 1, attachments: 1 })
                .toArray();
            logger_1.logger.debug('[Debug File Flow] Found supplier quotes:', supplierQuotes.length);
            return server_1.NextResponse.json({
                success: true,
                data: {
                    gridfsFiles: files.map(file => ({
                        _id: file._id.toString(),
                        filename: file.filename,
                        length: file.length,
                        uploadDate: file.uploadDate,
                        metadata: file.metadata
                    })),
                    supplierQuotes: supplierQuotes.map(quote => ({
                        _id: quote._id.toString(),
                        quoteNumber: quote.quoteNumber,
                        fileId: quote.fileId,
                        attachments: quote.attachments
                    }))
                }
            });
        }
        if (action === 'test-upload') {
            // Test file upload to GridFS
            const testContent = 'This is a test file for debugging';
            const testBuffer = Buffer.from(testContent, 'utf-8');
            const uploadStream = bucket.openUploadStream('test-file.txt', {
                metadata: {
                    uploadedAt: new Date(),
                    contentType: 'text/plain',
                    purpose: 'debug-test'
                }
            });
            const fileId = uploadStream.id.toString();
            logger_1.logger.debug('[Debug File Flow] Test upload - File ID:', fileId);
            // Upload the test file
            const { Readable } = require('stream');
            const readableStream = Readable.from(testBuffer);
            await new Promise((resolve, reject) => {
                readableStream.pipe(uploadStream)
                    .on('error', reject)
                    .on('finish', resolve);
            });
            logger_1.logger.debug('[Debug File Flow] Test file uploaded successfully');
            return server_1.NextResponse.json({
                success: true,
                message: 'Test file uploaded successfully',
                fileId: fileId
            });
        }
        if (action === 'test-download') {
            const fileId = searchParams.get('fileId');
            if (!fileId) {
                return server_1.NextResponse.json({
                    success: false,
                    error: 'fileId parameter is required'
                }, { status: 400 });
            }
            logger_1.logger.debug('[Debug File Flow] Test download - File ID:', fileId);
            try {
                // Check if file exists
                const files = await bucket.find({ _id: new mongodb_1.ObjectId(fileId) }).toArray();
                if (files.length === 0) {
                    return server_1.NextResponse.json({
                        success: false,
                        error: 'File not found',
                        fileId: fileId
                    }, { status: 404 });
                }
                const file = files[0];
                logger_1.logger.debug('[Debug File Flow] File found:', {
                    filename: file.filename,
                    length: file.length,
                    contentType: file.contentType || file.metadata?.contentType
                });
                // Download file content
                const downloadStream = bucket.openDownloadStream(new mongodb_1.ObjectId(fileId));
                const chunks = [];
                await new Promise((resolve, reject) => {
                    downloadStream.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    downloadStream.on('error', reject);
                    downloadStream.on('end', resolve);
                });
                const content = Buffer.concat(chunks);
                logger_1.logger.debug('[Debug File Flow] File content downloaded:', content.length, 'bytes');
                // Check if this is a browser request
                const userAgent = request.headers.get('user-agent') || '';
                const isDownloadRequest = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
                if (isDownloadRequest) {
                    // Return the file directly for browser requests
                    const contentType = file.contentType || file.metadata?.contentType || 'application/octet-stream';
                    return new server_1.NextResponse(content, {
                        status: 200,
                        headers: {
                            'Content-Type': contentType,
                            'Content-Disposition': `inline; filename="${file.filename}"`,
                            'Content-Length': content.length.toString(),
                        },
                    });
                }
                else {
                    // Return JSON for API requests
                    return server_1.NextResponse.json({
                        success: true,
                        message: 'File downloaded successfully',
                        fileId: fileId,
                        filename: file.filename,
                        contentLength: content.length,
                        contentPreview: content.toString('utf-8').substring(0, 100)
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('[Debug File Flow] Error downloading file:', error);
                return server_1.NextResponse.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    fileId: fileId
                }, { status: 500 });
            }
        }
        return server_1.NextResponse.json({
            success: false,
            error: 'Invalid action. Use: list, test-upload, test-download'
        }, { status: 400 });
    }
    catch (error) {
        logger_1.logger.error('[Debug File Flow] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
