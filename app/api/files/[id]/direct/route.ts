import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId, GridFSBucket } from 'mongodb';

import { logger } from '@/lib/logger';
interface RouteParams {
  params: {
    id: string;
  };
}

// Node.js Runtimeを使用（GridFSアクセスに必要）
export const runtime = 'nodejs';
export const maxDuration = 60; // 60秒のタイムアウト

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const fileId = params.id;
    logger.debug('Direct file API called with ID:', fileId);
    
    if (!fileId || !ObjectId.isValid(fileId)) {
      return new Response('Invalid file ID', { status: 400 });
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db);
    
    // ファイルの存在確認
    const files = await bucket.find({ _id: new ObjectId(fileId) }).limit(1).toArray();
    
    if (files.length === 0) {
      return new Response('File not found', { status: 404 });
    }

    const file = files[0];
    const contentType = file.metadata?.mimeType || file.metadata?.contentType || file.contentType || 'application/pdf';
    
    // ストリーミングレスポンスを作成
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    
    // ReadableStreamを作成
    const stream = new ReadableStream({
      async start(controller) {
        downloadStream.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        
        downloadStream.on('end', () => {
          controller.close();
        });
        
        downloadStream.on('error', (error) => {
          logger.error('Stream error:', error);
          controller.error(error);
        });
      },
      cancel() {
        downloadStream.destroy();
      }
    });
    
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.length.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error) {
    logger.error('Direct file error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}