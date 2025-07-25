"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
async function GET(request, { params }) {
    try {
        const fileId = params.id;
        console.log('Test API - File ID:', fileId);
        if (!fileId || !mongodb_1.ObjectId.isValid(fileId)) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid file ID',
                fileId
            }, { status: 400 });
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const bucket = new mongodb_1.GridFSBucket(db);
        // Check files.files collection
        const filesCollection = db.collection('fs.files');
        const fileDoc = await filesCollection.findOne({ _id: new mongodb_1.ObjectId(fileId) });
        if (!fileDoc) {
            // Also check if there's any file with this ID as string
            const fileDocString = await filesCollection.findOne({ _id: fileId });
            return server_1.NextResponse.json({
                success: false,
                error: 'File not found in fs.files',
                searchedId: fileId,
                searchedObjectId: new mongodb_1.ObjectId(fileId).toString(),
                fileDocAsString: fileDocString ? 'Found with string ID' : 'Not found',
                totalFiles: await filesCollection.countDocuments()
            }, { status: 404 });
        }
        // Check chunks
        const chunksCollection = db.collection('fs.chunks');
        const chunksCount = await chunksCollection.countDocuments({ files_id: new mongodb_1.ObjectId(fileId) });
        return server_1.NextResponse.json({
            success: true,
            file: {
                id: fileDoc._id.toString(),
                filename: fileDoc.filename,
                length: fileDoc.length,
                uploadDate: fileDoc.uploadDate,
                metadata: fileDoc.metadata,
                contentType: fileDoc.contentType
            },
            chunksCount,
            canDownload: chunksCount > 0
        });
    }
    catch (error) {
        console.error('File test error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to test file'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
