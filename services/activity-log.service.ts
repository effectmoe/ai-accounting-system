import { ActivityLog, ActivityLogType } from '@/types/collections';
import { getMongoClient } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';

const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';

export class ActivityLogService {
  /**
   * アクティビティログを記録
   */
  static async log(params: {
    type: ActivityLogType;
    entityType?: ActivityLog['entityType'];
    entityId?: string | ObjectId;
    userId?: string;
    description: string;
    metadata?: Record<string, any>;
    severity?: ActivityLog['severity'];
  }): Promise<void> {
    try {
      const client = await getMongoClient();
      const db = client.db(DB_NAME);
      
      const activityLog: Partial<ActivityLog> = {
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId ? new ObjectId(params.entityId) : undefined,
        userId: params.userId,
        description: params.description,
        metadata: params.metadata,
        severity: params.severity || 'low',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('activityLogs').insertOne(activityLog);
      
      logger.info('Activity logged:', {
        type: params.type,
        entityType: params.entityType,
        description: params.description
      });
    } catch (error) {
      logger.error('Failed to log activity:', error);
      // アクティビティログの失敗はメイン処理を止めない
    }
  }

  /**
   * ドキュメント作成のアクティビティログ
   */
  static async logDocumentCreated(documentId: string, documentType: string, userId?: string) {
    await this.log({
      type: 'document_created',
      entityType: 'document',
      entityId: documentId,
      userId,
      description: `${documentType}が作成されました`,
      metadata: { documentType }
    });
  }

  /**
   * ドキュメント更新のアクティビティログ
   */
  static async logDocumentUpdated(documentId: string, documentType: string, changes: any, userId?: string) {
    await this.log({
      type: 'document_updated',
      entityType: 'document',
      entityId: documentId,
      userId,
      description: `${documentType}が更新されました`,
      metadata: { documentType, changes }
    });
  }

  /**
   * 請求書作成のアクティビティログ
   */
  static async logInvoiceCreated(invoiceId: string, customerName: string, amount: number, userId?: string) {
    await this.log({
      type: 'invoice_created',
      entityType: 'invoice',
      entityId: invoiceId,
      userId,
      description: `請求書が作成されました - ${customerName} (¥${amount.toLocaleString()})`,
      metadata: { customerName, amount }
    });
  }

  /**
   * 請求書送信のアクティビティログ
   */
  static async logInvoiceSent(invoiceId: string, customerName: string, userId?: string) {
    await this.log({
      type: 'invoice_sent',
      entityType: 'invoice',
      entityId: invoiceId,
      userId,
      description: `請求書が送信されました - ${customerName}`,
      metadata: { customerName }
    });
  }

  /**
   * 見積書作成のアクティビティログ
   */
  static async logQuoteCreated(quoteId: string, customerName: string, amount: number, userId?: string) {
    await this.log({
      type: 'quote_created',
      entityType: 'quote',
      entityId: quoteId,
      userId,
      description: `見積書が作成されました - ${customerName} (¥${amount.toLocaleString()})`,
      metadata: { customerName, amount }
    });
  }

  /**
   * 顧客作成のアクティビティログ
   */
  static async logCustomerCreated(customerId: string, customerName: string, userId?: string) {
    await this.log({
      type: 'customer_created',
      entityType: 'customer',
      entityId: customerId,
      userId,
      description: `新規顧客が追加されました - ${customerName}`,
      metadata: { customerName }
    });
  }

  /**
   * OCR完了のアクティビティログ
   */
  static async logOCRCompleted(documentId: string, fileName: string, userId?: string) {
    await this.log({
      type: 'ocr_completed',
      entityType: 'document',
      entityId: documentId,
      userId,
      description: `OCR処理が完了しました - ${fileName}`,
      metadata: { fileName }
    });
  }

  /**
   * OCR失敗のアクティビティログ
   */
  static async logOCRFailed(documentId: string, fileName: string, error: string, userId?: string) {
    await this.log({
      type: 'ocr_failed',
      entityType: 'document',
      entityId: documentId,
      userId,
      description: `OCR処理が失敗しました - ${fileName}`,
      metadata: { fileName, error },
      severity: 'high'
    });
  }

  /**
   * 仕訳作成のアクティビティログ
   */
  static async logJournalCreated(journalId: string, description: string, amount: number, userId?: string) {
    await this.log({
      type: 'journal_created',
      entityType: 'journal',
      entityId: journalId,
      userId,
      description: `仕訳が作成されました - ${description} (¥${amount.toLocaleString()})`,
      metadata: { journalDescription: description, amount }
    });
  }

  /**
   * システムエラーのアクティビティログ
   */
  static async logSystemError(error: string, context: any) {
    await this.log({
      type: 'system_error',
      entityType: 'system',
      description: `システムエラーが発生しました: ${error}`,
      metadata: { error, context },
      severity: 'high'
    });
  }
}