"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const company_info_service_1 = require("./company-info.service");
class InvoiceService {
    collectionName = mongodb_client_1.Collections.INVOICES;
    /**
     * 請求書を検索
     */
    async searchInvoices(params) {
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
            // 請求書を取得
            const invoices = await mongodb_client_1.db.find(this.collectionName, filter, {
                sort: { issueDate: -1, invoiceNumber: -1 },
                limit: limit + 1, // hasMoreを判定するため1件多く取得
                skip,
            });
            // 顧客情報を取得してマージ
            const customerIds = [...new Set(invoices.map(inv => inv.customerId?.toString()).filter(Boolean))];
            if (customerIds.length > 0) {
                const customers = await mongodb_client_1.db.find(mongodb_client_1.Collections.CUSTOMERS, {
                    _id: { $in: customerIds.map(id => new mongodb_1.ObjectId(id)) }
                });
                const customerMap = new Map(customers.map(customer => [customer._id.toString(), customer]));
                invoices.forEach(invoice => {
                    if (invoice.customerId) {
                        invoice.customer = customerMap.get(invoice.customerId.toString());
                    }
                });
            }
            // 銀行口座情報を取得してマージ
            const bankAccountIds = [...new Set(invoices.map(inv => inv.bankAccountId?.toString()).filter(Boolean))];
            if (bankAccountIds.length > 0) {
                const bankAccounts = await mongodb_client_1.db.find(mongodb_client_1.Collections.BANK_ACCOUNTS, {
                    _id: { $in: bankAccountIds.map(id => new mongodb_1.ObjectId(id)) }
                });
                const bankAccountMap = new Map(bankAccounts.map(account => [account._id.toString(), account]));
                invoices.forEach(invoice => {
                    if (invoice.bankAccountId) {
                        invoice.bankAccount = bankAccountMap.get(invoice.bankAccountId.toString());
                    }
                });
            }
            // hasMoreの判定
            const hasMore = invoices.length > limit;
            if (hasMore) {
                invoices.pop(); // 余分な1件を削除
            }
            // 総数を取得
            const total = await mongodb_client_1.db.count(this.collectionName, filter);
            return {
                invoices,
                total,
                hasMore,
            };
        }
        catch (error) {
            console.error('Error in searchInvoices:', error);
            throw new Error('請求書の検索に失敗しました');
        }
    }
    /**
     * 請求書を作成
     */
    async createInvoice(invoiceData) {
        try {
            // 請求書番号の重複チェック
            const existing = await mongodb_client_1.db.findOne(this.collectionName, {
                invoiceNumber: invoiceData.invoiceNumber
            });
            if (existing) {
                throw new Error(`請求書番号 ${invoiceData.invoiceNumber} は既に使用されています`);
            }
            // 顧客の存在確認
            if (invoiceData.customerId) {
                const customer = await mongodb_client_1.db.findById(mongodb_client_1.Collections.CUSTOMERS, invoiceData.customerId);
                if (!customer) {
                    throw new Error('指定された顧客が見つかりません');
                }
            }
            // 銀行口座の存在確認
            if (invoiceData.bankAccountId) {
                const bankAccount = await mongodb_client_1.db.findById(mongodb_client_1.Collections.BANK_ACCOUNTS, invoiceData.bankAccountId);
                if (!bankAccount) {
                    throw new Error('指定された銀行口座が見つかりません');
                }
            }
            // 日付をDateオブジェクトに変換
            const invoice = {
                ...invoiceData,
                issueDate: new Date(invoiceData.issueDate),
                dueDate: new Date(invoiceData.dueDate),
                paidDate: invoiceData.paidDate ? new Date(invoiceData.paidDate) : undefined,
            };
            // 請求書を作成
            const created = await mongodb_client_1.db.create(this.collectionName, invoice);
            return created;
        }
        catch (error) {
            console.error('Error in createInvoice:', error);
            throw error instanceof Error ? error : new Error('請求書の作成に失敗しました');
        }
    }
    /**
     * 請求書を取得
     */
    async getInvoice(id) {
        try {
            console.log('[InvoiceService] getInvoice called with ID:', id);
            console.log('[InvoiceService] ID type:', typeof id, 'Length:', id?.length);
            const invoice = await mongodb_client_1.db.findById(this.collectionName, id);
            if (!invoice) {
                console.log('[InvoiceService] No invoice found for ID:', id);
                return null;
            }
            console.log('[InvoiceService] Invoice found:', {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber
            });
            // 顧客情報を取得
            if (invoice.customerId) {
                invoice.customer = await mongodb_client_1.db.findById(mongodb_client_1.Collections.CUSTOMERS, invoice.customerId);
            }
            // 銀行口座情報を取得
            if (invoice.bankAccountId) {
                invoice.bankAccount = await mongodb_client_1.db.findById(mongodb_client_1.Collections.BANK_ACCOUNTS, invoice.bankAccountId);
            }
            return invoice;
        }
        catch (error) {
            console.error('Error in getInvoice:', error);
            throw new Error('請求書の取得に失敗しました');
        }
    }
    /**
     * 請求書を更新
     */
    async updateInvoice(id, updateData) {
        try {
            console.log('[InvoiceService] updateInvoice called with:', {
                id,
                updateData: JSON.stringify(updateData, null, 2)
            });
            // _idフィールドは更新対象から除外
            const { _id, ...dataToUpdate } = updateData;
            // 日付フィールドをDateオブジェクトに変換
            if (dataToUpdate.issueDate) {
                dataToUpdate.issueDate = new Date(dataToUpdate.issueDate);
            }
            if (dataToUpdate.dueDate) {
                dataToUpdate.dueDate = new Date(dataToUpdate.dueDate);
            }
            if (dataToUpdate.paidDate) {
                dataToUpdate.paidDate = new Date(dataToUpdate.paidDate);
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
            console.log('[InvoiceService] Calling db.update with:', {
                collection: this.collectionName,
                id,
                dataToUpdate: JSON.stringify(dataToUpdate, null, 2)
            });
            const updated = await mongodb_client_1.db.update(this.collectionName, id, dataToUpdate);
            console.log('[InvoiceService] Updated invoice:', updated ? 'Success' : 'Failed');
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
            console.error('Error in updateInvoice:', error);
            throw error instanceof Error ? error : new Error('請求書の更新に失敗しました');
        }
    }
    /**
     * 請求書を削除
     */
    async deleteInvoice(id) {
        try {
            return await mongodb_client_1.db.delete(this.collectionName, id);
        }
        catch (error) {
            console.error('Error in deleteInvoice:', error);
            throw new Error('請求書の削除に失敗しました');
        }
    }
    /**
     * 請求書のステータスを更新
     */
    async updateInvoiceStatus(id, status, paidDate, paidAmount) {
        try {
            const updateData = { status };
            if (status === 'paid') {
                updateData.paidDate = paidDate || new Date();
                if (paidAmount !== undefined) {
                    updateData.paidAmount = paidAmount;
                }
            }
            return await this.updateInvoice(id, updateData);
        }
        catch (error) {
            console.error('Error in updateInvoiceStatus:', error);
            throw new Error('請求書ステータスの更新に失敗しました');
        }
    }
    /**
     * 請求書番号を生成
     */
    async generateInvoiceNumber(format) {
        try {
            // 会社情報から請求書番号プレフィックスを取得
            const companyInfoService = new company_info_service_1.CompanyInfoService();
            const companyInfo = await companyInfoService.getCompanyInfo();
            // プレフィックスを取得（設定がない場合はINV-をデフォルト）
            const prefix = companyInfo?.invoicePrefix || 'INV-';
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            // 今日の請求書数を取得してシーケンス番号を生成
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const invoiceCount = await mongodb_client_1.db.count(this.collectionName, {
                createdAt: {
                    $gte: today,
                    $lt: tomorrow
                }
            });
            const seq = (invoiceCount + 1).toString().padStart(3, '0');
            // プレフィックスを使用してフォーマット
            const invoiceFormat = format || `${prefix}{YYYY}{MM}{DD}-{SEQ}`;
            // フォーマットに従って請求書番号を生成
            const invoiceNumber = invoiceFormat
                .replace('{YYYY}', year)
                .replace('{YY}', year.slice(-2))
                .replace('{MM}', month)
                .replace('{DD}', day)
                .replace('{SEQ}', seq);
            return invoiceNumber;
        }
        catch (error) {
            console.error('Error in generateInvoiceNumber:', error);
            // エラーの場合はタイムスタンプベースの番号を生成
            const timestamp = new Date().getTime();
            return `INV-${timestamp}`;
        }
    }
    // PDF generation is now handled by the PDF route
    // Use /api/invoices/[id]/pdf endpoint instead
    /**
     * 支払いを記録
     */
    async recordPayment(id, paidAmount, paymentDate) {
        try {
            const invoice = await this.getInvoice(id);
            if (!invoice) {
                return null;
            }
            const updateData = {
                status: 'paid',
                paidDate: paymentDate,
                paidAmount: paidAmount
            };
            return await this.updateInvoice(id, updateData);
        }
        catch (error) {
            console.error('Error in recordPayment:', error);
            throw new Error('支払い記録の更新に失敗しました');
        }
    }
    /**
     * 請求書をキャンセル
     */
    async cancelInvoice(id) {
        try {
            const updateData = {
                status: 'cancelled'
            };
            return await this.updateInvoice(id, updateData);
        }
        catch (error) {
            console.error('Error in cancelInvoice:', error);
            throw new Error('請求書のキャンセルに失敗しました');
        }
    }
    /**
     * 月次の請求書集計
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
exports.InvoiceService = InvoiceService;
