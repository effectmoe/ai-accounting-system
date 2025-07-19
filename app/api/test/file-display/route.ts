import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { SupplierQuote } from '@/types/collections';

import { logger } from '@/lib/logger';
export async function GET(request: NextRequest) {
  try {
    // 最新のfileIdを持つ仕入先見積書を1件取得
    const quote = await db.findOne<SupplierQuote>('supplierQuotes', {
      fileId: { $exists: true, $ne: null }
    }, {
      sort: { createdAt: -1 }
    });
    
    if (!quote || !quote.fileId) {
      return NextResponse.json({
        success: false,
        message: 'fileIdを持つ仕入先見積書が見つかりません'
      });
    }
    
    return NextResponse.json({
      success: true,
      quoteId: quote._id?.toString(),
      quoteNumber: quote.quoteNumber,
      fileId: quote.fileId,
      fileIdType: typeof quote.fileId,
      fileIdString: String(quote.fileId),
      testUrls: {
        viewUrl: `/api/documents/${quote.fileId}/download`,
        directDownloadUrl: `/api/documents/${quote.fileId}/download?download=true`
      },
      createdAt: quote.createdAt
    });
  } catch (error) {
    logger.error('Error in test file display:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}