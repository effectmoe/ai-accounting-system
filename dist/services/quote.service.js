"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const company_info_service_1 = require("./company-info.service");
const invoice_service_1 = require("./invoice.service");
const logger_1 = require("@/lib/logger");
class QuoteService {
    collectionName = mongodb_client_1.Collections.QUOTES;
    /**
     * 見積書を検索
     */
    async searchQuotes(params) {
        try {
            const filter = {};
            if (params.customerId) {
                filter.customerId = new mongodb_1.ObjectId(params.customerId);
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
            // 見積書を取得
            const quotes = await mongodb_client_1.db.find(this.collectionName, filter, {
                sort: { issueDate: -1, quoteNumber: -1 },
                limit: limit + 1, // hasMoreを判定するため1件多く取得
                skip,
            });
            // 顧客情報を取得してマージ
            const customerIds = [...new Set(quotes.map(quote => quote.customerId?.toString()).filter(Boolean))];
            if (customerIds.length > 0) {
                const customers = await mongodb_client_1.db.find(mongodb_client_1.Collections.CUSTOMERS, {
                    _id: { $in: customerIds.map(id => new mongodb_1.ObjectId(id)) }
                });
                const customerMap = new Map(customers.map(customer => [customer._id.toString(), customer]));
                quotes.forEach(quote => {
                    if (quote.customerId) {
                        quote.customer = customerMap.get(quote.customerId.toString());
                    }
                });
            }
            // 銀行口座情報を取得してマージ
            const bankAccountIds = [...new Set(quotes.map(quote => quote.bankAccountId?.toString()).filter(Boolean))];
            if (bankAccountIds.length > 0) {
                const bankAccounts = await mongodb_client_1.db.find(mongodb_client_1.Collections.BANK_ACCOUNTS, {
                    _id: { $in: bankAccountIds.map(id => new mongodb_1.ObjectId(id)) }
                });
                const bankAccountMap = new Map(bankAccounts.map(account => [account._id.toString(), account]));
                quotes.forEach(quote => {
                    if (quote.bankAccountId) {
                        quote.bankAccount = bankAccountMap.get(quote.bankAccountId.toString());
                    }
                });
            }
            // hasMoreの判定
            const hasMore = quotes.length > limit;
            if (hasMore) {
                quotes.pop(); // 余分な1件を削除
            }
            // 総数を取得
            const total = await mongodb_client_1.db.count(this.collectionName, filter);
            return {
                quotes,
                total,
                hasMore,
            };
        }
        catch (error) {
            logger_1.logger.error('Error in searchQuotes:', error);
            throw new Error('見積書の検索に失敗しました');
        }
    }
    /**
     * 見積書を作成
     */
    async createQuote(quoteData) {
        try {
            // 見積書番号の重複チェック
            const existing = await mongodb_client_1.db.findOne(this.collectionName, {
                quoteNumber: quoteData.quoteNumber
            });
            if (existing) {
                throw new Error(`見積書番号 ${quoteData.quoteNumber} は既に使用されています`);
            }
            // 顧客の存在確認
            if (quoteData.customerId) {
                const customer = await mongodb_client_1.db.findById(mongodb_client_1.Collections.CUSTOMERS, quoteData.customerId);
                if (!customer) {
                    throw new Error('指定された顧客が見つかりません');
                }
            }
            // 銀行口座の存在確認
            if (quoteData.bankAccountId) {
                const bankAccount = await mongodb_client_1.db.findById(mongodb_client_1.Collections.BANK_ACCOUNTS, quoteData.bankAccountId);
                if (!bankAccount) {
                    throw new Error('指定された銀行口座が見つかりません');
                }
            }
            // 日付をDateオブジェクトに変換
            const quote = {
                ...quoteData,
                issueDate: new Date(quoteData.issueDate),
                validityDate: new Date(quoteData.validityDate),
                acceptedDate: quoteData.acceptedDate ? new Date(quoteData.acceptedDate) : undefined,
                rejectedDate: quoteData.rejectedDate ? new Date(quoteData.rejectedDate) : undefined,
                expiredDate: quoteData.expiredDate ? new Date(quoteData.expiredDate) : undefined,
                convertedToInvoiceDate: quoteData.convertedToInvoiceDate ? new Date(quoteData.convertedToInvoiceDate) : undefined,
            };
            // 見積書を作成
            const created = await mongodb_client_1.db.create(this.collectionName, quote);
            return created;
        }
        catch (error) {
            logger_1.logger.error('Error in createQuote:', error);
            throw error instanceof Error ? error : new Error('見積書の作成に失敗しました');
        }
    }
    /**
     * 見積書を取得
     */
    async getQuote(id) {
        try {
            logger_1.logger.debug('[QuoteService] getQuote called with ID:', id);
            const quote = await mongodb_client_1.db.findById(this.collectionName, id);
            if (!quote) {
                logger_1.logger.debug('[QuoteService] No quote found for ID:', id);
                return null;
            }
            logger_1.logger.debug('[QuoteService] Quote found:', {
                _id: quote._id,
                quoteNumber: quote.quoteNumber
            });
            // 顧客情報を取得
            if (quote.customerId) {
                quote.customer = await mongodb_client_1.db.findById(mongodb_client_1.Collections.CUSTOMERS, quote.customerId);
            }
            // 銀行口座情報を取得
            if (quote.bankAccountId) {
                quote.bankAccount = await mongodb_client_1.db.findById(mongodb_client_1.Collections.BANK_ACCOUNTS, quote.bankAccountId);
            }
            return quote;
        }
        catch (error) {
            logger_1.logger.error('Error in getQuote:', error);
            throw new Error('見積書の取得に失敗しました');
        }
    }
    /**
     * 見積書を更新
     */
    async updateQuote(id, updateData) {
        try {
            logger_1.logger.debug('[QuoteService] updateQuote called with:', {
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
            if (dataToUpdate.acceptedDate) {
                dataToUpdate.acceptedDate = new Date(dataToUpdate.acceptedDate);
            }
            if (dataToUpdate.rejectedDate) {
                dataToUpdate.rejectedDate = new Date(dataToUpdate.rejectedDate);
            }
            if (dataToUpdate.expiredDate) {
                dataToUpdate.expiredDate = new Date(dataToUpdate.expiredDate);
            }
            if (dataToUpdate.convertedToInvoiceDate) {
                dataToUpdate.convertedToInvoiceDate = new Date(dataToUpdate.convertedToInvoiceDate);
            }
            // 顧客の存在確認
            if (dataToUpdate.customerId) {
                const customer = await mongodb_client_1.db.findById(mongodb_client_1.Collections.CUSTOMERS, dataToUpdate.customerId);
                if (!customer) {
                    throw new Error('指定された顧客が見つかりません');
                }
            }
            // 銀行口座の存在確認
            if (dataToUpdate.bankAccountId) {
                const bankAccount = await mongodb_client_1.db.findById(mongodb_client_1.Collections.BANK_ACCOUNTS, dataToUpdate.bankAccountId);
                if (!bankAccount) {
                    throw new Error('指定された銀行口座が見つかりません');
                }
            }
            const updated = await mongodb_client_1.db.update(this.collectionName, id, dataToUpdate);
            if (updated) {
                // 顧客情報を取得
                if (updated.customerId) {
                    updated.customer = await mongodb_client_1.db.findById(mongodb_client_1.Collections.CUSTOMERS, updated.customerId);
                }
                // 銀行口座情報を取得
                if (updated.bankAccountId) {
                    updated.bankAccount = await mongodb_client_1.db.findById(mongodb_client_1.Collections.BANK_ACCOUNTS, updated.bankAccountId);
                }
            }
            return updated;
        }
        catch (error) {
            logger_1.logger.error('Error in updateQuote:', error);
            throw error instanceof Error ? error : new Error('見積書の更新に失敗しました');
        }
    }
    /**
     * 見積書を削除
     */
    async deleteQuote(id) {
        try {
            return await mongodb_client_1.db.delete(this.collectionName, id);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteQuote:', error);
            throw new Error('見積書の削除に失敗しました');
        }
    }
    /**
     * 見積書のステータスを更新
     */
    async updateQuoteStatus(id, status, statusDate) {
        try {
            const updateData = { status };
            if (status === 'accepted' && statusDate) {
                updateData.acceptedDate = statusDate;
            }
            else if (status === 'rejected' && statusDate) {
                updateData.rejectedDate = statusDate;
            }
            else if (status === 'expired' && statusDate) {
                updateData.expiredDate = statusDate;
            }
            return await this.updateQuote(id, updateData);
        }
        catch (error) {
            logger_1.logger.error('Error in updateQuoteStatus:', error);
            throw new Error('見積書ステータスの更新に失敗しました');
        }
    }
    /**
     * 見積書番号を生成
     */
    async generateQuoteNumber(format) {
        try {
            // 会社情報から見積書番号プレフィックスを取得
            const companyInfoService = new company_info_service_1.CompanyInfoService();
            const companyInfo = await companyInfoService.getCompanyInfo();
            // プレフィックスを取得（設定がない場合はQUO-をデフォルト）
            const prefix = companyInfo?.quotePrefix || 'QUO-';
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            // 今日の見積書数を取得してシーケンス番号を生成
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
            // プレフィックスを使用してフォーマット
            const quoteFormat = format || `${prefix}{YYYY}{MM}{DD}-{SEQ}`;
            // フォーマットに従って見積書番号を生成
            const quoteNumber = quoteFormat
                .replace('{YYYY}', year)
                .replace('{YY}', year.slice(-2))
                .replace('{MM}', month)
                .replace('{DD}', day)
                .replace('{SEQ}', seq);
            return quoteNumber;
        }
        catch (error) {
            logger_1.logger.error('Error in generateQuoteNumber:', error);
            // エラーの場合はタイムスタンプベースの番号を生成
            const timestamp = new Date().getTime();
            return `QUO-${timestamp}`;
        }
    }
    /**
     * 見積書を請求書に変換
     */
    async convertToInvoice(quoteId, invoiceData) {
        try {
            // 見積書を取得
            const quote = await this.getQuote(quoteId);
            if (!quote) {
                throw new Error('見積書が見つかりません');
            }
            if (quote.status !== 'accepted') {
                throw new Error('承認された見積書のみ請求書に変換できます');
            }
            if (quote.convertedToInvoiceId) {
                throw new Error('この見積書は既に請求書に変換されています');
            }
            // InvoiceServiceを使用して請求書を作成
            const invoiceService = new invoice_service_1.InvoiceService();
            // 見積書データを請求書データに変換
            const defaultInvoiceData = {
                invoiceNumber: await invoiceService.generateInvoiceNumber(),
                customerId: quote.customerId,
                issueDate: new Date(),
                dueDate: new Date(Date.now() + (quote.customer?.paymentTerms || 30) * 24 * 60 * 60 * 1000), // デフォルト30日後
                items: quote.items.map(item => ({
                    itemName: item.itemName,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                    taxRate: item.taxRate,
                    taxAmount: item.taxAmount,
                    notes: item.notes,
                })),
                subtotal: quote.subtotal,
                taxAmount: quote.taxAmount,
                taxRate: quote.taxRate,
                totalAmount: quote.totalAmount,
                paymentMethod: quote.paymentMethod,
                bankAccountId: quote.bankAccountId,
                status: 'draft',
                notes: quote.notes,
                internalNotes: `見積書 ${quote.quoteNumber} より変換`,
                isGeneratedByAI: quote.isGeneratedByAI,
                aiGenerationMetadata: quote.aiGenerationMetadata,
                aiConversationId: quote.aiConversationId,
            };
            // カスタムデータがある場合はマージ
            const finalInvoiceData = { ...defaultInvoiceData, ...invoiceData };
            // 請求書を作成
            const invoice = await invoiceService.createInvoice(finalInvoiceData);
            // 見積書のステータスを更新
            await this.updateQuote(quoteId, {
                status: 'converted',
                convertedToInvoiceId: invoice._id,
                convertedToInvoiceDate: new Date(),
            });
            return invoice;
        }
        catch (error) {
            logger_1.logger.error('Error in convertToInvoice:', error);
            throw error instanceof Error ? error : new Error('見積書から請求書への変換に失敗しました');
        }
    }
    /**
     * 月次の見積書集計
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
            logger_1.logger.error('Error in getMonthlyAggregation:', error);
            throw new Error('月次集計の取得に失敗しました');
        }
    }
}
exports.QuoteService = QuoteService;
