import { NextResponse } from 'next/server';
import { getSupportedBanks } from '@/lib/bank-parsers';

/**
 * GET /api/bank-import/banks
 * 対応銀行一覧を取得
 */
export async function GET() {
  const banks = getSupportedBanks();

  return NextResponse.json({
    success: true,
    banks: banks.map(b => ({
      type: b.type,
      code: b.info.code,
      name: b.info.name,
      nameEn: b.info.nameEn,
    })),
  });
}
