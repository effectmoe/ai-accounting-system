import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId, GridFSBucket } from 'mongodb';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const { id: quoteId, fileId } = params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    
    const { db } = await connectToDatabase();
    
    // 仕入先見積書からファイル情報を取得
    const quote = await db.collection('supplierQuotes').findOne(
      { 
        _id: new ObjectId(quoteId),
        'ocrFiles.id': fileId
      },
      { projection: { ocrFiles: 1 } }
    );
    
    if (!quote) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    const fileInfo = quote.ocrFiles.find((f: any) => f.id === fileId);
    if (!fileInfo) {
      return NextResponse.json(
        { error: 'ファイル情報が見つかりません' },
        { status: 404 }
      );
    }

    // GridFSからファイルを取得
    try {
      const gridfsDb = await getDatabase();
      const bucket = new GridFSBucket(gridfsDb, { bucketName: 'fs' });
      
      // ファイルが存在するか確認（gridfsDbを使用）
      const fileExists = await gridfsDb.collection('fs.files').findOne({
        _id: new ObjectId(fileId)
      });
      
      if (!fileExists) {
        logger.error(`GridFS file not found: ${fileId}`);
        return NextResponse.json(
          { error: 'ファイルが存在しません' },
          { status: 404 }
        );
      }
      
      logger.info(`Accessing GridFS file: ${fileId} (${fileExists.filename})`);
      
      // ストリーミングレスポンスを作成（/api/files/[id]のパターンを参考）
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
      
      // ReadableStreamを作成
      const stream = new ReadableStream({
        async start(controller) {
          downloadStream.on('data', (chunk) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          
          downloadStream.on('end', () => {
            logger.debug('Stream ended successfully');
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
      
      // コンテンツタイプの決定
      let contentType = fileInfo.fileType || fileExists.metadata?.contentType || fileExists.contentType || 'application/octet-stream';
      
      // 拡張子からMIMEタイプを推測
      if (contentType === 'application/octet-stream' && fileExists.filename) {
        const ext = fileExists.filename.toLowerCase().split('.').pop();
        const mimeTypes = {
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
      
      logger.info(`Serving file with content type: ${contentType}, size: ${fileExists.length}`);
      
      return new NextResponse(stream, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileExists.length.toString(),
          'Content-Disposition': download 
            ? `attachment; filename="${encodeURIComponent(fileInfo.filename)}"`
            : `inline; filename="${encodeURIComponent(fileInfo.filename)}"`,
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff'
        },
      });
    } catch (gridfsError) {
      logger.error('GridFS error details:', {
        error: gridfsError.message,
        stack: gridfsError.stack,
        fileId,
        filename: fileInfo.filename
      });
      return NextResponse.json(
        { error: `ファイルの読み込みに失敗しました: ${gridfsError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'ファイルの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const { id: quoteId, fileId } = params;
    const { db } = await connectToDatabase();
    
    // 仕入先見積書の存在確認
    const quote = await db.collection('supplierQuotes').findOne({ 
      _id: new ObjectId(quoteId),
      'ocrFiles.id': fileId
    });
    
    if (!quote) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // ファイル情報を削除
    const updateResult = await db.collection('supplierQuotes').updateOne(
      { _id: new ObjectId(quoteId) },
      { 
        $pull: { ocrFiles: { id: fileId } },
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error('ファイルの削除に失敗しました');
    }

    // TODO: GridFSからもファイルを削除（一時的に無効化）
    logger.info('GridFS deletion skipped (temporarily disabled)', { fileId });

    logger.info('File deleted from supplier quote', { quoteId, fileId });

    return NextResponse.json({ 
      success: true,
      message: 'ファイルを削除しました'
    });
  } catch (error) {
    logger.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'ファイルの削除に失敗しました' },
      { status: 500 }
    );
  }
}