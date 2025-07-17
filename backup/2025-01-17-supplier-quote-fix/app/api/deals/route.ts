import { NextRequest, NextResponse } from 'next/server';
import { DealService } from '@/services/deal.service';
import { DealStatus } from '@/types/collections';

// GET: 案件一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params = {
      status: searchParams.get('status') as DealStatus | undefined,
      dealType: searchParams.get('dealType') as 'sale' | 'purchase' | 'both' | undefined,
      customerId: searchParams.get('customerId') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sortBy: searchParams.get('sortBy') || 'startDate',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    };

    // 日付範囲のパラメータ
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      params.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const result = await DealService.getDeals(params);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST: 案件作成
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 必須フィールドのバリデーション
    if (!data.dealName || !data.customerId) {
      return NextResponse.json(
        { error: 'Deal name and customer ID are required' },
        { status: 400 }
      );
    }

    // デフォルト値の設定
    data.startDate = data.startDate || new Date();
    data.dealType = data.dealType || 'sale';

    const deal = await DealService.createDeal(data);
    
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}