import { NextRequest, NextResponse } from 'next/server';
import { bankTransactionService } from '@/services/bank-transaction.service';
import { logger } from '@/lib/logger';
import { BankTransaction } from '@/types/bank-transaction';

/**
 * GET /api/bank-import/export
 * 銀行取引データをエクスポート
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const bankType = searchParams.get('bankType');
    const matchStatus = searchParams.get('matchStatus');
    const confirmed = searchParams.get('confirmed');
    const importId = searchParams.get('importId');

    // フィルター条件を構築
    const filter: Record<string, unknown> = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        (filter.date as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (filter.date as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    if (bankType) {
      filter.bankType = bankType;
    }

    if (matchStatus) {
      if (matchStatus === 'matched') {
        filter.matchedInvoiceId = { $exists: true, $ne: null };
      } else if (matchStatus === 'unmatched') {
        filter.matchedInvoiceId = { $exists: false };
      }
    }

    if (confirmed !== null && confirmed !== undefined) {
      filter.isConfirmed = confirmed === 'true';
    }

    if (importId) {
      filter.importId = importId;
    }

    // データを取得（最大10000件）
    const result = await bankTransactionService.getTransactions({
      filter,
      limit: 10000,
      offset: 0,
    });

    if (result.items.length === 0) {
      return NextResponse.json(
        { error: 'エクスポートするデータがありません' },
        { status: 404 }
      );
    }

    // フォーマットに応じてエクスポート
    if (format === 'csv') {
      const csv = generateCSV(result.items);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="bank_transactions_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'tsv') {
      const tsv = generateTSV(result.items);
      return new NextResponse(tsv, {
        headers: {
          'Content-Type': 'text/tab-separated-values; charset=utf-8',
          'Content-Disposition': `attachment; filename="bank_transactions_${new Date().toISOString().split('T')[0]}.tsv"`,
        },
      });
    } else if (format === 'json') {
      const json = JSON.stringify(result.items, null, 2);
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="bank_transactions_${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'サポートされていないフォーマットです（csv, tsv, json のみ）' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Error in GET /api/bank-import/export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エクスポートに失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * CSV形式でデータを生成
 */
function generateCSV(transactions: BankTransaction[]): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const headers = [
    '取引日',
    '銀行種別',
    '口座番号',
    '口座名義',
    '摘要',
    '入金額',
    '出金額',
    '残高',
    'マッチング状態',
    'マッチング確信度',
    'マッチング請求書ID',
    '確認済み',
    'インポート日時',
  ];

  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.bankType || '',
    t.accountNumber || '',
    t.accountName || '',
    escapeCsvField(t.description),
    t.amount > 0 ? t.amount.toString() : '',
    t.amount < 0 ? Math.abs(t.amount).toString() : '',
    t.balance?.toString() || '',
    getMatchStatusLabel(t),
    t.matchConfidence || '',
    t.matchedInvoiceId || '',
    t.isConfirmed ? 'はい' : 'いいえ',
    formatDateTime(t.createdAt),
  ]);

  return BOM + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * TSV形式でデータを生成
 */
function generateTSV(transactions: BankTransaction[]): string {
  const BOM = '\uFEFF';
  const headers = [
    '取引日',
    '銀行種別',
    '口座番号',
    '口座名義',
    '摘要',
    '入金額',
    '出金額',
    '残高',
    'マッチング状態',
    'マッチング確信度',
    'マッチング請求書ID',
    '確認済み',
    'インポート日時',
  ];

  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.bankType || '',
    t.accountNumber || '',
    t.accountName || '',
    escapeTsvField(t.description),
    t.amount > 0 ? t.amount.toString() : '',
    t.amount < 0 ? Math.abs(t.amount).toString() : '',
    t.balance?.toString() || '',
    getMatchStatusLabel(t),
    t.matchConfidence || '',
    t.matchedInvoiceId || '',
    t.isConfirmed ? 'はい' : 'いいえ',
    formatDateTime(t.createdAt),
  ]);

  return BOM + [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
}

/**
 * CSVフィールドをエスケープ
 */
function escapeCsvField(field: string): string {
  if (!field) return '';
  // カンマ、ダブルクォート、改行が含まれる場合はダブルクォートで囲む
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * TSVフィールドをエスケープ
 */
function escapeTsvField(field: string): string {
  if (!field) return '';
  // タブと改行を置換
  return field.replace(/\t/g, ' ').replace(/\n/g, ' ');
}

/**
 * 日付をフォーマット
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 日時をフォーマット
 */
function formatDateTime(date: Date | string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * マッチング状態のラベルを取得
 */
function getMatchStatusLabel(transaction: BankTransaction): string {
  if (transaction.matchedInvoiceId) {
    return 'マッチ済み';
  }
  return '未マッチ';
}
