import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';

import { logger } from '@/lib/logger';
// POST: 仕入先見積書番号生成
export async function POST(request: NextRequest) {
  try {
    const supplierQuoteService = new SupplierQuoteService();
    const quoteNumber = await supplierQuoteService.generateSupplierQuoteNumber();
    
    return NextResponse.json({ quoteNumber });
  } catch (error) {
    logger.error('Error in POST /api/supplier-quotes/generate-number:', error);
    return NextResponse.json(
      { error: 'Failed to generate supplier quote number' },
      { status: 500 }
    );
  }
}