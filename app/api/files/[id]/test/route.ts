import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId, GridFSBucket } from 'mongodb';

import { logger } from '@/lib/logger';
interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const fileId = params.id;
    logger.debug('Test API - File ID:', fileId);

    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file ID',
        fileId
      }, { status: 400 });
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db);
    
    // Check files.files collection
    const filesCollection = db.collection('fs.files');
    const fileDoc = await filesCollection.findOne({ _id: new ObjectId(fileId) });
    
    if (!fileDoc) {
      // Also check if there's any file with this ID as string
      const fileDocString = await filesCollection.findOne({ _id: fileId as any });
      
      return NextResponse.json({
        success: false,
        error: 'File not found in fs.files',
        searchedId: fileId,
        searchedObjectId: new ObjectId(fileId).toString(),
        fileDocAsString: fileDocString ? 'Found with string ID' : 'Not found',
        totalFiles: await filesCollection.countDocuments()
      }, { status: 404 });
    }

    // Check chunks
    const chunksCollection = db.collection('fs.chunks');
    const chunksCount = await chunksCollection.countDocuments({ files_id: new ObjectId(fileId) });

    return NextResponse.json({
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

  } catch (error) {
    logger.error('File test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test file'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';