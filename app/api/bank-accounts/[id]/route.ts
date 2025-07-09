import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

// PUT: 銀行口座情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const accountId = params.id;

    // TODO: 実際の実装では認証からcompany_idを取得
    const companyId = '00000000-0000-0000-0000-000000000001'; // 仮のcompany_id

    // まず、該当の口座が存在し、かつ権限があるか確認
    const { data: existingAccount, error: fetchError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !existingAccount) {
      return NextResponse.json(
        {
          success: false,
          error: '銀行口座が見つかりません',
        },
        { status: 404 }
      );
    }

    // 更新可能なフィールドを抽出
    const updateFields: any = {};
    const allowedFields = [
      'bank_name', 'branch_name', 'account_type', 
      'account_number', 'account_holder', 'is_default', 'notes'
    ];

    allowedFields.forEach(field => {
      if (body.hasOwnProperty(field)) {
        updateFields[field] = body[field];
      }
    });

    // バリデーション
    if (updateFields.account_type && !['普通', '当座', '貯蓄'].includes(updateFields.account_type)) {
      return NextResponse.json(
        {
          success: false,
          error: '無効な口座種別です',
        },
        { status: 400 }
      );
    }

    if (updateFields.account_number && !/^\d+$/.test(updateFields.account_number)) {
      return NextResponse.json(
        {
          success: false,
          error: '口座番号は数字のみで入力してください',
        },
        { status: 400 }
      );
    }

    // 更新実行
    const { data: updatedAccount, error: updateError } = await supabase
      .from('bank_accounts')
      .update(updateFields)
      .eq('id', accountId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      message: '銀行口座を更新しました',
    });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json(
      {
        success: false,
        error: '銀行口座の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

// DELETE: 銀行口座削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const accountId = params.id;

    // TODO: 実際の実装では認証からcompany_idを取得
    const companyId = '00000000-0000-0000-0000-000000000001'; // 仮のcompany_id

    // まず、該当の口座が存在し、かつ権限があるか確認
    const { data: existingAccount, error: fetchError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !existingAccount) {
      return NextResponse.json(
        {
          success: false,
          error: '銀行口座が見つかりません',
        },
        { status: 404 }
      );
    }

    // デフォルト口座の場合、他に口座があるか確認
    if (existingAccount.is_default) {
      const { data: otherAccounts } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .neq('id', accountId)
        .limit(1);

      if (otherAccounts && otherAccounts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'デフォルト口座は削除できません。他の口座をデフォルトに設定してから削除してください。',
          },
          { status: 400 }
        );
      }
    }

    // 論理削除（is_activeをfalseに設定）
    const { error: deleteError } = await supabase
      .from('bank_accounts')
      .update({ is_active: false })
      .eq('id', accountId)
      .eq('company_id', companyId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: '銀行口座を削除しました',
    });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json(
      {
        success: false,
        error: '銀行口座の削除に失敗しました',
      },
      { status: 500 }
    );
  }
}