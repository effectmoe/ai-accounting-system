import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { SupplierQuote } from '@/types/collections';

export async function GET(request: NextRequest) {
  try {
    // 最新の10件の仕入先見積書を取得
    const quotes = await db.find<SupplierQuote>('supplierQuotes', {}, {
      sort: { createdAt: -1 },
      limit: 10
    });
    
    // fileIdの状態をチェック
    const fileIdInfo = quotes.map(quote => ({
      _id: quote._id?.toString(),
      quoteNumber: quote.quoteNumber,
      fileId: quote.fileId,
      fileIdType: typeof quote.fileId,
      fileIdValue: quote.fileId ? String(quote.fileId) : null,
      hasFileId: !!quote.fileId,
      ocrResultId: quote.ocrResultId?.toString(),
      createdAt: quote.createdAt
    }));
    
    return NextResponse.json({
      success: true,
      count: fileIdInfo.length,
      quotes: fileIdInfo,
      message: 'fileIdの状態をチェックしました'
    });
  } catch (error) {
    console.error('Error checking supplier quote files:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}