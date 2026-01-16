/**
 * OCR Document Service
 * 
 * Centralized service for creating documents from OCR data.
 * Handles both AI-driven and legacy OCR processing with proper
 * error handling, validation, and performance optimizations.
 */

import { ObjectId } from 'mongodb';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { AccountCategoryAI } from '@/lib/account-category-ai';
import { logger } from '@/lib/logger';
import {
  copyAllFields,
  generateDocumentNumber,
  extractPartnerName,
  calculateSubtotal,
  buildComprehensiveNotes,
  validateOCRData,
  logOCRProcessing,
  FieldCopyConfig
} from '@/lib/ocr-utils';
import {
  DocumentType,
  DocumentStatus,
  StructuredInvoiceData,
  MongoDocument,
  MongoItem,
  CreateDocumentFromOCRRequest,
  CreateDocumentFromOCRResponse,
  OCRProcessingConfig
} from '@/types/ocr.types';

/**
 * Default processing configuration
 */
const DEFAULT_CONFIG: OCRProcessingConfig = {
  useAIOrchestrator: true,
  enableAccountPrediction: true,
  confidenceThreshold: 0.6,
  maxProcessingTime: 30000, // 30 seconds
  retryAttempts: 3,
  defaultCompanyId: '11111111-1111-1111-1111-111111111111'
};

/**
 * Service class for OCR document operations
 */
export class OCRDocumentService {
  private db: DatabaseService;
  private config: OCRProcessingConfig;
  private accountCategoryAI?: AccountCategoryAI;

