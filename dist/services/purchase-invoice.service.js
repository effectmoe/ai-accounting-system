"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseInvoiceService = void 0;
const mongodb_1 = require("mongodb");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
class PurchaseInvoiceService {
    collection = 'purchaseInvoices';
    /**
     * 仕入請求書番号を生成
     */
    async generatePurchaseInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        // 今月の最新の番号を取得
        const lastInvoice = await mongodb_client_1.db.find(this.collection, {
            invoiceNumber: { $regex: `^PI-${year}${month}-` }
        }, {
            sort: { invoiceNumber: -1 },
            limit: 1
        });
        let nextNumber = 1;
        if (lastInvoice.length > 0) {
            const lastNumber = lastInvoice[0].invoiceNumber;
            const match = lastNumber.match(/PI-\d{6}-(\d{4})/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        return `PI-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
    }
    /**
     * 仕入請求書を作成
     */
    async createPurchaseInvoice(data) {
        logger_1.logger.debug('[PurchaseInvoiceService] Creating purchase invoice with data:', JSON.stringify(data, null, 2));
        const now = new Date();
        const invoice = {
            ...data,
            status: data.status || 'draft',
            paymentStatus: data.paymentStatus || 'pending',
            createdAt: now,
            updatedAt: now
        };
        // 発行日と支払期限のデフォルト設定
        if (!invoice.issueDate) {
            invoice.issueDate = now;
        }
        if (!invoice.dueDate && data.supplierId) {
            // 仕入先の支払条件から支払期限を計算（デフォルト30日）
            const supplier = await mongodb_client_1.db.findOne('suppliers', { _id: new mongodb_1.ObjectId(data.supplierId.toString()) });
            const paymentTerms = supplier?.paymentTerms || 30;
            invoice.dueDate = new Date(invoice.issueDate);
            invoice.dueDate.setDate(invoice.dueDate.getDate() + paymentTerms);
        }
        // 繰越関連フィールドの処理
        if (data.previousBalance !== undefined) {
            invoice.previousBalance = data.previousBalance;
        }
        if (data.currentPayment !== undefined) {
            invoice.currentPayment = data.currentPayment;
        }
        if (data.carryoverAmount !== undefined) {
            invoice.carryoverAmount = data.carryoverAmount;
        }
        if (data.currentSales !== undefined) {
            invoice.currentSales = data.currentSales;
        }
        if (data.currentInvoiceAmount !== undefined) {
            invoice.currentInvoiceAmount = data.currentInvoiceAmount;
        }
        // 備考の処理
        if (data.notes) {
            invoice.notes = data.notes;
        }
        // 金額計算
        if (invoice.items && invoice.items.length > 0) {
            let subtotal = 0;
            let taxAmount = 0;
            const defaultTaxRate = invoice.taxRate || 0.1;
            invoice.items = invoice.items.map(item => {
                const itemAmount = item.quantity * item.unitPrice;
                let itemTaxRate = item.taxRate !== undefined ? item.taxRate : defaultTaxRate;
                // 税率の正規化: 10% -> 0.1に変換
                if (itemTaxRate > 1) {
                    logger_1.logger.debug(`[PurchaseInvoiceService] Normalizing tax rate from ${itemTaxRate}% to ${itemTaxRate / 100}`);
                    itemTaxRate = itemTaxRate / 100;
                }
                // 通常は税抜きから税込みを計算
                const itemTaxAmount = Math.floor(itemAmount * itemTaxRate);
                subtotal += itemAmount;
                taxAmount += itemTaxAmount;
                return {
                    ...item,
                    amount: itemAmount,
                    taxRate: itemTaxRate,
                    taxAmount: itemTaxAmount
                };
            });
            invoice.subtotal = subtotal;
            invoice.taxAmount = taxAmount;
            // totalAmountが既に設定されている場合（OCRから）はそれを使用
            if (!invoice.totalAmount || invoice.totalAmount === 0) {
                invoice.totalAmount = subtotal + taxAmount;
            }
            // currentInvoiceAmountが設定されている場合は、それが最終請求額
            if (invoice.currentInvoiceAmount) {
                invoice.totalAmount = invoice.currentInvoiceAmount;
            }
        }
        const result = await mongodb_client_1.db.create(this.collection, invoice);
        logger_1.logger.debug('[PurchaseInvoiceService] Created purchase invoice:', result._id);
        logger_1.logger.debug('[PurchaseInvoiceService] Created invoice data:', {
            id: result._id,
            hasNotes: !!result.notes,
            hasSupplierId: !!result.supplierId
        });
        return result;
    }
    /**
     * 仕入請求書を取得
     */
    async getPurchaseInvoice(id) {
        const invoice = await mongodb_client_1.db.findOne(this.collection, { _id: new mongodb_1.ObjectId(id) });
        if (!invoice)
            return null;
        logger_1.logger.debug('[PurchaseInvoiceService] Retrieved invoice:', {
            id: invoice._id,
            supplierId: invoice.supplierId,
            hasSupplier: !!invoice.supplier
        });
        // 仕入先情報をpopulate
        if (invoice.supplierId) {
            invoice.supplier = await mongodb_client_1.db.findOne('suppliers', { _id: invoice.supplierId });
        }
        // 発注書情報をpopulate
        if (invoice.purchaseOrderId) {
            invoice.purchaseOrder = await mongodb_client_1.db.findOne('purchaseOrders', { _id: invoice.purchaseOrderId });
        }
        // 銀行口座情報をpopulate
        if (invoice.bankAccountId) {
            invoice.bankAccount = await mongodb_client_1.db.findOne('bankAccounts', { _id: invoice.bankAccountId });
        }
        return invoice;
    }
    /**
     * 仕入請求書を更新
     */
    async updatePurchaseInvoice(id, data) {
        logger_1.logger.debug('[PurchaseInvoiceService] Updating purchase invoice:', id, JSON.stringify(data, null, 2));
        const updateData = {
            ...data,
            updatedAt: new Date()
        };
        // _idは更新対象から除外
        delete updateData._id;
        delete updateData.id;
        // 金額計算
        if (updateData.items && updateData.items.length > 0) {
            let subtotal = 0;
            let taxAmount = 0;
            const defaultTaxRate = updateData.taxRate || 0.1;
            updateData.items = updateData.items.map(item => {
                const itemAmount = item.quantity * item.unitPrice;
                let itemTaxRate = item.taxRate !== undefined ? item.taxRate : defaultTaxRate;
                // 税率の正規化: 10% -> 0.1に変換
                if (itemTaxRate > 1) {
                    logger_1.logger.debug(`[PurchaseInvoiceService] Normalizing tax rate from ${itemTaxRate}% to ${itemTaxRate / 100}`);
                    itemTaxRate = itemTaxRate / 100;
                }
                // 通常は税抜きから税込みを計算
                const itemTaxAmount = Math.floor(itemAmount * itemTaxRate);
                subtotal += itemAmount;
                taxAmount += itemTaxAmount;
                return {
                    ...item,
                    amount: itemAmount,
                    taxRate: itemTaxRate,
                    taxAmount: itemTaxAmount
                };
            });
            updateData.subtotal = subtotal;
            updateData.taxAmount = taxAmount;
            // totalAmountが既に設定されている場合（手動修正）はそれを使用
            if (!updateData.totalAmount || updateData.totalAmount === 0) {
                updateData.totalAmount = subtotal + taxAmount;
            }
            // currentInvoiceAmountが設定されている場合は、それが最終請求額
            if (updateData.currentInvoiceAmount) {
                updateData.totalAmount = updateData.currentInvoiceAmount;
            }
        }
        const result = await mongodb_client_1.db.update(this.collection, id, updateData);
        if (!result) {
            return null;
        }
        return this.getPurchaseInvoice(id);
    }
    /**
     * 仕入請求書を検索
     */
    async searchPurchaseInvoices(params) {
        const query = {};
        if (params.supplierId) {
            query.supplierId = new mongodb_1.ObjectId(params.supplierId);
        }
        if (params.status) {
            query.status = params.status;
        }
        if (params.paymentStatus) {
            query.paymentStatus = params.paymentStatus;
        }
        if (params.dateFrom || params.dateTo) {
            query.issueDate = {};
            if (params.dateFrom) {
                query.issueDate.$gte = params.dateFrom;
            }
            if (params.dateTo) {
                query.issueDate.$lte = params.dateTo;
            }
        }
        if (params.isGeneratedByAI !== undefined) {
            query.isGeneratedByAI = params.isGeneratedByAI;
        }
        // データ取得
        const [invoices, total] = await Promise.all([
            mongodb_client_1.db.find(this.collection, query, {
                limit: params.limit || 50,
                skip: params.skip || 0,
                sort: { issueDate: -1, createdAt: -1 }
            }),
            mongodb_client_1.db.count(this.collection, query)
        ]);
        // 仕入先情報をpopulate
        const populatedInvoices = await Promise.all(invoices.map(async (invoice) => {
            if (invoice.supplierId) {
                invoice.supplier = await mongodb_client_1.db.findOne('suppliers', { _id: invoice.supplierId });
            }
            return invoice;
        }));
        // 合計金額を計算
        const totalAmount = populatedInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
        return {
            invoices: populatedInvoices,
            total,
            totalAmount
        };
    }
    /**
     * 仕入請求書を削除
     */
    async deletePurchaseInvoice(id) {
        const result = await mongodb_client_1.db.delete(this.collection, id);
        return result;
    }
    /**
     * ステータスを更新
     */
    async updateStatus(id, status) {
        logger_1.logger.debug('[PurchaseInvoiceService] Updating status:', id, status);
        const updateData = {
            status,
            updatedAt: new Date()
        };
        // ステータスに応じて追加の更新
        if (status === 'received' && !updateData.receivedDate) {
            updateData.receivedDate = new Date();
        }
        if (status === 'approved' && !updateData.approvedAt) {
            updateData.approvedAt = new Date();
        }
        const result = await mongodb_client_1.db.update(this.collection, id, updateData);
        if (!result) {
            return null;
        }
        return this.getPurchaseInvoice(id);
    }
    /**
     * 支払い情報を更新
     */
    async updatePayment(id, paymentData) {
        logger_1.logger.debug('[PurchaseInvoiceService] Updating payment:', id, paymentData);
        const updateData = {
            ...paymentData,
            updatedAt: new Date()
        };
        // 支払い完了の場合、ステータスも更新
        if (paymentData.paymentStatus === 'paid') {
            updateData.status = 'paid';
            if (!paymentData.paidDate) {
                updateData.paidDate = new Date();
            }
        }
        const result = await mongodb_client_1.db.update(this.collection, id, updateData);
        if (!result) {
            return null;
        }
        return this.getPurchaseInvoice(id);
    }
    /**
     * 月次集計を取得
     */
    async getMonthlyAggregation(year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const invoices = await mongodb_client_1.db.find(this.collection, {
            issueDate: { $gte: startDate, $lte: endDate }
        });
        // 仕入先情報を取得
        const supplierIds = [...new Set(invoices.map(inv => inv.supplierId?.toString()).filter(Boolean))];
        const suppliers = await mongodb_client_1.db.find('suppliers', {
            _id: { $in: supplierIds.map(id => new mongodb_1.ObjectId(id)) }
        });
        const supplierMap = new Map(suppliers.map(s => [s._id.toString(), s]));
        // 集計
        const bySupplierMap = new Map();
        let totalAmount = 0;
        let paidAmount = 0;
        invoices.forEach(invoice => {
            const supplierId = invoice.supplierId?.toString();
            if (!supplierId)
                return;
            totalAmount += invoice.totalAmount || 0;
            if (invoice.paymentStatus === 'paid') {
                paidAmount += invoice.totalAmount || 0;
            }
            if (!bySupplierMap.has(supplierId)) {
                const supplier = supplierMap.get(supplierId);
                bySupplierMap.set(supplierId, {
                    supplierId: invoice.supplierId,
                    supplierName: supplier?.companyName || '不明',
                    invoiceCount: 0,
                    totalAmount: 0,
                    paidAmount: 0
                });
            }
            const supplierData = bySupplierMap.get(supplierId);
            supplierData.invoiceCount++;
            supplierData.totalAmount += invoice.totalAmount || 0;
            if (invoice.paymentStatus === 'paid') {
                supplierData.paidAmount += invoice.totalAmount || 0;
            }
        });
        return {
            totalInvoices: invoices.length,
            totalAmount,
            paidAmount,
            pendingAmount: totalAmount - paidAmount,
            bySupplier: Array.from(bySupplierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
        };
    }
}
exports.PurchaseInvoiceService = PurchaseInvoiceService;
