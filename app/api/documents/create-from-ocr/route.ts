import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/services/document-service';
import { DocumentData } from '@/lib/document-generator';
import { OCRAIOrchestrator, StructuredInvoiceData } from '@/lib/ocr-ai-orchestrator';
import { DatabaseService, Collections } from '@/lib/mongodb-client';

import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.debug('[Create Document] Received request body:', body);
    
    // AI駆動のOCRオーケストレーターを使用した構造化データの処理
    if (body.aiStructuredData) {
      logger.debug('[Create Document] Using AI-driven structured data');
      return await handleAIStructuredData(body.aiStructuredData, body.companyId);
    }
    
    // 従来のOCRデータの処理（後方互換性のため）
    logger.debug('[Create Document] Using legacy OCR data format');
    return await handleLegacyOCRData(body);
    
  } catch (error) {
    logger.error('Create document from OCR error:', error);
    const errorMessage = error instanceof Error ? error.message : '文書の作成に失敗しました';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}

/**
 * AI駆動のOCRオーケストレーターによる構造化データを処理
 */
async function handleAIStructuredData(aiData: StructuredInvoiceData, companyId: string) {
  logger.debug('[Create Document] Processing AI structured data:', {
    subject: aiData.subject,
    vendorName: aiData.vendor.name,
    customerName: aiData.customer.name,
    itemsCount: aiData.items.length,
    totalAmount: aiData.totalAmount,
    receiptType: aiData.receiptType,
    facilityName: aiData.facilityName
  });
  
  // Determine document type based on receiptType
  let documentType: 'invoice' | 'receipt' = 'invoice';
  let documentPrefix = 'INV';
  
  if (aiData.receiptType === 'parking' || aiData.receiptType === 'general') {
    documentType = 'receipt';
    documentPrefix = 'REC';
  }
  
  // MongoDB データベース接続
  const db = DatabaseService.getInstance();
  const actualCompanyId = companyId || '11111111-1111-1111-1111-111111111111';
  
  // まず、aiDataのすべてのフィールドをスネークケースに変換してコピー
  const convertToSnakeCase = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  };

  // aiDataのすべてのフィールドを再帰的にコピー
  const copyAllFields = (obj: any, target: any = {}, parentKey: string = ''): any => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const snakeKey = convertToSnakeCase(key);
        
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // オブジェクトの場合は、フラット化して保存
            const prefix = parentKey ? `${parentKey}_` : '';
            copyAllFields(value, target, prefix + snakeKey);
          } else if (Array.isArray(value) && key !== 'items') {
            // items以外の配列はJSON文字列として保存
            target[snakeKey] = JSON.stringify(value);
          } else if (key !== 'items') {
            // items以外の値をコピー
            target[snakeKey] = value;
          }
        }
      }
    }
    return target;
  };

  // すべてのOCRフィールドをコピー
  const allOcrFields = copyAllFields(aiData);

  // 保存するデータを準備（必須フィールドは上書き設定）
  const documentData = {
    // すべてのOCRフィールドを最初に展開
    ...allOcrFields,
    
    // 必須フィールドを上書き（これらは必ずこの形式で保存）
    companyId: actualCompanyId,
    documentType: documentType,
    type: documentType,
    documentNumber: aiData.documentNumber || `${documentPrefix}-${new Date().getTime()}`,
    displayNumber: '', // 仕訳作成時に設定される番号
    issueDate: aiData.issueDate || new Date().toISOString().split('T')[0],
    partnerName: aiData.vendor.name || '不明',
    partnerAddress: aiData.vendor.address || '',
    partnerPhone: aiData.vendor.phone || '',
    partnerEmail: aiData.vendor.email || '',
    partnerFax: aiData.vendor.fax || '',
    partnerPostalCode: '',
    projectName: aiData.subject || '',
    subtotal: aiData.subtotal || 0,
    taxAmount: aiData.taxAmount || 0,
    totalAmount: aiData.totalAmount || 0,
    status: 'draft',
    
    // すべての追加情報をnotesに含める
    notes: [
      aiData.subject ? `件名: ${aiData.subject}` : '',
      aiData.deliveryLocation ? `納入場所: ${aiData.deliveryLocation}` : '',
      aiData.paymentTerms ? `支払条件: ${aiData.paymentTerms}` : '',
      aiData.quotationValidity ? `見積有効期限: ${aiData.quotationValidity}` : '',
      aiData.notes ? `備考: ${aiData.notes}` : '',
      // 駐車場情報
      aiData.receiptType === 'parking' ? '【駐車場領収書】' : '',
      aiData.companyName ? `運営会社: ${aiData.companyName}` : '',
      aiData.facilityName ? `施設名: ${aiData.facilityName}` : '',
      aiData.entryTime ? `入庫時刻: ${aiData.entryTime}` : '',
      aiData.exitTime ? `出庫時刻: ${aiData.exitTime}` : '',
      aiData.parkingDuration ? `駐車時間: ${aiData.parkingDuration}` : '',
      aiData.baseFee !== undefined && aiData.baseFee > 0 ? `基本料金: ¥${aiData.baseFee}` : '',
      aiData.additionalFee !== undefined && aiData.additionalFee > 0 ? `追加料金: ¥${aiData.additionalFee}` : '',
      // 振込先情報
      aiData.bankTransferInfo ? '【振込先情報】' : '',
      aiData.bankTransferInfo?.bankName ? `銀行名: ${aiData.bankTransferInfo.bankName}` : '',
      aiData.bankTransferInfo?.branchName ? `支店名: ${aiData.bankTransferInfo.branchName}` : '',
      aiData.bankTransferInfo?.accountType ? `口座種別: ${aiData.bankTransferInfo.accountType}` : '',
      aiData.bankTransferInfo?.accountNumber ? `口座番号: ${aiData.bankTransferInfo.accountNumber}` : '',
      aiData.bankTransferInfo?.accountName ? `口座名義: ${aiData.bankTransferInfo.accountName}` : '',
      aiData.bankTransferInfo?.swiftCode ? `SWIFTコード: ${aiData.bankTransferInfo.swiftCode}` : '',
      aiData.bankTransferInfo?.additionalInfo ? `追加情報: ${aiData.bankTransferInfo.additionalInfo}` : '',
      'AI駆動のOCR解析により作成'
    ].filter(Boolean).join('\n'),
    
    // 元のOCRデータ全体も保存（後で参照可能にするため）
    originalOcrData: JSON.stringify(aiData),
    
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  logger.debug('[Create Document] Document data to save:', JSON.stringify(documentData, null, 2));
  
  // MongoDBに保存
  const savedDoc = await db.create(Collections.DOCUMENTS, documentData);

  // 明細を保存
  for (let i = 0; i < aiData.items.length; i++) {
    const item = aiData.items[i];
    await db.create(Collections.ITEMS, {
      documentId: savedDoc._id,
      itemOrder: i + 1,
      itemName: item.itemName || '商品・サービス',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      taxRate: (item.taxRate || 10) / 100,
      amount: item.amount || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return NextResponse.json({
    id: savedDoc._id,
    message: aiData.receiptType === 'parking' ? '駐車場領収書を作成しました（AI解析）' : 'AI駆動のOCR解析により文書を作成しました',
    processingMethod: 'AI-driven',
    // すべての抽出データを返す
    extractedData: aiData,
    // 保存されたドキュメントの要約情報
    summary: {
      documentId: savedDoc._id,
      documentNumber: documentData.documentNumber,
      documentType: documentData.documentType,
      totalFieldsExtracted: Object.keys(allOcrFields).length,
      itemsCount: aiData.items.length,
      totalAmount: aiData.totalAmount
    }
  });
}

/**
 * 従来のOCRデータ処理（後方互換性のため）
 */
async function handleLegacyOCRData(body: any) {
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

  return NextResponse.json({
    id: savedDocument.id,
    message: '領収書を作成しました（従来形式）',
    processingMethod: 'Legacy'
  });
}