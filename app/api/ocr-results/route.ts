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
    const documentType = searchParams.get('documentType') || '';

    // MongoDBからOCR結果を取得
    // ocr_resultsコレクションから取得（83件のデータが存在する）
    // フィルターを最小限にしてデータを表示
    const filter: any = {};
    
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
    
    // ドキュメントタイプフィルター
    if (documentType) {
      filter.documentType = documentType;
    }

    console.log('📊 [OCR-Results API] フィルター:', JSON.stringify(filter, null, 2));
    console.log('📄 [OCR-Results API] ページ設定:', { page, limit, skip });
    console.log('🔄 [OCR-Results API] ソート設定:', { sortBy, sortOrder });
    
    // ソート設定を決定（セカンダリソートを含む）
    let sortOptions: any = {};
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortBy) {
      case 'date':
        // 日付でソートし、同じ日付の場合は作成日時でソート
        sortOptions = {
          receipt_date: sortDirection,
          createdAt: sortDirection
        };
        break;
      case 'vendor':
        // ベンダー名でソートし、同じ名前の場合は作成日時でソート
        sortOptions = {
          vendor_name: sortDirection,
          createdAt: sortDirection
        };
        break;
      case 'amount':
        // 金額でソートし、同じ金額の場合は作成日時でソート
        sortOptions = {
          total_amount: sortDirection,
          createdAt: sortDirection
        };
        break;
      default:
        sortOptions = {
          createdAt: sortDirection
        };
    }
    
    console.log('🔄 [OCR-Results API] ソートオプション:', sortOptions);
    
    // OCR結果を取得（ソートを適用）
    const ocrResults = await db.find('ocr_results', filter, {
      limit,
      skip,
      sort: sortOptions
    });
    
    console.log('✅ [OCR-Results API] 取得結果数:', ocrResults.length);
    
    // デバッグ: ソート結果を確認
    if (ocrResults.length > 0) {
      console.log(`🔄 [OCR-Results API] ページ${page}のソート結果サンプル (最初の3件):`);
      ocrResults.slice(0, 3).forEach((doc, index) => {
        const dateValue = doc.receipt_date || doc.documentDate || doc.issueDate || doc.createdAt;
        const vendorValue = doc.vendor_name || doc.vendorName || doc.store_name || doc.partnerName || 'N/A';
        const amountValue = doc.total_amount || doc.totalAmount || 0;
        const globalIndex = skip + index + 1;
        console.log(`  #${globalIndex} (Page ${page}, Item ${index + 1}). Date: ${dateValue}, Vendor: ${vendorValue}, Amount: ${amountValue}`);
      });
      
      // ページ2の場合、前ページの最後のデータを確認
      if (page === 2) {
        console.log('🔍 [OCR-Results API] ページ1の最後のデータを確認:');
        const previousPageLast = await db.find('ocr_results', filter, {
          limit: 3,
          skip: limit - 3,
          sort: sortOptions
        });
        
        previousPageLast.forEach((doc, index) => {
          const dateValue = doc.receipt_date || doc.documentDate || doc.issueDate || doc.createdAt;
          const vendorValue = doc.vendor_name || doc.vendorName || doc.store_name || doc.partnerName || 'N/A';
          const amountValue = doc.total_amount || doc.totalAmount || 0;
          const globalIndex = limit - 2 + index;
          console.log(`  #${globalIndex} (Page 1, Item ${18 + index}). Date: ${dateValue}, Vendor: ${vendorValue}, Amount: ${amountValue}`);
        });
      }
    }
    
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
        const targetDoc = await db.findOne('ocr_results', { _id: new ObjectId(targetId) });
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
      document_type: doc.documentType || doc.type || 'receipt', // ドキュメントタイプを追加
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
      linked_document_id: doc.linked_document_id || null,
      category: doc.category || null,
      subcategory: doc.subcategory || null,
      aiPrediction: doc.aiPrediction || null
    }));

    // 総数を取得（フィルター適用後の総数）
    const total = await db.count('ocr_results', filter);
    
    // デバッグ: ページング情報を出力
    console.log('📄 [OCR-Results API] ページング情報:', {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      showingFrom: skip + 1,
      showingTo: Math.min(skip + limit, total)
    });
    
    // デバッグ: 全ページのデータを確認（最初の5件と最後の5件）
    if (page === 1 && total > limit) {
      console.log('🔍 [OCR-Results API] 全データのソート状態を確認:');
      
      // 最初の5件
      const firstFive = await db.find('ocr_results', filter, {
        limit: 5,
        skip: 0,
        sort: sortOptions
      });
      
      console.log('🔼 最初の5件:');
      firstFive.forEach((doc, index) => {
        const dateValue = doc.receipt_date || doc.documentDate || doc.issueDate || doc.createdAt;
        const vendorValue = doc.vendor_name || doc.vendorName || doc.store_name || doc.partnerName || 'N/A';
        const amountValue = doc.total_amount || doc.totalAmount || 0;
        console.log(`  ${index + 1}. Date: ${dateValue}, Vendor: ${vendorValue}, Amount: ${amountValue}`);
      });
      
      // 最後の5件
      const lastFive = await db.find('ocr_results', filter, {
        limit: 5,
        skip: Math.max(0, total - 5),
        sort: sortOptions
      });
      
      console.log('🔽 最後の5件:');
      lastFive.forEach((doc, index) => {
        const dateValue = doc.receipt_date || doc.documentDate || doc.issueDate || doc.createdAt;
        const vendorValue = doc.vendor_name || doc.vendorName || doc.store_name || doc.partnerName || 'N/A';
        const amountValue = doc.total_amount || doc.totalAmount || 0;
        console.log(`  ${total - 4 + index}. Date: ${dateValue}, Vendor: ${vendorValue}, Amount: ${amountValue}`);
      });
    }

    console.log('📋 [OCR-Results API] フォーマット済み結果数:', formattedResults.length, '総数:', total);
    
    // 全ページ分のデータを取得して最新データを確認
    if (page === 1 && total > limit) {
      console.log('🔍 [OCR-Results API] 全データから最新5件を確認:');
      const allRecent = await db.find('ocr_results', filter, {
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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // より詳細なエラー情報を返す
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      type: error?.constructor?.name || 'Unknown',
      // 開発環境のみスタックトレースを含める
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined
      })
    };
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        debug: errorDetails
      },
      { status: 500 }
    );
  }
}