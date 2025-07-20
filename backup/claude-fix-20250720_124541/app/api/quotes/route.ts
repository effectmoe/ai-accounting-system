import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { QuoteStatus } from '@/types/collections';

import { logger } from '@/lib/logger';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const quoteService = new QuoteService();
    
    // クエリパラメータの取得
    const customerId = searchParams.get('customerId') || undefined;
    const status = searchParams.get('status') as QuoteStatus | undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const isGeneratedByAI = searchParams.get('isGeneratedByAI') === 'true' ? true : undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const result = await quoteService.searchQuotes({
      customerId,
      status,
      dateFrom,
      dateTo,
      isGeneratedByAI,
      limit,
      skip,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.debug('Quote creation request:', JSON.stringify(body, null, 2));
    
    const quoteService = new QuoteService();
    
    // データの前処理：フロントエンドのdescriptionをitemNameに変換
    const processedItems = body.items.map((item: any) => ({
      ...item,
      itemName: item.description || item.itemName || '',
      description: item.description || '',
      totalAmount: item.amount + item.taxAmount,
      sortOrder: 0
    }));
    
    // 見積書番号を生成（body.quoteNumberが指定されていない場合）
    const quoteNumber = body.quoteNumber || await quoteService.generateQuoteNumber();
    
    // quoteDateを除外してquoteDataを作成
    const { quoteDate, ...restBody } = body;
    
    const quoteData = {
      ...restBody,
      quoteNumber,
      items: processedItems,
      issueDate: new Date(quoteDate), // フロントエンドのquoteDateをissueDateに変換
      validityDate: new Date(body.validityDate),
      status: body.status || 'draft', // デフォルトステータスを設定
      subtotal: 0, // 後で計算
      taxAmount: 0, // 後で計算
      totalAmount: 0, // 後で計算
    };
    
    // 合計金額を計算
    let subtotal = 0;
    let taxAmount = 0;
    
    processedItems.forEach((item: any) => {
      subtotal += item.amount || 0;
      taxAmount += item.taxAmount || 0;
    });
    
    quoteData.subtotal = subtotal;
    quoteData.taxAmount = taxAmount;
    quoteData.totalAmount = subtotal + taxAmount;
    
    logger.debug('Processed quote data:', JSON.stringify(quoteData, null, 2));
    
    // AI会話からの作成の場合も含めて、追加のデータをセット
    if (body.isGeneratedByAI && body.aiConversationId) {
      quoteData.isGeneratedByAI = true;
      quoteData.aiConversationId = body.aiConversationId;
    }
    
    // 見積書を作成
    const quote = await quoteService.createQuote(quoteData);
    logger.debug('Quote created:', quote);
    return NextResponse.json(quote);
  } catch (error) {
    logger.error('Error creating quote:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to create quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}