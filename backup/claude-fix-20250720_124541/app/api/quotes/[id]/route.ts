import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { CompanyInfoService } from '@/services/company-info.service';

import { logger } from '@/lib/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    logger.debug('[GET /api/quotes/[id]] Quote ID:', id);
    
    const quoteService = new QuoteService();
    const quote = await quoteService.getQuote(id);
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    // 会社情報を取得してcompanySnapshotを追加
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();
    
    const quoteWithCompanySnapshot = {
      ...quote,
      status: quote.status, // ステータスを明示的に含める
      companySnapshot: {
        companyName: companyInfo?.companyName || '会社名未設定',
        address: companyInfo ? [
          companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
          companyInfo.prefecture || '',
          companyInfo.city || '',
          companyInfo.address1 || '',
          companyInfo.address2 || ''
        ].filter(Boolean).join(' ') : '',
        phone: companyInfo?.phone,
        email: companyInfo?.email,
        invoiceRegistrationNumber: companyInfo?.registrationNumber || '',
        stampImage: companyInfo?.sealUrl
      }
    };
    
    return NextResponse.json(quoteWithCompanySnapshot);
  } catch (error) {
    logger.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    logger.debug('[PUT /api/quotes/[id]] Quote ID:', id);
    logger.debug('[PUT /api/quotes/[id]] Update data:', JSON.stringify(body, null, 2));
    
    const quoteService = new QuoteService();
    
    // データの前処理：フロントエンドのdescriptionをitemNameに変換
    if (body.items) {
      body.items = body.items.map((item: any) => ({
        ...item,
        itemName: item.description || item.itemName || '',
        description: item.description || '',
      }));
    }
    
    // quoteDateの変換
    if (body.quoteDate) {
      body.issueDate = new Date(body.quoteDate);
      delete body.quoteDate;
    }
    
    // validityDateの変換
    if (body.validityDate) {
      body.validityDate = new Date(body.validityDate);
    }
    
    // 合計金額を再計算
    if (body.items) {
      let subtotal = 0;
      let taxAmount = 0;
      
      body.items.forEach((item: any) => {
        subtotal += item.amount || 0;
        taxAmount += item.taxAmount || 0;
      });
      
      body.subtotal = subtotal;
      body.taxAmount = taxAmount;
      body.totalAmount = subtotal + taxAmount;
    }
    
    const updatedQuote = await quoteService.updateQuote(id, body);
    
    if (!updatedQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedQuote);
  } catch (error) {
    logger.error('Error updating quote:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    logger.debug('[DELETE /api/quotes/[id]] Quote ID:', id);
    
    const quoteService = new QuoteService();
    const deleted = await quoteService.deleteQuote(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}