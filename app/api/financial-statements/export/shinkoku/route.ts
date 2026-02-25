import { NextRequest, NextResponse } from 'next/server';
import { FinancialStatementService } from '@/services/financial-statement.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || 'all';
    const fiscalYear = parseInt(searchParams.get('fiscalYear') || String(new Date().getFullYear()), 10);
    const format = searchParams.get('format') || 'json';

    // 会計年度の期間を計算（4月〜3月）
    const periodStart = searchParams.get('periodStart') || `${fiscalYear}-04-01`;
    const periodEnd = searchParams.get('periodEnd') || `${fiscalYear + 1}-03-31`;

    const service = new FinancialStatementService();
    const result = await service.exportForShinkoku(companyId, fiscalYear, periodStart, periodEnd);

    if (format === 'csv') {
      const csv = convertToCSV(result);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="shinkoku_export_${fiscalYear}.csv"`,
        },
      });
    }

    // JSONダウンロード
    if (searchParams.get('download') === 'true') {
      return new Response(JSON.stringify(result, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="shinkoku_export_${fiscalYear}.json"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Shinkoku export error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'shinkokuエクスポートに失敗しました' },
      { status: 500 }
    );
  }
}

function convertToCSV(result: any): string {
  const BOM = '\uFEFF';
  const header = 'journal_id,date,description,account_code,account_name,debit,credit,tax_category';
  const rows = result.journals.flatMap((j: any) =>
    j.lines.map((line: any) =>
      [
        j.journal_id,
        j.date,
        `"${(j.description || '').replace(/"/g, '""')}"`,
        line.account_code,
        `"${(line.account_name || '').replace(/"/g, '""')}"`,
        line.debit,
        line.credit,
        line.tax_category,
      ].join(',')
    )
  );

  return BOM + [header, ...rows].join('\n');
}
