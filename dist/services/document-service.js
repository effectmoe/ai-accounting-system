"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
class DocumentService {
    collectionName = mongodb_client_1.Collections.DOCUMENTS;
    /**
     * ドキュメントを作成
     */
    async createDocument(documentData) {
        try {
            const document = await mongodb_client_1.db.create(this.collectionName, {
                ...documentData,
                issueDate: new Date(documentData.issueDate),
                dueDate: documentData.dueDate ? new Date(documentData.dueDate) : undefined,
            });
            return document;
        }
        catch (error) {
            logger_1.logger.error('Error in createDocument:', error);
            throw new Error('ドキュメントの作成に失敗しました');
        }
    }
    /**
     * ドキュメントを保存（DocumentDataから変換して保存）
     */
    static async saveDocument(documentData, companyId) {
        const service = new DocumentService();
        // DocumentDataからDocumentフォーマットに変換
        const document = {
            documentNumber: documentData.documentNumber,
            documentType: documentData.documentType || 'receipt',
            issueDate: new Date(documentData.issueDate),
            customerName: documentData.partner?.name || '',
            items: documentData.items.map(item => ({
                description: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.amount,
                taxRate: item.taxRate,
            })),
            subtotal: documentData.subtotal,
            taxAmount: documentData.tax,
            totalAmount: documentData.total,
            status: 'draft',
            notes: documentData.notes || '',
        };
        return await service.createDocument(document);
    }
    /**
     * OCRデータからドキュメントを作成
     */
    async createFromOCR(data) {
        try {
            // DocumentDataからDocumentフォーマットに変換
            const documentData = {
                documentNumber: data.documentNumber,
                documentType: data.type || 'receipt',
                issueDate: new Date(data.date),
                customerName: data.vendor?.name || '',
                items: data.items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                    taxRate: item.taxRate,
                })),
                subtotal: data.subtotal,
                taxAmount: data.tax,
                totalAmount: data.total,
                status: 'draft',
                notes: data.notes,
                ocrResultId: data.ocrResultId,
            };
            return await this.createDocument(documentData);
        }
        catch (error) {
            logger_1.logger.error('Error in createFromOCR:', error);
            throw new Error('OCRデータからのドキュメント作成に失敗しました');
        }
    }
    /**
     * ドキュメントを取得
     */
    async getDocument(id) {
        try {
            return await mongodb_client_1.db.findById(this.collectionName, id);
        }
        catch (error) {
            logger_1.logger.error('Error in getDocument:', error);
            throw new Error('ドキュメントの取得に失敗しました');
        }
    }
    /**
     * ドキュメント一覧を取得
     */
    async getDocuments(filter = {}, options) {
        try {
            return await mongodb_client_1.db.find(this.collectionName, filter, {
                sort: { issueDate: -1 },
                ...options,
            });
        }
        catch (error) {
            logger_1.logger.error('Error in getDocuments:', error);
            throw new Error('ドキュメント一覧の取得に失敗しました');
        }
    }
    /**
     * ドキュメントを更新
     */
    async updateDocument(id, updateData) {
        try {
            const { _id, ...dataToUpdate } = updateData;
            // 日付フィールドをDateオブジェクトに変換
            if (dataToUpdate.issueDate) {
                dataToUpdate.issueDate = new Date(dataToUpdate.issueDate);
            }
            if (dataToUpdate.dueDate) {
                dataToUpdate.dueDate = new Date(dataToUpdate.dueDate);
            }
            return await mongodb_client_1.db.update(this.collectionName, id, dataToUpdate);
        }
        catch (error) {
            logger_1.logger.error('Error in updateDocument:', error);
            throw new Error('ドキュメントの更新に失敗しました');
        }
    }
    /**
     * ドキュメントを削除
     */
    async deleteDocument(id) {
        try {
            return await mongodb_client_1.db.delete(this.collectionName, id);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteDocument:', error);
            throw new Error('ドキュメントの削除に失敗しました');
        }
    }
    /**
     * ドキュメントのステータスを更新
     */
    async updateDocumentStatus(id, status) {
        try {
            return await this.updateDocument(id, { status });
        }
        catch (error) {
            logger_1.logger.error('Error in updateDocumentStatus:', error);
            throw new Error('ドキュメントステータスの更新に失敗しました');
        }
    }
    // PDF generation functionality has been removed
    // Use appropriate routes for PDF generation instead
    /**
     * OCR結果IDでドキュメントを検索
     */
    async getDocumentByOCRResultId(ocrResultId) {
        try {
            return await mongodb_client_1.db.findOne(this.collectionName, { ocrResultId });
        }
        catch (error) {
            logger_1.logger.error('Error in getDocumentByOCRResultId:', error);
            throw new Error('OCR結果IDでのドキュメント検索に失敗しました');
        }
    }
    /**
     * 月次のドキュメント集計
     */
    async getMonthlyAggregation(year, month) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            const pipeline = [
                {
                    $match: {
                        issueDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        status: { $ne: 'cancelled' },
                    },
                },
                {
                    $group: {
                        _id: '$documentType',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' },
                        taxAmount: { $sum: '$taxAmount' },
                    },
                },
            ];
            return await mongodb_client_1.db.aggregate(this.collectionName, pipeline);
        }
        catch (error) {
            logger_1.logger.error('Error in getMonthlyAggregation:', error);
            throw new Error('月次集計の取得に失敗しました');
        }
    }
}
exports.DocumentService = DocumentService;
