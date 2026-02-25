import { NextRequest, NextResponse } from 'next/server';
import { FinancialStatementService } from '@/services/financial-statement.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || 'all';
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const includeYoY = searchParams.get('includeYoY') === 'true';

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, error: 'periodStart と periodEnd は必須です' },
        { status: 400 }
      );
    }

    if (isNaN(Date.parse(periodStart)) || isNaN(Date.parse(periodEnd))) {
      return NextResponse.json(
        { success: false, error: '不正な日付形式です' },
        { status: 400 }
      );
    }

    const service = new FinancialStatementService();
    const result = await service.generateProfitLoss(companyId, periodStart, periodEnd, { includeYoY });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Profit/Loss generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '損益計算書の生成に失敗しました' },
      { status: 500 }
    );
  }
}
