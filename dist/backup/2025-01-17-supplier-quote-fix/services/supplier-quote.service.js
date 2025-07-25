"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierQuoteService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
class SupplierQuoteService {
    collectionName = 'supplierQuotes';
    /**
     * 仕入先見積書を検索
     */
    async searchSupplierQuotes(params) {
        try {
            const filter = {};
            if (params.supplierId) {
                filter.supplierId = new mongodb_1.ObjectId(params.supplierId);
            }
            if (params.status) {
                filter.status = params.status;
            }
            if (params.dateFrom || params.dateTo) {
                filter.issueDate = {};
                if (params.dateFrom) {
                    filter.issueDate.$gte = params.dateFrom;
                }
                if (params.dateTo) {
                    filter.issueDate.$lte = params.dateTo;
                }
            }
            if (params.isGeneratedByAI !== undefined) {
                filter.isGeneratedByAI = params.isGeneratedByAI;
            }
            const limit = params.limit || 20;
            const skip = params.skip || 0;
            // 仕入先見積書を取得
            const supplierQuotes = await mongodb_client_1.db.find(this.collectionName, filter, {
                sort: { issueDate: -1, quoteNumber: -1 },
                limit: limit + 1, // hasMoreを判定するため1件多く取得
                skip,
            });
            // 仕入先情報を取得してマージ
            const supplierIds = [...new Set(supplierQuotes.map(quote => quote.supplierId?.toString()).filter(Boolean))];
            if (supplierIds.length > 0) {
                const suppliers = await mongodb_client_1.db.find('suppliers', {
                    _id: { $in: supplierIds.map(id => new mongodb_1.ObjectId(id)) }
                });
                const supplierMap = new Map(suppliers.map(supplier => [supplier._id.toString(), supplier]));
                supplierQuotes.forEach(quote => {
                    if (quote.supplierId) {
                        quote.supplier = supplierMap.get(quote.supplierId.toString());
                    }
                });
            }
            // hasMoreの判定
            const hasMore = supplierQuotes.length > limit;
            if (hasMore) {
                supplierQuotes.pop(); // 余分な1件を削除
            }
            // 総数を取得
            const total = await mongodb_client_1.db.count(this.collectionName, filter);
            return {
                supplierQuotes,
                total,
                hasMore,
            };
        }
        catch (error) {
            console.error('Error in searchSupplierQuotes:', error);
            throw new Error('仕入先見積書の検索に失敗しました');
        }
    }
    /**
     * 仕入先見積書を作成
     */
    async createSupplierQuote(quoteData) {
        try {
            // 見積書番号の重複チェック
            const existing = await mongodb_client_1.db.findOne(this.collectionName, {
                quoteNumber: quoteData.quoteNumber
            });
            if (existing) {
                throw new Error(`見積書番号 ${quoteData.quoteNumber} は既に使用されています`);
            }
            // 仕入先の存在確認
            if (quoteData.supplierId) {
                const supplier = await mongodb_client_1.db.findById('suppliers', quoteData.supplierId);
                if (!supplier) {
                    throw new Error('指定された仕入先が見つかりません');
                }
            }
            // 日付をDateオブジェクトに変換
            const quote = {
                ...quoteData,
                issueDate: new Date(quoteData.issueDate),
                validityDate: new Date(quoteData.validityDate),
                receivedDate: quoteData.receivedDate ? new Date(quoteData.receivedDate) : undefined,
                acceptedDate: quoteData.acceptedDate ? new Date(quoteData.acceptedDate) : undefined,
                rejectedDate: quoteData.rejectedDate ? new Date(quoteData.rejectedDate) : undefined,
                expiredDate: quoteData.expiredDate ? new Date(quoteData.expiredDate) : undefined,
                convertedToPurchaseOrderDate: quoteData.convertedToPurchaseOrderDate ? new Date(quoteData.convertedToPurchaseOrderDate) : undefined,
            };
            // 仕入先見積書を作成
            const created = await mongodb_client_1.db.create(this.collectionName, quote);
            return created;
        }
        catch (error) {
            console.error('Error in createSupplierQuote:', error);
            throw error instanceof Error ? error : new Error('仕入先見積書の作成に失敗しました');
        }
    }
    /**
     * 仕入先見積書を取得
     */
    async getSupplierQuote(id) {
        try {
            console.log('[SupplierQuoteService] getSupplierQuote called with ID:', id);
            const quote = await mongodb_client_1.db.findById(this.collectionName, id);
            if (!quote) {
                console.log('[SupplierQuoteService] No supplier quote found for ID:', id);
                return null;
            }
            console.log('[SupplierQuoteService] Supplier quote found:', {
                _id: quote._id,
                quoteNumber: quote.quoteNumber
            });
            // 仕入先情報を取得
            if (quote.supplierId) {
                quote.supplier = await mongodb_client_1.db.findById('suppliers', quote.supplierId);
            }
            return quote;
        }
        catch (error) {
            console.error('Error in getSupplierQuote:', error);
            throw new Error('仕入先見積書の取得に失敗しました');
        }
    }
    /**
     * 仕入先見積書を更新
     */
    async updateSupplierQuote(id, updateData) {
        try {
            console.log('[SupplierQuoteService] updateSupplierQuote called with:', {
                id,
                updateData: JSON.stringify(updateData, null, 2)
            });
            // _idフィールドは更新対象から除外
            const { _id, ...dataToUpdate } = updateData;
            // 日付フィールドをDateオブジェクトに変換
            if (dataToUpdate.issueDate) {
                dataToUpdate.issueDate = new Date(dataToUpdate.issueDate);
            }
            if (dataToUpdate.validityDate) {
                dataToUpdate.validityDate = new Date(dataToUpdate.validityDate);
            }
            if (dataToUpdate.receivedDate) {
                dataToUpdate.receivedDate = new Date(dataToUpdate.receivedDate);
            }
            if (dataToUpdate.acceptedDate) {
                dataToUpdate.acceptedDate = new Date(dataToUpdate.acceptedDate);
            }
            if (dataToUpdate.rejectedDate) {
                dataToUpdate.rejectedDate = new Date(dataToUpdate.rejectedDate);
            }
            if (dataToUpdate.expiredDate) {
                dataToUpdate.expiredDate = new Date(dataToUpdate.expiredDate);
            }
            if (dataToUpdate.convertedToPurchaseOrderDate) {
                dataToUpdate.convertedToPurchaseOrderDate = new Date(dataToUpdate.convertedToPurchaseOrderDate);
            }
            // 仕入先の存在確認
            if (dataToUpdate.supplierId) {
                const supplier = await mongodb_client_1.db.findById('suppliers', dataToUpdate.supplierId);
                if (!supplier) {
                    throw new Error('指定された仕入先が見つかりません');
                }
            }
            const updated = await mongodb_client_1.db.update(this.collectionName, id, dataToUpdate);
            if (updated) {
                // 仕入先情報を取得
                if (updated.supplierId) {
                    updated.supplier = await mongodb_client_1.db.findById('suppliers', updated.supplierId);
                }
            }
            return updated;
        }
        catch (error) {
            console.error('Error in updateSupplierQuote:', error);
            throw error instanceof Error ? error : new Error('仕入先見積書の更新に失敗しました');
        }
    }
    /**
     * 仕入先見積書を削除
     */
    async deleteSupplierQuote(id) {
        try {
            return await mongodb_client_1.db.delete(this.collectionName, id);
        }
        catch (error) {
            console.error('Error in deleteSupplierQuote:', error);
            throw new Error('仕入先見積書の削除に失敗しました');
        }
    }
    /**
     * 仕入先見積書のステータスを更新
     */
    async updateSupplierQuoteStatus(id, status, statusDate) {
        try {
            const updateData = { status };
            if (status === 'received' && statusDate) {
                updateData.receivedDate = statusDate;
            }
            else if (status === 'accepted' && statusDate) {
                updateData.acceptedDate = statusDate;
            }
            else if (status === 'rejected' && statusDate) {
                updateData.rejectedDate = statusDate;
            }
            else if (status === 'expired' && statusDate) {
                updateData.expiredDate = statusDate;
            }
            return await this.updateSupplierQuote(id, updateData);
        }
        catch (error) {
            console.error('Error in updateSupplierQuoteStatus:', error);
            throw new Error('仕入先見積書ステータスの更新に失敗しました');
        }
    }
    /**
     * 仕入先見積書番号を生成
     */
    async generateSupplierQuoteNumber() {
        try {
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            // 今日の仕入先見積書数を取得してシーケンス番号を生成
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const quoteCount = await mongodb_client_1.db.count(this.collectionName, {
                createdAt: {
                    $gte: today,
                    $lt: tomorrow
                }
            });
            const seq = (quoteCount + 1).toString().padStart(3, '0');
            const quoteNumber = `SQ-${year}${month}${day}-${seq}`;
            return quoteNumber;
        }
        catch (error) {
            console.error('Error in generateSupplierQuoteNumber:', error);
            // エラーの場合はタイムスタンプベースの番号を生成
            const timestamp = new Date().getTime();
            return `SQ-${timestamp}`;
        }
    }
    /**
     * 月次の仕入先見積書集計
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
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' },
                        taxAmount: { $sum: '$taxAmount' },
                    },
                },
                {
                    $project: {
                        status: '$_id',
                        count: 1,
                        totalAmount: 1,
                        taxAmount: 1,
                        _id: 0,
                    },
                },
            ];
            return await mongodb_client_1.db.aggregate(this.collectionName, pipeline);
        }
        catch (error) {
            console.error('Error in getMonthlyAggregation:', error);
            throw new Error('月次集計の取得に失敗しました');
        }
    }
}
exports.SupplierQuoteService = SupplierQuoteService;
