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
    console.log('[Document Download] Request URL:', request.url);
    console.log('[Document Download] Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('[Document Download] ID type:', typeof id);
    console.log('[Document Download] ID length:', id?.length);

    if (!id) {
      console.error('[Document Download] No ID provided');
      return NextResponse.json({
        error: 'Document ID is required'
      }, { status: 400 });
    }

    // fileIdが"ObjectId(...)"形式の場合、内部の値を抽出
    let fileId = id;
    const objectIdMatch = id.match(/^ObjectId\("?([a-f0-9]{24})"?\)$/i);
    if (objectIdMatch) {
      fileId = objectIdMatch[1];
      console.log('[Document Download] Extracted ObjectId from string format:', fileId);
    }

    if (!ObjectId.isValid(fileId)) {
      console.error('[Document Download] Invalid document ID format:', fileId);
      console.error('[Document Download] Original ID:', id);
      return NextResponse.json({
        error: `Invalid document ID format: ${id}`
      }, { status: 400 });
    }

    // fileIdはすでに上で処理済み
    console.log('[Document Download] Using ID as GridFS file ID:', fileId);

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
      const contentType = file.contentType || file.metadata?.contentType || 'application/octet-stream';
      
      console.log('[Document Download] Starting stream for file:', {
        filename: file.filename,
        length: file.length,
        contentType: contentType
      });
      
      // ReadableStreamを使用して直接ストリーミング
      const stream = new ReadableStream({
        start(controller) {
          downloadStream.on('data', (chunk) => {
            controller.enqueue(chunk);
          });
          
          downloadStream.on('end', () => {
            controller.close();
          });
          
          downloadStream.on('error', (error) => {
            console.error('[Document Download] Stream error:', error);
            controller.error(error);
          });
        }
      });
      
      return new NextResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${file.filename}"`,
          'Content-Length': file.length.toString(),
        },
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