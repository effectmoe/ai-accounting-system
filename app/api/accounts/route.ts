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
    const formattedAccounts: Account[] = accounts.map(account => ({
      id: account._id.toString(),
      code: account.code || '',
      name: account.name || '',
      name_kana: account.name_kana || null,
      account_type: account.account_type || 'asset',
      display_name: account.display_name || null,
      tax_category: account.tax_category || null,
      balance: account.balance || 0,
      is_active: account.is_active !== false, // デフォルトはtrue
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