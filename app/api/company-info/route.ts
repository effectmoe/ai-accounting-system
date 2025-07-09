import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

// GET: 自社情報取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // TODO: 実際の実装では認証からcompany_idを取得
    const companyId = '00000000-0000-0000-0000-000000000001'; // 仮のcompany_id

    // companiesテーブルから基本情報を取得
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError && companyError.code !== 'PGRST116') {
      throw companyError;
    }

    // company_infoテーブルから追加情報を取得
    const { data: companyInfo, error: infoError } = await supabase
      .from('company_info')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (infoError && infoError.code !== 'PGRST116') {
      throw infoError;
    }

    // 両方のデータをマージ
    const mergedData = {
      ...company,
      ...companyInfo,
      id: company?.id || companyId,
    };

    return NextResponse.json({
      success: true,
      companyInfo: mergedData,
    });
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      {
        success: false,
        error: '自社情報の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: 自社情報更新
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // TODO: 実際の実装では認証からcompany_idを取得
    const companyId = '00000000-0000-0000-0000-000000000001'; // 仮のcompany_id

    // companiesテーブルのフィールド
    const companyFields = [
      'name', 'postal_code', 'address', 'phone_number', 'fax_number',
      'email', 'website', 'representative', 'established_date',
      'capital', 'fiscal_year_end', 'tax_number'
    ];

    // company_infoテーブルのフィールド
    const infoFields = [
      'logo_image', 'stamp_image', 'invoice_prefix',
      'invoice_notes', 'payment_terms'
    ];

    // データを分割
    const companyData: any = {};
    const infoData: any = {};

    Object.keys(body).forEach(key => {
      if (companyFields.includes(key)) {
        companyData[key] = body[key];
      } else if (infoFields.includes(key)) {
        infoData[key] = body[key];
      }
    });

    // companiesテーブルを更新
    if (Object.keys(companyData).length > 0) {
      const { error: companyError } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', companyId);

      if (companyError) {
        throw companyError;
      }
    }

    // company_infoテーブルを更新または挿入
    if (Object.keys(infoData).length > 0) {
      // まず既存のレコードがあるか確認
      const { data: existingInfo } = await supabase
        .from('company_info')
        .select('id')
        .eq('company_id', companyId)
        .single();

      if (existingInfo) {
        // 更新
        const { error: infoError } = await supabase
          .from('company_info')
          .update(infoData)
          .eq('company_id', companyId);

        if (infoError) {
          throw infoError;
        }
      } else {
        // 挿入
        const { error: insertError } = await supabase
          .from('company_info')
          .insert({
            ...infoData,
            company_id: companyId,
          });

        if (insertError) {
          throw insertError;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '自社情報を更新しました',
    });
  } catch (error) {
    console.error('Error updating company info:', error);
    return NextResponse.json(
      {
        success: false,
        error: '自社情報の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: 画像アップロード（Base64として保存）
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { type, image } = body;

    if (!type || !image) {
      return NextResponse.json(
        {
          success: false,
          error: '画像タイプとデータが必要です',
        },
        { status: 400 }
      );
    }

    // TODO: 実際の実装では認証からcompany_idを取得
    const companyId = '00000000-0000-0000-0000-000000000001'; // 仮のcompany_id

    const fieldName = type === 'logo' ? 'logo_image' : 'stamp_image';

    // company_infoテーブルを更新
    const { error } = await supabase
      .from('company_info')
      .upsert({
        company_id: companyId,
        [fieldName]: image,
      }, {
        onConflict: 'company_id',
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: '画像をアップロードしました',
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      {
        success: false,
        error: '画像のアップロードに失敗しました',
      },
      { status: 500 }
    );
  }
}