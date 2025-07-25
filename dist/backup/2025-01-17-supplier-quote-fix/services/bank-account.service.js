"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankAccountService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
class BankAccountService {
    collectionName = mongodb_client_1.Collections.BANK_ACCOUNTS;
    /**
     * 全ての銀行口座を取得
     */
    async getAllBankAccounts() {
        try {
            const accounts = await mongodb_client_1.db.find(this.collectionName, {}, {
                sort: { isDefault: -1, bankName: 1 }
            });
            return accounts;
        }
        catch (error) {
            console.error('Error in getAllBankAccounts:', error);
            throw new Error('銀行口座の取得に失敗しました');
        }
    }
    /**
     * 銀行口座をIDで取得
     */
    async getBankAccountById(id) {
        try {
            return await mongodb_client_1.db.findById(this.collectionName, id);
        }
        catch (error) {
            console.error('Error in getBankAccountById:', error);
            throw new Error('銀行口座の取得に失敗しました');
        }
    }
    /**
     * 新規銀行口座を作成
     */
    async createBankAccount(accountData) {
        try {
            // デフォルト口座に設定する場合、他の口座のデフォルトフラグを解除
            if (accountData.isDefault) {
                await this.unsetDefaultAccounts();
            }
            const account = await mongodb_client_1.db.create(this.collectionName, accountData);
            return account;
        }
        catch (error) {
            console.error('Error in createBankAccount:', error);
            throw new Error('銀行口座の作成に失敗しました');
        }
    }
    /**
     * 銀行口座を更新
     */
    async updateBankAccount(id, updateData) {
        try {
            // デフォルト口座に設定する場合、他の口座のデフォルトフラグを解除
            if (updateData.isDefault) {
                await this.unsetDefaultAccounts(id);
            }
            // _idフィールドは更新対象から除外
            const { _id, ...dataToUpdate } = updateData;
            const updated = await mongodb_client_1.db.update(this.collectionName, id, dataToUpdate);
            return updated;
        }
        catch (error) {
            console.error('Error in updateBankAccount:', error);
            throw new Error('銀行口座の更新に失敗しました');
        }
    }
    /**
     * 銀行口座を削除
     */
    async deleteBankAccount(id) {
        try {
            return await mongodb_client_1.db.delete(this.collectionName, id);
        }
        catch (error) {
            console.error('Error in deleteBankAccount:', error);
            throw new Error('銀行口座の削除に失敗しました');
        }
    }
    /**
     * デフォルト口座を取得
     */
    async getDefaultAccount() {
        try {
            return await mongodb_client_1.db.findOne(this.collectionName, { isDefault: true });
        }
        catch (error) {
            console.error('Error in getDefaultAccount:', error);
            throw new Error('デフォルト口座の取得に失敗しました');
        }
    }
    /**
     * 全ての口座のデフォルトフラグを解除
     */
    async unsetDefaultAccounts(excludeId) {
        try {
            const collection = await mongodb_client_1.db.getCollection(this.collectionName);
            const filter = { isDefault: true };
            // 特定のIDを除外する場合
            if (excludeId) {
                filter._id = { $ne: new mongodb_1.ObjectId(excludeId) };
            }
            await collection.updateMany(filter, { $set: { isDefault: false } });
        }
        catch (error) {
            console.error('Error in unsetDefaultAccounts:', error);
            throw new Error('デフォルトフラグの解除に失敗しました');
        }
    }
}
exports.BankAccountService = BankAccountService;
