import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export async function GET(request: NextRequest) {
  try {
    // 最新のドキュメントを5件取得
    const documents = await db.find('documents', {}, {
      limit: 5,
      sort: { createdAt: -1 }
    });

    // 各ドキュメントの詳細を表示
    const formattedDocs = documents.map(doc => ({
      _id: doc._id,
      documentType: doc.documentType,
      vendorName: doc.vendorName,
      sourceFileId: doc.sourceFileId,
      gridfsFileId: doc.gridfsFileId,
      fileId: doc.fileId,
      ocrResultId: doc.ocrResultId,
      createdAt: doc.createdAt,
      allKeys: Object.keys(doc)
    }));

    return NextResponse.json({
      count: documents.length,
      documents: formattedDocs,
      message: '最新のドキュメントを表示しています'
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch documents'
    }, { status: 500 });
  }
}