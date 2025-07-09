import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../src/lib/mongodb-client';
import { ObjectId, GridFSBucket } from 'mongodb';

interface RouteParams {
  params: {
    id: string;
  };
}

// HEADメソッド：ファイル存在確認（高速）
export async function HEAD(request: NextRequest, { params }: RouteParams) {
  try {
    const fileId = params.id;
    
    if (!fileId || !ObjectId.isValid(fileId)) {
      return new NextResponse(null, { status: 400 });
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db);
    
    // タイムアウト付きでファイル存在確認
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    const findPromise = bucket.find({ _id: new ObjectId(fileId) }).limit(1).toArray();
    
    const files = await Promise.race([findPromise, timeoutPromise]);
    
    if (files.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const file = files[0];
    const contentType = file.metadata?.mimeType || file.contentType || 'application/octet-stream';
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('File HEAD request error:', error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const fileId = params.id;
    console.log('File API GET called with ID:', fileId);

    if (!fileId || !ObjectId.isValid(fileId)) {
      console.log('Invalid file ID:', fileId);
      return NextResponse.json({
        success: false,
        error: 'Invalid file ID'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db);
    
    // タイムアウト付きでファイル検索
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('File search timeout')), 10000)
    );
    
    const findPromise = bucket.find({ _id: new ObjectId(fileId) }).limit(1).toArray();
    
    const files = await Promise.race([findPromise, timeoutPromise]);
    console.log('Found files:', files.length);
    
    if (files.length === 0) {
      console.log('File not found in GridFS');
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 });
    }

    const file = files[0];
    console.log('File found:', {
      id: file._id,
      filename: file.filename,
      contentType: file.contentType,
      length: file.length
    });
    
    // ストリーミング読み込みをタイムアウト付きで実行
    const downloadTimeout = 30000; // 30秒タイムアウト
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    const chunks: Uint8Array[] = [];
    
    return new Promise<NextResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        downloadStream.destroy();
        resolve(NextResponse.json({
          success: false,
          error: 'File download timeout'
        }, { status: 504 }));
      }, downloadTimeout);
      
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      downloadStream.on('error', (error) => {
        clearTimeout(timeoutId);
        console.error('Download stream error:', error);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to download file'
        }, { status: 500 }));
      });
      
      downloadStream.on('end', () => {
        clearTimeout(timeoutId);
        const buffer = Buffer.concat(chunks);
        console.log('File download completed, buffer size:', buffer.length);
        
        const contentType = file.metadata?.mimeType || file.contentType || 'application/octet-stream';
        
        resolve(new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${file.filename}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        }));
      });
    });

  } catch (error) {
    console.error('File retrieval error:', error);
    if (error.message === 'File search timeout') {
      return NextResponse.json({
        success: false,
        error: 'File search timeout'
      }, { status: 504 });
    }
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve file'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';