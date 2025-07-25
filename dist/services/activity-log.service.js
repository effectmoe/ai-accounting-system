"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';
class ActivityLogService {
    /**
     * アクティビティログを記録
     */
    static async log(params) {
        try {
            const client = await (0, mongodb_client_1.getMongoClient)();
            const db = client.db(DB_NAME);
            const activityLog = {
                type: params.type,
                entityType: params.entityType,
                entityId: params.entityId ? new mongodb_1.ObjectId(params.entityId) : undefined,
                userId: params.userId,
                description: params.description,
                metadata: params.metadata,
                severity: params.severity || 'low',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await db.collection('activityLogs').insertOne(activityLog);
            logger_1.logger.info('Activity logged:', {
                type: params.type,
                entityType: params.entityType,
                description: params.description
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to log activity:', error);
            // アクティビティログの失敗はメイン処理を止めない
        }
    }
    /**
     * ドキュメント作成のアクティビティログ
     */
    static async logDocumentCreated(documentId, documentType, userId) {
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
    static async logDocumentUpdated(documentId, documentType, changes, userId) {
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
    static async logInvoiceCreated(invoiceId, customerName, amount, userId) {
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
    static async logInvoiceSent(invoiceId, customerName, userId) {
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
    static async logQuoteCreated(quoteId, customerName, amount, userId) {
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
    static async logCustomerCreated(customerId, customerName, userId) {
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
    static async logOCRCompleted(documentId, fileName, userId) {
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
    static async logOCRFailed(documentId, fileName, error, userId) {
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
    static async logJournalCreated(journalId, description, amount, userId) {
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
    static async logSystemError(error, context) {
        await this.log({
            type: 'system_error',
            entityType: 'system',
            description: `システムエラーが発生しました: ${error}`,
            metadata: { error, context },
            severity: 'high'
        });
    }
}
exports.ActivityLogService = ActivityLogService;
