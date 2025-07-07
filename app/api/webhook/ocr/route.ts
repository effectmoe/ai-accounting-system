import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-singleton';

// Node.js Runtimeを使用
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    console.log('OCR Webhook received:', data);

    // Supabaseクライアントを取得
    const supabase = getSupabaseClient();

    // OCR結果をデータベースに保存
    const { data: savedResult, error } = await supabase
      .from('ocr_results')
      .insert({
        file_name: data.fileName,
        file_id: data.fileId,
        vendor_name: data.documentInfo?.vendorName || '',
        receipt_date: data.documentInfo?.receiptDate || null,
        subtotal_amount: data.documentInfo?.subtotalAmount || null,
        tax_amount: data.documentInfo?.taxAmount || 0,
        total_amount: data.documentInfo?.totalAmount || 0,
        payment_amount: data.documentInfo?.paymentAmount || null,
        change_amount: data.documentInfo?.changeAmount || null,
        receipt_number: data.documentInfo?.receiptNumber || null,
        store_name: data.documentInfo?.storeName || null,
        store_phone: data.documentInfo?.storePhone || null,
        company_name: data.documentInfo?.companyName || null,
        notes: data.documentInfo?.notes || null,
        extracted_text: data.ocrText || '',
        status: 'pending',
        company_id: '11111111-1111-1111-1111-111111111111' // デフォルト会社ID
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('OCR result saved:', savedResult);

    return NextResponse.json({
      success: true,
      data: savedResult
    });

  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return NextResponse.json(
      { 
        error: 'Webhook処理に失敗しました',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONSメソッドを追加（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}