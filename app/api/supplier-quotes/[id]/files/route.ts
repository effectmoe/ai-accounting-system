import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルの検証
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDFまたは画像ファイル（PNG、JPEG）のみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルサイズの検証（10MB以下）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 仕入先見積書の存在確認
    const quote = await db.collection('supplierQuotes').findOne({ 
      _id: new ObjectId(quoteId) 
    });
    
    if (!quote) {
      return NextResponse.json(
        { error: '仕入先見積書が見つかりません' },
        { status: 404 }
      );
    }

    // ファイル情報を作成
    const fileInfo = {
      id: uuidv4(),
      filename: file.name,
      uploadedAt: new Date(),
      fileType: file.type,
      fileSize: file.size,
    };

    // TODO: ファイルをGridFSに保存（一時的に無効化）
    logger.info('GridFS upload skipped (temporarily disabled)', { fileId: fileInfo.id });
    
    // 仕入先見積書にファイル情報を追加
    const updateResult = await db.collection('supplierQuotes').updateOne(
      { _id: new ObjectId(quoteId) },
      { 
        $push: { ocrFiles: fileInfo },
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error('ファイル情報の保存に失敗しました');
    }

    logger.info('File uploaded to supplier quote', { quoteId, fileInfo });

    return NextResponse.json(fileInfo);
  } catch (error) {
    logger.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const { db } = await connectToDatabase();
    
    const quote = await db.collection('supplierQuotes').findOne(
      { _id: new ObjectId(quoteId) },
      { projection: { ocrFiles: 1 } }
    );
    
    if (!quote) {
      return NextResponse.json(
        { error: '仕入先見積書が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(quote.ocrFiles || []);
  } catch (error) {
    logger.error('Error fetching supplier quote files:', error);
    return NextResponse.json(
      { error: 'ファイル一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}