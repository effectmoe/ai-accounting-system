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

// GET: 銀行口座一覧取得
export async function GET(request: NextRequest) {
  try {
    const bankAccountService = new BankAccountService();
    const accounts = await bankAccountService.getAllBankAccounts();

    // 取得したデータをAPI形式に変換
    const transformedAccounts = accounts.map(account => transformBankAccountToApi(account));
    
    return NextResponse.json({
      success: true,
      accounts: transformedAccounts,
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
    const body = await request.json();
    const bankAccountService = new BankAccountService();

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
    const newAccount = await bankAccountService.createBankAccount({
      bankName: body.bank_name,
      branchName: body.branch_name,
      accountType: mapAccountTypeToEnglish(body.account_type),
      accountNumber: body.account_number,
      accountHolder: body.account_holder,
      isDefault: body.is_default || false,
      notes: body.notes || null,
    });

    return NextResponse.json({
      success: true,
      account: transformBankAccountToApi(newAccount),
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