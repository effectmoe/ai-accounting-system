"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyInfoService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
class CompanyInfoService {
    collectionName = mongodb_client_1.Collections.COMPANY_INFO;
    /**
     * 会社情報を取得（最初の1件）
     */
    async getCompanyInfo() {
        try {
            const companies = await mongodb_client_1.db.find(this.collectionName, {}, { limit: 1 });
            return companies.length > 0 ? companies[0] : null;
        }
        catch (error) {
            console.error('Error in getCompanyInfo:', error);
            throw new Error('会社情報の取得に失敗しました');
        }
    }
    /**
     * 会社情報を作成または更新（アップサート）
     */
    async upsertCompanyInfo(companyData) {
        try {
            console.log('upsertCompanyInfo called with data:', {
                ...companyData,
                logoImage: companyData.logoImage ? '[BASE64_IMAGE]' : null,
                stampImage: companyData.stampImage ? '[BASE64_IMAGE]' : null,
            });
            // 既存の会社情報を取得
            const existingInfo = await this.getCompanyInfo();
            console.log('Existing company info found:', !!existingInfo);
            if (existingInfo && existingInfo._id) {
                // 更新
                console.log('Updating existing company info with ID:', existingInfo._id);
                // _idフィールドを除外して更新データを準備
                const { _id, createdAt, updatedAt, ...updateData } = { ...companyData };
                console.log('Update data prepared:', {
                    ...updateData,
                    logoImage: updateData.logoImage ? '[BASE64_IMAGE]' : null,
                    stampImage: updateData.stampImage ? '[BASE64_IMAGE]' : null,
                });
                const updated = await mongodb_client_1.db.update(this.collectionName, existingInfo._id, updateData);
                if (!updated) {
                    throw new Error('会社情報の更新に失敗しました');
                }
                console.log('Company info updated successfully');
                return updated;
            }
            else {
                // 新規作成
                console.log('Creating new company info');
                const created = await mongodb_client_1.db.create(this.collectionName, companyData);
                console.log('Company info created successfully');
                return created;
            }
        }
        catch (error) {
            console.error('Error in upsertCompanyInfo:', error);
            throw new Error('会社情報の保存に失敗しました');
        }
    }
    /**
     * 会社情報を更新
     */
    async updateCompanyInfo(updateData) {
        try {
            const existingInfo = await this.getCompanyInfo();
            if (!existingInfo || !existingInfo._id) {
                throw new Error('更新する会社情報が見つかりません');
            }
            // _idフィールドは更新対象から除外
            const { _id, ...dataToUpdate } = updateData;
            const updated = await mongodb_client_1.db.update(this.collectionName, existingInfo._id, dataToUpdate);
            return updated;
        }
        catch (error) {
            console.error('Error in updateCompanyInfo:', error);
            throw new Error('会社情報の更新に失敗しました');
        }
    }
    /**
     * 会社情報を削除
     */
    async deleteCompanyInfo() {
        try {
            const existingInfo = await this.getCompanyInfo();
            if (!existingInfo || !existingInfo._id) {
                return false;
            }
            return await mongodb_client_1.db.delete(this.collectionName, existingInfo._id);
        }
        catch (error) {
            console.error('Error in deleteCompanyInfo:', error);
            throw new Error('会社情報の削除に失敗しました');
        }
    }
    /**
     * 請求書番号を生成
     */
    async generateInvoiceNumber() {
        try {
            const companyInfo = await this.getCompanyInfo();
            const format = companyInfo?.invoiceNumberFormat || 'INV-{YYYY}{MM}{DD}-{SEQ}';
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            // シーケンス番号を取得（今日の請求書数 + 1）
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const invoiceCount = await mongodb_client_1.db.count(mongodb_client_1.Collections.INVOICES, {
                createdAt: {
                    $gte: today,
                    $lt: tomorrow
                }
            });
            const seq = (invoiceCount + 1).toString().padStart(3, '0');
            // フォーマットに従って請求書番号を生成
            const invoiceNumber = format
                .replace('{YYYY}', year)
                .replace('{YY}', year.slice(-2))
                .replace('{MM}', month)
                .replace('{DD}', day)
                .replace('{SEQ}', seq);
            return invoiceNumber;
        }
        catch (error) {
            console.error('Error in generateInvoiceNumber:', error);
            // エラーの場合はデフォルトフォーマットで生成
            const timestamp = new Date().getTime();
            return `INV-${timestamp}`;
        }
    }
}
exports.CompanyInfoService = CompanyInfoService;