  constructor(config: Partial<OCRProcessingConfig> = {}) {
    this.db = DatabaseService.getInstance();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Creates a document from OCR data
   * Automatically determines the processing method based on the input
   */
  async createDocument(
    request: CreateDocumentFromOCRRequest
  ): Promise<CreateDocumentFromOCRResponse> {
    try {
      logOCRProcessing('Start', request, { 
        hasAIData: !!request.aiStructuredData,
        hasOCRResultId: !!request.ocrResultId 
      });

      // Determine processing method
      if (request.aiStructuredData) {
        return await this.createFromAIStructuredData(
          request.aiStructuredData,
          request.companyId || this.config.defaultCompanyId
        );
      } else if (request.ocrResultId) {
        return await this.createFromOCRResult(request);
      } else {
        return await this.createFromSimpleData(request);
      }
    } catch (error) {
      logger.error('OCR document creation failed:', error);
      throw error;
    }
  }

  /**
   * Creates a document from AI-structured data
   */
  private async createFromAIStructuredData(
    aiData: StructuredInvoiceData,
    companyId: string
  ): Promise<CreateDocumentFromOCRResponse> {
    logOCRProcessing('AI Processing', aiData, {
      documentType: aiData.documentType,
      itemsCount: aiData.items.length,
      totalAmount: aiData.totalAmount
    });

    // Determine document type and prefix
    const documentType = this.determineDocumentType(aiData);
    const documentNumber = generateDocumentNumber(
      documentType,
      aiData.documentNumber
    );

    // Prepare field copy configuration
    const fieldCopyConfig: FieldCopyConfig = {
      convertToSnakeCase: true,
      excludeFields: ['items'], // Handle items separately
      flattenObjects: true,
      arrayHandling: 'stringify'
    };

    // Copy all OCR fields with snake_case conversion
    const baseFields = copyAllFields(aiData, {}, fieldCopyConfig);

    // Build comprehensive notes
    const notes = buildComprehensiveNotes(aiData, ['AI駆動のOCR解析により作成']);

    // Prepare document data
    const documentData: Partial<MongoDocument> = {
      ...baseFields,
      // Override with required fields
      companyId,
      documentType,
      type: documentType,
      documentNumber,
      displayNumber: '',
      issueDate: aiData.issueDate || new Date().toISOString().split('T')[0],
      partnerName: extractPartnerName(aiData),
      partnerAddress: aiData.vendor.address || '',
      partnerPhone: aiData.vendor.phone || '',
      partnerEmail: aiData.vendor.email || '',
      partnerFax: aiData.vendor.fax || '',
      partnerPostalCode: aiData.vendor.postalCode || '',
      projectName: aiData.subject || '',
      subtotal: aiData.subtotal || 0,
      taxAmount: aiData.taxAmount || 0,
      totalAmount: aiData.totalAmount || 0,
      status: 'draft' as DocumentStatus,
      notes,
      originalOcrData: JSON.stringify(aiData),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save document
    const savedDoc = await this.db.create(Collections.DOCUMENTS, documentData);

    // Save items
    await this.saveDocumentItems(savedDoc._id, aiData.items);

    // Trigger account prediction asynchronously
    if (this.config.enableAccountPrediction) {
      this.predictAccountCategoryAsync(savedDoc._id, aiData, companyId);
    }

    return {
      id: savedDoc._id.toString(),
      message: this.getSuccessMessage(documentType, aiData.receiptType),
      processingMethod: 'AI-driven',
      extractedData: aiData,
      summary: {
        documentId: savedDoc._id.toString(),
        documentNumber,
        documentType,
        totalFieldsExtracted: Object.keys(baseFields).length,
        itemsCount: aiData.items.length,
        totalAmount: aiData.totalAmount
      }
    };
  }

  /**
   * Creates a document from OCR result ID
   */
  private async createFromOCRResult(
    request: CreateDocumentFromOCRRequest
  ): Promise<CreateDocumentFromOCRResponse> {
    const { ocrResultId, approvedBy } = request;
    
    if (!ocrResultId) {
      throw new Error('OCR Result ID is required');
    }

    // Fetch OCR result
    const ocrResult = await this.db.findById(Collections.OCR_RESULTS, ocrResultId);
    if (!ocrResult) {
      throw new Error('OCR result not found');
    }

    logOCRProcessing('OCR Result Processing', ocrResult, {
      hasExtractedData: !!ocrResult.extractedData,
      hasOcrResult: !!ocrResult.ocrResult
    });

    // Extract data from OCR result
    const ocrData = ocrResult.ocrResult || ocrResult.extractedData || {};
    const validatedData = validateOCRData(ocrData);

    // Prepare document data
    const documentType = (request.document_type || 
                        ocrResult.documentType || 
                        ocrResult.type || 
                        'receipt') as DocumentType;

    const documentData: Partial<MongoDocument> = {
      companyId: ocrResult.companyId || this.config.defaultCompanyId,
      documentType,
      type: documentType,
      documentNumber: generateDocumentNumber(documentType),
      displayNumber: '',
      issueDate: validatedData.issueDate || new Date().toISOString().split('T')[0],
      partnerName: extractPartnerName(validatedData),
      partnerAddress: validatedData.vendor?.address || '',
      partnerPhone: validatedData.vendor?.phone || validatedData.storePhone || '',
      partnerEmail: validatedData.vendor?.email || '',
      subtotal: calculateSubtotal(
        validatedData.totalAmount || 0,
        validatedData.taxAmount || 0,
        validatedData.subtotalAmount
      ),
      taxAmount: validatedData.taxAmount || 0,
      totalAmount: validatedData.totalAmount || 0,
      status: 'pending' as DocumentStatus,
      notes: buildComprehensiveNotes(validatedData, [
        `OCR処理済み${ocrResult.confidence ? ` (信頼度: ${(ocrResult.confidence * 100).toFixed(1)}%)` : ''}`
      ]),
      category: ocrData.category || ocrResult.category || '未分類',
      subcategory: ocrData.subcategory || ocrResult.subcategory,
      ocrResultId: new ObjectId(ocrResultId),
      sourceFileId: ocrResult.sourceFileId || ocrResult.gridfsFileId,
      // Parking fields
      receipt_type: validatedData.receiptType,
      facility_name: validatedData.facilityName,
      company_name: validatedData.companyName,
      entry_time: validatedData.entryTime,
      exit_time: validatedData.exitTime,
      parking_duration: validatedData.parkingDuration,
      base_fee: validatedData.baseFee,
      additional_fee: validatedData.additionalFee,
      // Approval info
      approvedBy,
      approvedAt: approvedBy ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save document
    const savedDoc = await this.db.create(Collections.DOCUMENTS, documentData);

    // Save items
    if (validatedData.items && validatedData.items.length > 0) {
      await this.saveDocumentItems(savedDoc._id, validatedData.items);
    } else {
      // Create default item
      await this.saveDocumentItems(savedDoc._id, [{
        itemName: validatedData.fileName || ocrResult.fileName || '商品・サービス',
        quantity: 1,
        unitPrice: documentData.subtotal || 0,
        taxRate: documentData.taxAmount ? 0.1 : 0,
        amount: documentData.subtotal || 0
      }]);
    }

    // Update OCR result status
    await this.updateOCRResultStatus(ocrResultId, savedDoc._id);

    return {
      id: savedDoc._id.toString(),
      message: 'ドキュメントが作成されました',
      processingMethod: 'Legacy'
    };
  }

  /**
   * Creates a document from simple OCR data
   */
  private async createFromSimpleData(
    request: CreateDocumentFromOCRRequest
  ): Promise<CreateDocumentFromOCRResponse> {
    logOCRProcessing('Simple Processing', request);

    const validatedData = validateOCRData(request);
    const documentType = (request.document_type || 'receipt') as DocumentType;
    const companyId = request.companyId || this.config.defaultCompanyId;

    // Calculate financial values
    const subtotal = calculateSubtotal(
      validatedData.totalAmount || 0,
      validatedData.taxAmount || 0,
      validatedData.subtotalAmount
    );

    // Build notes
    const notes = buildComprehensiveNotes(validatedData, ['OCRデータより作成']);

    // Prepare document data
    const documentData: Partial<MongoDocument> = {
      companyId,
      documentType,
      type: documentType,
      documentNumber: generateDocumentNumber(
        documentType,
        validatedData.receiptNumber || validatedData.documentNumber
      ),
      displayNumber: '',
      issueDate: request.receipt_date || new Date().toISOString().split('T')[0],
      partnerName: extractPartnerName(validatedData),
      partnerPhone: validatedData.storePhone || '',
      projectName: validatedData.fileName || '',
      subtotal,
      taxAmount: validatedData.taxAmount || 0,
      totalAmount: validatedData.totalAmount || 0,
      status: 'draft' as DocumentStatus,
      notes,
      // Parking fields
      receipt_type: validatedData.receiptType,
      facility_name: validatedData.facilityName,
      entry_time: validatedData.entryTime,
      exit_time: validatedData.exitTime,
      parking_duration: validatedData.parkingDuration,
      base_fee: validatedData.baseFee,
      additional_fee: validatedData.additionalFee,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save document
    const savedDoc = await this.db.create(Collections.DOCUMENTS, documentData);

    // Save default item
    await this.saveDocumentItems(savedDoc._id, [{
      itemName: validatedData.fileName || '商品・サービス',
      quantity: 1,
      unitPrice: subtotal,
      taxRate: documentData.taxAmount ? 0.1 : 0,
      amount: subtotal
    }]);

    // Update OCR result if provided
    if (request.ocrResultId) {
      await this.updateOCRResultStatus(request.ocrResultId, savedDoc._id);
    }

    // Trigger account prediction
    if (this.config.enableAccountPrediction && request.extracted_text) {
      this.predictAccountCategoryAsync(
        savedDoc._id,
        {
          text: request.extracted_text,
          vendor: documentData.partnerName!,
          amount: documentData.totalAmount!,
          date: documentData.issueDate!,
          items: [{
            name: validatedData.fileName || '商品・サービス',
            price: subtotal,
            quantity: 1
          }]
        },
        companyId
      );
    }

    return {
      id: savedDoc._id.toString(),
      message: this.getSuccessMessage(documentType),
      processingMethod: 'Simple'
    };
  }

  /**
   * Saves document items to the database
   */
  private async saveDocumentItems(
    documentId: ObjectId,
    items: any[]
  ): Promise<void> {
    const itemPromises = items.map((item, index) => {
      const mongoItem: Partial<MongoItem> = {
        documentId,
        itemOrder: index + 1,
        itemName: item.itemName || item.name || '商品・サービス',
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit,
        unitPrice: item.unitPrice || 0,
        taxRate: item.taxRate ?? 0.1,
        amount: item.amount || 0,
        category: item.category,
        notes: item.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return this.db.create(Collections.ITEMS, mongoItem);
    });

    await Promise.all(itemPromises);
  }

  /**
   * Updates OCR result status after document creation
   */
  private async updateOCRResultStatus(
    ocrResultId: string,
    documentId: ObjectId
  ): Promise<void> {
    try {
      await this.db.updateById(Collections.OCR_RESULTS, ocrResultId, {
        linkedDocumentId: documentId,
        status: 'processed',
        updatedAt: new Date()
      });
      logger.debug(`OCR result ${ocrResultId} updated successfully`);
    } catch (error) {
      logger.error(`Failed to update OCR result ${ocrResultId}:`, error);
      // Don't throw - document creation was successful
    }
  }

  /**
   * Predicts account category asynchronously with confirmation flow
   * 確認フロー付きの勘定科目推論（税金関連や高額取引を検出）
   */
  private async predictAccountCategoryAsync(
    documentId: ObjectId,
    ocrData: any,
    companyId: string
  ): Promise<void> {
    try {
      if (!this.accountCategoryAI) {
        this.accountCategoryAI = new AccountCategoryAI();
      }

      // 確認フロー付きの推論を実行
      const prediction = await this.accountCategoryAI.predictWithConfirmationFlow(
        ocrData,
        companyId
      );

      if (prediction) {
        const updateData: Record<string, any> = {
          aiPrediction: {
            ...prediction,
            predictedAt: new Date()
          },
          updatedAt: new Date()
        };

        // 確認が必要な場合
        if (prediction.needsConfirmation) {
          updateData.needsConfirmation = true;
          updateData.confirmationStatus = 'pending';
          updateData.confirmationQuestions = prediction.confirmationQuestions;
          updateData.confirmationReasons = prediction.confirmationReasons;
          updateData.pendingCategory = prediction.pendingCategory;
          // 確認待ちの場合はカテゴリを仮の値に設定
          updateData.category = prediction.pendingCategory || '確認待ち';
          updateData.subcategory = '';

          logger.info(`[OCRDocumentService] 確認フロー開始: document ${documentId}`, {
            reasons: prediction.confirmationReasons,
            questionsCount: prediction.confirmationQuestions?.length || 0
          });
        } else if (prediction.confidence >= this.config.confidenceThreshold) {
          // 確認不要で信頼度が十分な場合
          updateData.category = prediction.category;
          updateData.subcategory = prediction.alternativeCategories?.[0]?.category || '';
          updateData.needsConfirmation = false;
          updateData.confirmationStatus = 'confirmed';

          logger.debug(`[OCRDocumentService] Account category predicted for document ${documentId}`);
        }

        await this.db.updateById(Collections.DOCUMENTS, documentId.toString(), updateData);
      }
    } catch (error) {
      logger.error(`Account category prediction failed for document ${documentId}:`, error);
      // Don't throw - this is a non-critical background operation
    }
  }

  /**
   * Determines document type from AI data
   */
  private determineDocumentType(aiData: StructuredInvoiceData): DocumentType {
    if (aiData.receiptType === 'parking' || aiData.receiptType === 'general') {
      return 'receipt';
    }
    return aiData.documentType || 'invoice';
  }

  /**
   * Gets success message based on document type
   */
  private getSuccessMessage(
    documentType: DocumentType,
    receiptType?: string
  ): string {
    const typeLabels: Record<DocumentType, string> = {
      receipt: '領収書',
      invoice: '請求書',
      estimate: '見積書',
      delivery_note: '納品書',
      quotation: '見積書',
      purchase_order: '発注書'
    };

    let message = `${typeLabels[documentType] || '文書'}を作成しました`;
    
    if (receiptType === 'parking') {
      message = '駐車場領収書を作成しました（AI解析）';
    } else if (this.config.enableAccountPrediction) {
      message += '（勘定科目を推論中...）';
    }

    return message;
  }
}