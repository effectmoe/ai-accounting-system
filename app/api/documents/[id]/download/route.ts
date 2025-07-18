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
      const chunks: Buffer[] = [];
      
      return new Promise<NextResponse>((resolve, reject) => {
        let resolved = false;
        
        // 30秒のタイムアウトを設定
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.error('[Document Download] Stream timeout after 30s');
            downloadStream.destroy();
            resolve(NextResponse.json({
              error: 'Download timeout'
            }, { status: 504 }));
          }
        }, 30000);

        downloadStream.on('data', (chunk) => {
          console.log('[Document Download] Received chunk:', chunk.length, 'bytes');
          chunks.push(chunk);
        });

        downloadStream.on('error', (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.error('[Document Download] Stream error:', error);
            resolve(NextResponse.json({
              error: 'Failed to download file'
            }, { status: 500 }));
          }
        });

        downloadStream.on('end', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const buffer = Buffer.concat(chunks);
            const contentType = file.contentType || file.metadata?.contentType || 'application/octet-stream';
            
            console.log('[Document Download] Stream completed, buffer size:', buffer.length, 'bytes');
            
            resolve(new NextResponse(buffer, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${file.filename}"`,
                'Content-Length': buffer.length.toString(),
              },
            }));
          }
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