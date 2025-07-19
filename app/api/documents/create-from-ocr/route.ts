import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/services/document-service';
import { DocumentData } from '@/lib/document-generator';
import { OCRAIOrchestrator, StructuredInvoiceData } from '@/lib/ocr-ai-orchestrator';

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
    totalAmount: aiData.totalAmount
  });
  
  // DocumentDataフォーマットに変換
  const documentData: DocumentData = {
    documentType: 'invoice' as const,
    documentNumber: aiData.documentNumber || `INV-${new Date().getTime()}`,
    issueDate: aiData.issueDate || new Date().toISOString().split('T')[0],
    partner: {
      name: aiData.vendor.name || '不明',
      address: aiData.vendor.address || '',
      phone: aiData.vendor.phone || '',
      email: aiData.vendor.email || '',
      postal_code: '',
      registrationNumber: ''
    },
    items: aiData.items.map(item => ({
      name: item.itemName || '商品・サービス',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      taxRate: (item.taxRate || 10) / 100, // パーセンテージから小数に変換
      amount: item.amount || 0
    })),
    subtotal: aiData.subtotal || 0,
    tax: aiData.taxAmount || 0,
    total: aiData.totalAmount || 0,
    notes: [
      aiData.subject ? `件名: ${aiData.subject}` : '',
      aiData.deliveryLocation ? `納入場所: ${aiData.deliveryLocation}` : '',
      aiData.paymentTerms ? `支払条件: ${aiData.paymentTerms}` : '',
      aiData.quotationValidity ? `見積有効期限: ${aiData.quotationValidity}` : '',
      aiData.notes ? `備考: ${aiData.notes}` : '',
      'AI駆動のOCR解析により作成'
    ].filter(Boolean).join('\n'),
    paymentTerms: aiData.paymentTerms || '',
    paymentMethod: '現金',
    projectName: aiData.subject || ''
  };

  // 文書を保存
  const savedDocument = await DocumentService.saveDocument(
    documentData,
    companyId || '11111111-1111-1111-1111-111111111111'
  );

  return NextResponse.json({
    id: savedDocument.id,
    message: 'AI駆動のOCR解析により文書を作成しました',
    processingMethod: 'AI-driven',
    extractedData: {
      subject: aiData.subject,
      vendor: aiData.vendor.name,
      customer: aiData.customer.name,
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