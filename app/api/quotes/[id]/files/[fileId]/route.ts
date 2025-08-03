import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
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
    
    // 見積書からファイル情報を取得
    const quote = await db.collection('quotes').findOne(
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

    // 実際の実装では、GridFSからファイルを取得して返す
    // ここではダミーのレスポンスを返す
    return new NextResponse('File content would be here', {
      headers: {
        'Content-Type': fileInfo.fileType || 'application/octet-stream',
        'Content-Disposition': download 
          ? `attachment; filename="${fileInfo.filename}"`
          : `inline; filename="${fileInfo.filename}"`,
      },
    });
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
    
    // 見積書の存在確認
    const quote = await db.collection('quotes').findOne({ 
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
    const updateResult = await db.collection('quotes').updateOne(
      { _id: new ObjectId(quoteId) },
      { 
        $pull: { ocrFiles: { id: fileId } },
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error('ファイルの削除に失敗しました');
    }

    // 実際の実装では、GridFSからもファイルを削除する必要がある

    logger.info('File deleted from quote', { quoteId, fileId });

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