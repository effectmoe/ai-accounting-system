import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../src/lib/mongodb-client';
import { ObjectId, GridFSBucket } from 'mongodb';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const fileId = params.id;

    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file ID'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    
    // ファイルメタデータを取得
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    
    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 });
    }

    const file = files[0];
    
    // ファイルをストリームとして読み込む
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    const chunks: Uint8Array[] = [];
    
    return new Promise<NextResponse>((resolve, reject) => {
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      downloadStream.on('error', (error) => {
        console.error('Download stream error:', error);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to download file'
        }, { status: 500 }));
      });
      
      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // Content-Typeを設定
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
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve file'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';