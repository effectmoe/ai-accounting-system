import { NextResponse } from 'next/server';
import { FinancialStatementService } from '@/services/financial-statement.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const service = new FinancialStatementService();
    const result = await service.validateAccountMappings();

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Account validation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '勘定科目検証に失敗しました' },
      { status: 500 }
    );
  }
}
