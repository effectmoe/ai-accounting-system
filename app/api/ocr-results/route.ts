import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔍 [OCR-Results API] リクエスト受信');
  
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '11111111-1111-1111-1111-111111111111';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // ソートパラメータ
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // フィルターパラメータ
    const vendorFilter = searchParams.get('vendor') || '';
    const minAmount = searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : null;
    const maxAmount = searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : null;
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // MongoDBからOCR結果を取得
    // documentsコレクションからOCR結果として扱えるものを取得
    const filter: any = {
      companyId: companyId,
      ocrStatus: { $exists: true },
      $or: [
        { linked_document_id: { $exists: false } },
        { linked_document_id: null }
      ],
      status: { $ne: 'archived' },
      hiddenFromList: { $ne: true }  // hiddenFromListがtrueのものを除外
    };
    
    // ベンダー名フィルター
    if (vendorFilter) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { vendor_name: { $regex: vendorFilter, $options: 'i' } },
          { vendorName: { $regex: vendorFilter, $options: 'i' } },
          { store_name: { $regex: vendorFilter, $options: 'i' } }
        ]
      });
    }
    
    // 金額フィルター
    if (minAmount !== null || maxAmount !== null) {
      filter.$and = filter.$and || [];
      const amountFilter: any = {
        $or: [
          { total_amount: {} },
          { totalAmount: {} }
        ]
      };
      
      if (minAmount !== null) {
        amountFilter.$or[0].total_amount.$gte = minAmount;
        amountFilter.$or[1].totalAmount.$gte = minAmount;
      }
      if (maxAmount !== null) {
        amountFilter.$or[0].total_amount.$lte = maxAmount;
        amountFilter.$or[1].totalAmount.$lte = maxAmount;
      }
      
      filter.$and.push(amountFilter);
    }
    
    // 日付フィルター
    if (startDate || endDate) {
      filter.$and = filter.$and || [];
      const dateFilter: any = {
        $or: [
          { receipt_date: {} },
          { documentDate: {} },
          { issueDate: {} }
        ]
      };
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.$or.forEach((f: any) => {
          Object.keys(f).forEach(key => {
            f[key].$gte = start;
          });
        });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$or.forEach((f: any) => {
          Object.keys(f).forEach(key => {
            f[key].$lte = end;
          });
        });
      }
      
      filter.$and.push(dateFilter);
    }

    console.log('📊 [OCR-Results API] フィルター:', JSON.stringify(filter, null, 2));
    console.log('📄 [OCR-Results API] ページ設定:', { page, limit, skip });
    console.log('🔄 [OCR-Results API] ソート設定:', { sortBy, sortOrder });
    
    // ソート設定を決定
    let sortField = 'createdAt';
    switch (sortBy) {
      case 'date':
        sortField = 'receipt_date';
        break;
      case 'vendor':
        sortField = 'vendor_name';
        break;
      case 'amount':
        sortField = 'total_amount';
        break;
      default:
        sortField = 'createdAt';
    }
    
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    
    const ocrResults = await db.find('documents', filter, {
      limit,
      skip,
      sort: { [sortField]: sortDirection }
    });
    
    console.log('✅ [OCR-Results API] 取得結果数:', ocrResults.length);
    
    // 最新の3件のデータをデバッグ出力
    if (ocrResults.length > 0) {
      console.log('📅 [OCR-Results API] 最新3件のデータ:');
      ocrResults.slice(0, 3).forEach((doc, index) => {
        console.log(`  ${index + 1}. _id: ${doc._id}, createdAt: ${doc.createdAt}, receipt_date: ${doc.receipt_date}, vendor: ${doc.vendor_name || doc.vendorName}, amount: ${doc.total_amount || doc.totalAmount}`);
      });
    }
    
    // 特定のIDを検索（複数のIDを順番に確認）
    const targetIds = [
      '687e38a478e107710fecb492',  // 最新
      '687e370963c1a5fa866d74d5',  // 2番目
      '687e3501d18421a3ce4e7f53'   // 3番目
    ];
    let debugInfo = null;
    
    for (const targetId of targetIds) {
      try {
        const targetDoc = await db.findOne('documents', { _id: new ObjectId(targetId) });
        if (targetDoc) {
          const checks = {
            hasOcrStatus: !!targetDoc.ocrStatus,
            linkedDocIdOk: !targetDoc.linked_document_id,
            statusOk: targetDoc.status !== 'archived',
            notHidden: targetDoc.hiddenFromList !== true,
            companyIdOk: targetDoc.companyId === companyId
          };
          
          const passesAll = Object.values(checks).every(v => v);
          
          debugInfo = {
            targetId,
            found: true,
            doc: {
              _id: targetDoc._id.toString(),
              ocrStatus: targetDoc.ocrStatus,
              linked_document_id: targetDoc.linked_document_id,
              status: targetDoc.status,
              hiddenFromList: targetDoc.hiddenFromList,
              companyId: targetDoc.companyId
            },
            filterChecks: checks,
            passesAll
          };
          
          console.log('🎯 [OCR-Results API] デバッグ情報:', JSON.stringify(debugInfo, null, 2));
          break;
        }
      } catch (e) {
        console.log('❌ [OCR-Results API] ID検索エラー:', targetId, e);
      }
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
      limit,
      debugInfo: debugInfo
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