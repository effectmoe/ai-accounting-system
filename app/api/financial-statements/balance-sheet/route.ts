import { NextRequest, NextResponse } from 'next/server';
import { FinancialStatementService } from '@/services/financial-statement.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || 'all';
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];
    const fiscalYear = searchParams.get('fiscalYear')
      ? parseInt(searchParams.get('fiscalYear')!, 10)
      : undefined;

    if (isNaN(Date.parse(asOfDate))) {
      return NextResponse.json(
        { success: false, error: '不正な日付形式です' },
        { status: 400 }
      );
    }

    const service = new FinancialStatementService();
    const result = await service.generateBalanceSheet(companyId, asOfDate, fiscalYear);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Balance sheet generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '貸借対照表の生成に失敗しました' },
      { status: 500 }
    );
  }
}
