import { NextRequest, NextResponse } from 'next/server';
import { db, getGridFSBucket } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('[Document Download] Getting document with ID:', id);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({
        error: 'Invalid document ID'
      }, { status: 400 });
    }

    // ドキュメントを取得
    const document = await db.findById('documents', id);
    
    if (!document) {
      return NextResponse.json({
        error: 'Document not found'
      }, { status: 404 });
    }

    // ファイルIDを確認
    const fileId = document.fileId || document.file_id;
    if (!fileId) {
      console.error('[Document Download] No file ID found for document:', id);
      return NextResponse.json({
        error: 'No file attached to this document'
      }, { status: 404 });
    }

    console.log('[Document Download] File ID found:', fileId);

    // GridFSからファイルを取得
    const bucket = await getGridFSBucket();
    
    try {
      // ファイルの存在確認
      const fileObjectId = new ObjectId(fileId);
      const files = await bucket.find({ _id: fileObjectId }).toArray();
      
      if (files.length === 0) {
        console.error('[Document Download] File not found in GridFS:', fileId);
        return NextResponse.json({
          error: 'File not found in storage'
        }, { status: 404 });
      }

      const file = files[0];
      console.log('[Document Download] File found:', {
        filename: file.filename,
        contentType: file.contentType || file.metadata?.contentType,
        length: file.length
      });

      // ファイルをストリーミング
      const downloadStream = bucket.openDownloadStream(fileObjectId);
      const chunks: Buffer[] = [];
      
      return new Promise<NextResponse>((resolve, reject) => {
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        downloadStream.on('error', (error) => {
          console.error('[Document Download] Stream error:', error);
          resolve(NextResponse.json({
            error: 'Failed to download file'
          }, { status: 500 }));
        });

        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = file.contentType || file.metadata?.contentType || 'application/octet-stream';
          
          resolve(new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${file.filename}"`,
              'Content-Length': buffer.length.toString(),
            },
          }));
        });
      });

    } catch (gridfsError) {
      console.error('[Document Download] GridFS error:', gridfsError);
      return NextResponse.json({
        error: 'Failed to retrieve file from storage'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Document Download] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to download document'
    }, { status: 500 });
  }
}