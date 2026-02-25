import { NextRequest, NextResponse } from 'next/server';
import { FinancialStatementService } from '@/services/financial-statement.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { success: false, error: 'dateFrom と dateTo は必須です' },
        { status: 400 }
      );
    }

    const service = new FinancialStatementService();
    const result = await service.generateTrialBalance(companyId, dateFrom, dateTo);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Trial balance generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '試算表の生成に失敗しました' },
      { status: 500 }
    );
  }
}
