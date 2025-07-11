import { NextRequest, NextResponse } from 'next/server';
import { BankAccountService } from '@/services/bank-account.service';

// データベースのキャメルケースからAPIのスネークケースへ変換
function transformBankAccountToApi(account: any) {
  return {
    id: account._id?.toString() || account.id,
    bank_name: account.bankName,
    branch_name: account.branchName,
    account_type: mapAccountTypeToJapanese(account.accountType),
    account_number: account.accountNumber,
    account_holder: account.accountHolder,
    is_default: account.isDefault || false,
    is_active: account.isActive !== false,
    notes: account.notes || null,
    created_at: account.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: account.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

// 口座種別を英語から日本語へ変換
function mapAccountTypeToJapanese(type: string): '普通' | '当座' | '貯蓄' {
  switch(type) {
    case 'checking':
    case '当座':
      return '当座';
    case 'savings':
    case '貯蓄':
      return '貯蓄';
    case 'regular':
    case '普通':
    default:
      return '普通';
  }
}

// 口座種別を日本語から英語へ変換
function mapAccountTypeToEnglish(type: string): 'checking' | 'savings' {
  switch(type) {
    case '当座':
      return 'checking';
    case '貯蓄':
    case 'savings':
      return 'savings';
    case '普通':
    default:
      return 'savings'; // デフォルトは savings (普通預金相当)
  }
}

// PUT: 銀行口座情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const bankAccountService = new BankAccountService();

    // 更新データを準備
    const updateData: any = {};
    
    if (body.bank_name !== undefined) updateData.bankName = body.bank_name;
    if (body.branch_name !== undefined) updateData.branchName = body.branch_name;
    if (body.account_type !== undefined) updateData.accountType = mapAccountTypeToEnglish(body.account_type);
    if (body.account_number !== undefined) updateData.accountNumber = body.account_number;
    if (body.account_holder !== undefined) updateData.accountHolder = body.account_holder;
    if (body.is_default !== undefined) updateData.isDefault = body.is_default;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    const updatedAccount = await bankAccountService.updateBankAccount(params.id, updateData);

    if (!updatedAccount) {
      return NextResponse.json(
        {
          success: false,
          error: '銀行口座が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      account: transformBankAccountToApi(updatedAccount),
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

// DELETE: 銀行口座削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bankAccountService = new BankAccountService();
    const deletedAccount = await bankAccountService.deleteBankAccount(params.id);

    if (!deletedAccount) {
      return NextResponse.json(
        {
          success: false,
          error: '銀行口座が見つかりません',
        },
        { status: 404 }
      );
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