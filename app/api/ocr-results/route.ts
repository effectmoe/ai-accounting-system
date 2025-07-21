import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔍 [OCR-Results API] リクエスト受信');
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '11111111-1111-1111-1111-111111111111';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // MongoDBからOCR結果を取得
    // documentsコレクションからOCR結果として扱えるものを取得
    const filter = {
      companyId: companyId,
      ocrStatus: { $exists: true },
      $or: [
        { linked_document_id: { $exists: false } },
        { linked_document_id: null }
      ],
      status: { $ne: 'archived' },
      hiddenFromList: { $ne: true }  // hiddenFromListがtrueのものを除外
    };

    console.log('📊 [OCR-Results API] フィルター:', JSON.stringify(filter, null, 2));
    console.log('📄 [OCR-Results API] ページ設定:', { page, limit, skip });
    
    const ocrResults = await db.find('documents', filter, {
      limit,
      skip,
      sort: { createdAt: -1 }
    });
    
    console.log('✅ [OCR-Results API] 取得結果数:', ocrResults.length);
    
    // 最新の3件のデータをデバッグ出力
    if (ocrResults.length > 0) {
      console.log('📅 [OCR-Results API] 最新3件のデータ:');
      ocrResults.slice(0, 3).forEach((doc, index) => {
        console.log(`  ${index + 1}. createdAt: ${doc.createdAt}, receipt_date: ${doc.receipt_date}, vendor: ${doc.vendor_name || doc.vendorName}, amount: ${doc.total_amount || doc.totalAmount}`);
      });
    }

    // OCR結果の形式に変換
    const formattedResults = ocrResults.map(doc => ({
      id: doc._id.toString(),
      company_id: companyId,
      file_name: doc.fileName || doc.file_name || '',
      vendor_name: doc.vendorName || doc.vendor_name || doc.partnerName || '',
      receipt_date: doc.documentDate || doc.receipt_date || doc.issueDate || doc.createdAt,
      subtotal_amount: doc.subtotal_amount || ((doc.totalAmount || 0) - (doc.taxAmount || 0)),
      tax_amount: doc.taxAmount || doc.tax_amount || 0,
      total_amount: doc.totalAmount || doc.total_amount || 0,
      payment_amount: doc.payment_amount || 0,
      change_amount: doc.change_amount || 0,
      receipt_number: doc.receiptNumber || doc.receipt_number || doc.documentNumber || '',
      store_name: doc.store_name || doc.vendorName || '',
      store_phone: doc.store_phone || '',
      company_name: doc.company_name || '',
      notes: doc.notes || '',
      extracted_text: doc.extractedText || doc.extracted_text || '',
      created_at: doc.createdAt,
      status: doc.ocrStatus || 'completed',
      linked_document_id: doc.linked_document_id || null
    }));

    // 総数を取得
    const total = await db.count('documents', filter);

    console.log('📋 [OCR-Results API] フォーマット済み結果数:', formattedResults.length, '総数:', total);
    
    // 全ページ分のデータを取得して最新データを確認
    if (page === 1 && total > limit) {
      console.log('🔍 [OCR-Results API] 全データから最新5件を確認:');
      const allRecent = await db.find('documents', filter, {
        limit: 5,
        skip: 0,
        sort: { createdAt: -1 }
      });
      allRecent.forEach((doc, index) => {
        console.log(`  ${index + 1}. _id: ${doc._id}, createdAt: ${doc.createdAt}, vendor: ${doc.vendor_name || doc.vendorName}, amount: ${doc.total_amount || doc.totalAmount}`);
      });
    }
    
    if (formattedResults.length > 0) {
      console.log('🔎 [OCR-Results API] 最初の結果サンプル:', JSON.stringify(formattedResults[0], null, 2));
    }

    return NextResponse.json({
      success: true,
      data: formattedResults,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('OCR results API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}