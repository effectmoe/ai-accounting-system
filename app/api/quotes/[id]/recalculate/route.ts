import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const quoteService = new QuoteService();

    const quote = await quoteService.getQuote(id);
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const recalculatedItems = quote.items.map((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxRate = item.taxRate !== undefined ? Number(item.taxRate) : 10;
      const amount = (item.amount && item.amount > 0) ? Number(item.amount) : Math.round(quantity * unitPrice);
      const taxAmount = (item.taxAmount && item.taxAmount > 0) ? Number(item.taxAmount) : Math.round(amount * taxRate / 100);
      return { ...item, amount, taxAmount, totalAmount: amount + taxAmount };
    });

    let subtotal = 0;
    let taxAmount = 0;
    recalculatedItems.forEach((item: any) => {
      subtotal += item.amount || 0;
      taxAmount += item.taxAmount || 0;
    });

    const updated = await quoteService.updateQuote(id, {
      items: recalculatedItems,
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
    });

    logger.info(`Quote recalculated: ${quote.quoteNumber} → totalAmount=${subtotal + taxAmount}`);
    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error recalculating quote:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate quote', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
