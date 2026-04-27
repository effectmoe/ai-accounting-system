import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';

import { logger } from '@/lib/logger';
interface Account {
  id: string;
  code: string;
  name: string;
  name_kana: string | null;
  account_type: string;
  display_name: string | null;
  tax_category: string | null;
  balance: number;
  is_active: boolean;
}

// GET: アカウント一覧取得
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const collection = db.collection('accounts');

    // アカウントデータを取得（codeでソート）
    const accounts = await collection
      .find({})
      .sort({ code: 1 })
      .toArray();

    // MongoDBの_idをidに変換し、必要なフィールドをマッピング
    // 新旧両方のフィールド名に対応（accountCode or code）
    const formattedAccounts: Account[] = accounts.map(account => ({
      id: account._id.toString(),
      code: account.accountCode || account.code || '',
      name: account.accountName || account.name || '',
      name_kana: account.accountNameKana || account.name_kana || null,
      account_type: account.accountType || account.account_type || 'asset',
      display_name: account.display_name || null,
      tax_category: account.taxCategory || account.tax_category || null,
      balance: account.balance || 0,
      is_active: account.isActive !== undefined ? account.isActive : (account.is_active !== false),
    }));

    return NextResponse.json({
      success: true,
      accounts: formattedAccounts,
    });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    return NextResponse.json(
      { success: false, error: '勘定科目データの取得に失敗しました' },
      { status: 500 }
    );
  }
}