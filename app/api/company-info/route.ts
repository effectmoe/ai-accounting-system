import { NextRequest, NextResponse } from 'next/server';
import { CompanyInfoService } from '@/services/company-info.service';

// GET: 会社情報取得
export async function GET(request: NextRequest) {
  try {
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    if (!companyInfo) {
      return NextResponse.json({
        success: true,
        company_info: null,
        message: '会社情報が未設定です',
      });
    }

    return NextResponse.json({
      success: true,
      company_info: companyInfo,
    });
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      {
        success: false,
        error: '会社情報の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: 会社情報作成・更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const companyInfoService = new CompanyInfoService();

    // バリデーション
    const requiredFields = ['company_name', 'postal_code', 'address'];
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

    // 郵便番号のバリデーション
    if (!/^\d{3}-?\d{4}$/.test(body.postal_code)) {
      return NextResponse.json(
        {
          success: false,
          error: '郵便番号の形式が無効です（例: 123-4567）',
        },
        { status: 400 }
      );
    }

    // 会社情報を更新または作成
    const companyInfo = await companyInfoService.upsertCompanyInfo({
      companyName: body.company_name,
      postalCode: body.postal_code,
      address: body.address,
      phone: body.phone || null,
      email: body.email || null,
      registrationNumber: body.registration_number || null,
      invoiceNumberFormat: body.invoice_number_format || null,
    });

    return NextResponse.json({
      success: true,
      company_info: companyInfo,
      message: '会社情報を保存しました',
    });
  } catch (error) {
    console.error('Error saving company info:', error);
    return NextResponse.json(
      {
        success: false,
        error: '会社情報の保存に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: 会社情報更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const companyInfoService = new CompanyInfoService();

    // 会社情報を更新
    const companyInfo = await companyInfoService.updateCompanyInfo({
      companyName: body.company_name,
      postalCode: body.postal_code,
      address: body.address,
      phone: body.phone,
      email: body.email,
      registrationNumber: body.registration_number,
      invoiceNumberFormat: body.invoice_number_format,
    });

    if (!companyInfo) {
      return NextResponse.json(
        {
          success: false,
          error: '会社情報が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      company_info: companyInfo,
      message: '会社情報を更新しました',
    });
  } catch (error) {
    console.error('Error updating company info:', error);
    return NextResponse.json(
      {
        success: false,
        error: '会社情報の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}