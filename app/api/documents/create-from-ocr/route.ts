import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/services/document-service';
import { DocumentData } from '@/lib/document-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ocrResultId,
      vendor_name,
      receipt_date,
      subtotal_amount = 0,
      tax_amount = 0,
      total_amount = 0,
      payment_amount = 0,
      change_amount = 0,
      receipt_number = '',
      store_name = '',
      store_phone = '',
      company_name = '',
      notes = '',
      file_name
    } = body;

    // 領収書番号を生成（既存の番号があればそれを使用）
    const documentNumber = receipt_number || `REC-${new Date().getTime()}`;

    // DocumentDataフォーマットに変換
    const documentData = {
      documentType: 'receipt' as const,
      documentNumber: documentNumber,
      issueDate: receipt_date || new Date().toISOString().split('T')[0],
      partner: {
        name: vendor_name || store_name || company_name || '不明',
        address: '',
        phone: store_phone || '',
        email: '',
        postal_code: '',
        registrationNumber: ''
      },
      items: [{
        name: file_name || '商品・サービス',
        quantity: 1,
        unitPrice: subtotal_amount || total_amount || 0,
        taxRate: tax_amount > 0 ? 0.10 : 0,
        amount: subtotal_amount || total_amount || 0
      }],
      subtotal: subtotal_amount || Math.max(0, total_amount - tax_amount),
      tax: tax_amount || 0,
      total: total_amount || 0,
      notes: notes || `OCRデータより作成\nお預かり: ¥${payment_amount || 0}\nお釣り: ¥${change_amount || 0}`,
      paymentTerms: '',
      paymentMethod: '現金',
      projectName: ''
    } satisfies DocumentData;

    // デモ用の会社ID
    const companyId = '11111111-1111-1111-1111-111111111111';

    // 文書を保存
    const savedDocument = await DocumentService.saveDocument(
      documentData,
      companyId
    );

    // OCR結果のリンク機能は削除（MongoDBへの移行が必要な場合は別途実装）

    return NextResponse.json({
      id: savedDocument.id,
      message: '領収書を作成しました'
    });

  } catch (error) {
    console.error('Create document from OCR error:', error);
    const errorMessage = error instanceof Error ? error.message : '文書の作成に失敗しました';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}