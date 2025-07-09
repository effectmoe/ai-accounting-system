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
    
    // Check if this is a browser request or API request
    const acceptHeader = request.headers.get('accept') || '';
    const isBrowserRequest = acceptHeader.includes('text/html') || acceptHeader.includes('image/');

    if (!fileId || !ObjectId.isValid(fileId)) {
      console.log('Invalid file ID:', fileId);
      
      if (isBrowserRequest) {
        return new NextResponse('Invalid file ID', { status: 400 });
      }
      
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
      
      if (isBrowserRequest) {
        return new NextResponse('File not found', { status: 404 });
      }
      
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
      metadata: file.metadata,
      length: file.length
    });
    
    // ストリーミング読み込みをタイムアウト付きで実行
    const downloadTimeout = 30000; // 30秒タイムアウト
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    const chunks: Uint8Array[] = [];
    
    return new Promise<NextResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        downloadStream.destroy();
        
        if (isBrowserRequest) {
          resolve(new NextResponse('File download timeout', { status: 504 }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'File download timeout'
          }, { status: 504 }));
        }
      }, downloadTimeout);
      
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      downloadStream.on('error', (error) => {
        clearTimeout(timeoutId);
        console.error('Download stream error:', error);
        
        if (isBrowserRequest) {
          resolve(new NextResponse('Failed to download file', { status: 500 }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'Failed to download file'
          }, { status: 500 }));
        }
      });
      
      downloadStream.on('end', () => {
        clearTimeout(timeoutId);
        const buffer = Buffer.concat(chunks);
        console.log('File download completed, buffer size:', buffer.length);
        
        // Determine content type from metadata or file extension
        let contentType = file.metadata?.mimeType || file.metadata?.contentType || file.contentType || 'application/octet-stream';
        
        // If content type is generic, try to determine from filename
        if (contentType === 'application/octet-stream' && file.filename) {
          const ext = file.filename.toLowerCase().split('.').pop();
          const mimeTypes: Record<string, string> = {
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
        
        console.log('Serving file with content type:', contentType);
        
        resolve(new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': buffer.length.toString(),
            'Content-Disposition': `inline; filename="${file.filename}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        }));
      });
    });

  } catch (error) {
    console.error('File retrieval error:', error);
    
    const isBrowserRequest = request.headers.get('accept')?.includes('text/html') || 
                            request.headers.get('accept')?.includes('image/');
    
    if (error.message === 'File search timeout') {
      if (isBrowserRequest) {
        return new NextResponse('File search timeout', { status: 504 });
      }
      return NextResponse.json({
        success: false,
        error: 'File search timeout'
      }, { status: 504 });
    }
    
    if (isBrowserRequest) {
      return new NextResponse('Failed to retrieve file', { status: 500 });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve file'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60; // 60秒のタイムアウト設定