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
    console.log('File API called with ID:', fileId);

    if (!fileId || !ObjectId.isValid(fileId)) {
      console.log('Invalid file ID:', fileId);
      return NextResponse.json({
        success: false,
        error: 'Invalid file ID'
      }, { status: 400 });
    }

    const db = await getDatabase();
    // デフォルトのバケット名を使用（'fs'）
    const bucket = new GridFSBucket(db);
    
    // ファイルメタデータを取得
    console.log('Searching for file with ObjectId:', fileId);
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
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
      length: file.length,
      uploadDate: file.uploadDate
    });
    
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
        console.log('File download completed, buffer size:', buffer.length);
        
        // Content-Typeを設定
        const contentType = file.metadata?.mimeType || file.contentType || 'application/octet-stream';
        console.log('Content-Type:', contentType);
        
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