import { NextRequest, NextResponse } from 'next/server';
import { BankAccountService } from '@/services/bank-account.service';

// PUT: 銀行口座情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const bankAccountService = new BankAccountService();

    const updatedAccount = await bankAccountService.updateBankAccount(params.id, {
      bankName: body.bank_name,
      branchName: body.branch_name,
      accountType: body.account_type,
      accountNumber: body.account_number,
      accountHolder: body.account_holder,
      isDefault: body.is_default,
      notes: body.notes,
    });

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