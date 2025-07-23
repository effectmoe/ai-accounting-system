import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, Collections } from '@/lib/mongodb-client';

import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.debug('Received request body:', JSON.stringify(body, null, 2));
    const {
      ocrResultId,
      document_type = 'receipt',
      vendor_name = '',
      receipt_date = new Date().toISOString().split('T')[0],
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
      file_name = '文書',
      // 駐車場関連フィールド
      receiptType,
      facilityName,
      entryTime,
      exitTime,
      parkingDuration,
      baseFee,
      additionalFee
    } = body;

    // MongoDB データベース接続
    const db = DatabaseService.getInstance();
    const companyId = '11111111-1111-1111-1111-111111111111';
    
    // 小計を計算（subtotal_amountが提供されていない場合は、total_amountから税額を引く）
    const calculatedSubtotal = subtotal_amount > 0 ? subtotal_amount : Math.max(0, total_amount - tax_amount);
    
    // パートナー名を決定（vendor_name, store_name, company_nameの優先順）
    const partnerName = vendor_name || store_name || company_name || '不明';
    
    // 駐車場領収書の判定と情報抽出
    let extractedParkingInfo: any = {};
    const isTimesReceipt = partnerName.includes('タイムズ') || vendor_name?.includes('タイムズ');
    
    if (isTimesReceipt && (!receiptType || !facilityName)) {
      // notesフィールドから駐車場情報を抽出
      if (notes) {
        const parkingTimeMatch = notes.match(/駐車時間[:：]\s*([^,、]+)/);
        if (parkingTimeMatch) {
          extractedParkingInfo.parkingDuration = parkingTimeMatch[1].trim();
        }
        
        // 施設名をベンダー名から推測（例：タイムズ福岡城三の丸）
        if (vendor_name && vendor_name.includes('タイムズ')) {
          extractedParkingInfo.facilityName = vendor_name;
        }
      }
      
      // デフォルト値を設定
      extractedParkingInfo.receiptType = 'parking';
      extractedParkingInfo.companyName = 'タイムズ24株式会社';
    }
    
    // 備考欄に支払い情報を含める
    const enhancedNotes = [
      notes || 'OCRデータより作成',
      payment_amount > 0 ? `お預かり: ¥${payment_amount.toLocaleString()}` : '',
      change_amount > 0 ? `お釣り: ¥${change_amount.toLocaleString()}` : '',
      receipt_number ? `領収書番号: ${receipt_number}` : ''
    ].filter(n => n).join('\n');

    // 文書番号のプレフィックスを文書種別に応じて変更
    const prefixMap = {
      receipt: 'REC',
      invoice: 'INV',
      estimate: 'EST',
      delivery_note: 'DLV'
    };
    const prefix = prefixMap[document_type as keyof typeof prefixMap] || 'DOC';

    // 保存するデータを準備
    const documentData = {
        companyId: companyId,
        documentType: document_type,
        type: document_type,
        documentNumber: receipt_number || `${prefix}-${new Date().getTime()}`,
        issueDate: receipt_date,
        partnerName: partnerName,
        partnerAddress: '',
        partnerPhone: store_phone || '',
        partnerEmail: '',
        partnerPostalCode: '',
        projectName: file_name,
        subtotal: calculatedSubtotal,
        taxAmount: tax_amount,
        totalAmount: total_amount,
        status: 'draft',
        notes: enhancedNotes,
        // 駐車場関連フィールド（スネークケースに変換）
        receipt_type: receiptType || extractedParkingInfo.receiptType,
        facility_name: facilityName || extractedParkingInfo.facilityName,
        entry_time: entryTime || extractedParkingInfo.entryTime,
        exit_time: exitTime || extractedParkingInfo.exitTime,
        parking_duration: parkingDuration || extractedParkingInfo.parkingDuration,
        base_fee: baseFee || extractedParkingInfo.baseFee,
        additional_fee: additionalFee || extractedParkingInfo.additionalFee,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    logger.debug('Document data to save:', JSON.stringify(documentData, null, 2));
    
    // MongoDBに保存
    const savedDoc = await db.create(Collections.DOCUMENTS, documentData);

    // 明細を保存
    await db.create(Collections.ITEMS, {
        documentId: savedDoc._id,
        itemOrder: 1,
        itemName: file_name || '商品・サービス',
        quantity: 1,
        unitPrice: calculatedSubtotal,
        taxRate: tax_amount > 0 ? 0.10 : 0,
        amount: calculatedSubtotal,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // OCR結果を更新
    if (ocrResultId) {
      try {
        await db.updateById(Collections.OCR_RESULTS, ocrResultId, { 
          linkedDocumentId: savedDoc._id,
          status: 'processed',
          updatedAt: new Date()
        });
        logger.debug('OCR result updated successfully:', ocrResultId);
      } catch (updateError) {
        logger.error('OCR result update error:', updateError);
        // エラーがあってもレスポンスは成功として返す（文書は作成済みのため）
      }
    }

    // 勘定科目を推論（非同期で実行）
    try {
      const { AccountCategoryAI } = await import('@/lib/account-category-ai');
      const categoryAI = new AccountCategoryAI();
      
      // 非同期で推論実行（レスポンスを待たない）
      const ocrResult = {
        text: body.extracted_text || '',
        vendor: partnerName,
        amount: total_amount,
        date: receipt_date,
        items: [{
          name: file_name || '商品・サービス',
          price: calculatedSubtotal,
          quantity: 1
        }]
      };
      
      categoryAI.predictAccountCategory(ocrResult, companyId).then(async (prediction) => {
        if (prediction && prediction.confidence >= 0.6) {
          // 文書にカテゴリーと推論結果を保存
          await db.updateById(Collections.DOCUMENTS, savedDoc._id, {
            category: prediction.category,
            subcategory: prediction.alternativeCategories?.[0]?.category || '',
            aiPrediction: {
              category: prediction.category,
              confidence: prediction.confidence,
              reasoning: prediction.reasoning,
              alternativeCategories: prediction.alternativeCategories,
              taxNotes: prediction.taxNotes,
              sources: prediction.sources,
              predictedAt: new Date()
            },
            updatedAt: new Date()
          });
          logger.debug('勘定科目推論完了:', prediction);
        }
      }).catch((error) => {
        logger.error('勘定科目推論エラー:', error);
      });
    } catch (error) {
      logger.error('AccountCategoryAI initialization error:', error);
      // エラーが発生しても文書作成は成功とする
    }

    const documentTypeLabels = {
      receipt: '領収書',
      invoice: '請求書',
      estimate: '見積書',
      delivery_note: '納品書'
    };
    const label = documentTypeLabels[document_type as keyof typeof documentTypeLabels] || '文書';

    return NextResponse.json({
      id: savedDoc._id,
      message: `${label}を作成しました（勘定科目を推論中...）`
    });

  } catch (error) {
    logger.error('Create document error:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '文書の作成に失敗しました',
        details: error instanceof Error ? error.stack : undefined,
        errorObject: JSON.stringify(error, null, 2)
      },
      { status: 500 }
    );
  }
}