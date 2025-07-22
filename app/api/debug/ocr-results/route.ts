import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export async function GET(request: NextRequest) {
  try {
    // 最新のOCR結果を5件取得
    const ocrResults = await db.find('ocrResults', {}, {
      limit: 5,
      sort: { createdAt: -1 }
    });

    // 各OCR結果の詳細を表示
    const formattedResults = ocrResults.map(result => ({
      _id: result._id,
      fileName: result.fileName,
      sourceFileId: result.sourceFileId,
      gridfsFileId: result.gridfsFileId,
      fileId: result.fileId,
      documentId: result.documentId,
      status: result.status,
      createdAt: result.createdAt,
      allKeys: Object.keys(result)
    }));

    return NextResponse.json({
      count: ocrResults.length,
      results: formattedResults,
      message: '最新のOCR結果を表示しています'
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch OCR results'
    }, { status: 500 });
  }
}