import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

// GET: 銀行口座一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // TODO: 実際の実装では認証からcompany_idを取得
    const companyId = '00000000-0000-0000-0000-000000000001'; // 仮のcompany_id

    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || [],
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: '銀行口座の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: 新規銀行口座追加
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // TODO: 実際の実装では認証からcompany_idを取得
    const companyId = '00000000-0000-0000-0000-000000000001'; // 仮のcompany_id

    // バリデーション
    const requiredFields = ['bank_name', 'branch_name', 'account_type', 'account_number', 'account_holder'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `${field}は必須です`,
          },
          { status: 400 }
        );
      }
    }

    // 口座種別のバリデーション
    if (!['普通', '当座', '貯蓄'].includes(body.account_type)) {
      return NextResponse.json(
        {
          success: false,
          error: '無効な口座種別です',
        },
        { status: 400 }
      );
    }

    // 口座番号のバリデーション
    if (!/^\d+$/.test(body.account_number)) {
      return NextResponse.json(
        {
          success: false,
          error: '口座番号は数字のみで入力してください',
        },
        { status: 400 }
      );
    }

    // 新規口座を作成
    const { data: newAccount, error } = await supabase
      .from('bank_accounts')
      .insert({
        company_id: companyId,
        bank_name: body.bank_name,
        branch_name: body.branch_name,
        account_type: body.account_type,
        account_number: body.account_number,
        account_holder: body.account_holder,
        is_default: body.is_default || false,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      account: newAccount,
      message: '銀行口座を追加しました',
    });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      {
        success: false,
        error: '銀行口座の追加に失敗しました',
      },
      { status: 500 }
    );
  }
}