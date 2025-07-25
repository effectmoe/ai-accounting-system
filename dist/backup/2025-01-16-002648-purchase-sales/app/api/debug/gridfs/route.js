"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
async function GET(request) {
    try {
        const db = await (0, mongodb_client_1.getDatabase)();
        // Get recent files from fs.files
        const filesCollection = db.collection('fs.files');
        const recentFiles = await filesCollection.find({})
            .sort({ uploadDate: -1 })
            .limit(10)
            .toArray();
        // Get chunks count for each file
        const chunksCollection = db.collection('fs.chunks');
        const filesWithChunks = await Promise.all(recentFiles.map(async (file) => {
            const chunksCount = await chunksCollection.countDocuments({
                files_id: file._id
            });
            return {
                _id: file._id.toString(),
                filename: file.filename,
                length: file.length,
                uploadDate: file.uploadDate,
                metadata: file.metadata,
                contentType: file.contentType,
                chunksCount,
                hasChunks: chunksCount > 0
            };
        }));
        // Get recent documents
        const documentsCollection = db.collection('documents');
        const recentDocs = await documentsCollection.find({})
            .sort({ uploadedAt: -1 })
            .limit(10)
            .project({
            fileName: 1,
            originalFileUrl: 1,
            gridfsFileId: 1,
            uploadedAt: 1
        })
            .toArray();
        // Map documents to their GridFS files
        const docsWithFiles = await Promise.all(recentDocs.map(async (doc) => {
            let gridfsFile = null;
            if (doc.gridfsFileId) {
                try {
                    const fileId = typeof doc.gridfsFileId === 'string'
                        ? new mongodb_1.ObjectId(doc.gridfsFileId)
                        : doc.gridfsFileId;
                    gridfsFile = await filesCollection.findOne({ _id: fileId });
                }
                catch (e) {
                    console.error('Error finding GridFS file:', e);
                }
            }
            return {
                documentId: doc._id.toString(),
                fileName: doc.fileName,
                originalFileUrl: doc.originalFileUrl,
                gridfsFileId: doc.gridfsFileId?.toString(),
                uploadedAt: doc.uploadedAt,
                gridfsFileExists: !!gridfsFile,
                gridfsFileName: gridfsFile?.filename,
                gridfsFileLength: gridfsFile?.length
            };
        }));
        return server_1.NextResponse.json({
            success: true,
            summary: {
                totalFiles: await filesCollection.countDocuments(),
                totalChunks: await chunksCollection.countDocuments(),
                totalDocuments: await documentsCollection.countDocuments()
            },
            recentGridFSFiles: filesWithChunks,
            recentDocuments: docsWithFiles
        });
    }
    catch (error) {
        console.error('GridFS debug error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to debug GridFS'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
