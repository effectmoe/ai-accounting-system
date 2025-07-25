"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyInfoService = void 0;
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
class CompanyInfoService {
    collectionName = mongodb_client_1.Collections.COMPANY_INFO;
    async getCompanyInfo() {
        try {
            const companies = await mongodb_client_1.db.find(this.collectionName, {}, { limit: 1 });
            return companies.length > 0 ? companies[0] : null;
        }
        catch (error) {
            logger_1.logger.error('Error in getCompanyInfo:', error);
            throw new Error('会社情報の取得に失敗しました');
        }
    }
    async upsertCompanyInfo(companyData) {
        try {
            logger_1.logger.debug('upsertCompanyInfo called with data:', {
                ...companyData,
                logoImage: companyData.logoImage ? '[BASE64_IMAGE]' : null,
                stampImage: companyData.stampImage ? '[BASE64_IMAGE]' : null,
            });
            const existingInfo = await this.getCompanyInfo();
            logger_1.logger.debug('Existing company info found:', !!existingInfo);
            if (existingInfo && existingInfo._id) {
                logger_1.logger.debug('Updating existing company info with ID:', existingInfo._id);
                const { _id, createdAt, updatedAt, ...updateData } = { ...companyData };
                logger_1.logger.debug('Update data prepared:', {
                    ...updateData,
                    logoImage: updateData.logoImage ? '[BASE64_IMAGE]' : null,
                    stampImage: updateData.stampImage ? '[BASE64_IMAGE]' : null,
                });
                const updated = await mongodb_client_1.db.update(this.collectionName, existingInfo._id, updateData);
                if (!updated) {
                    throw new Error('会社情報の更新に失敗しました');
                }
                logger_1.logger.debug('Company info updated successfully');
                return updated;
            }
            else {
                logger_1.logger.debug('Creating new company info');
                const created = await mongodb_client_1.db.create(this.collectionName, companyData);
                logger_1.logger.debug('Company info created successfully');
                return created;
            }
        }
        catch (error) {
            logger_1.logger.error('Error in upsertCompanyInfo:', error);
            throw new Error('会社情報の保存に失敗しました');
        }
    }
    async updateCompanyInfo(updateData) {
        try {
            const existingInfo = await this.getCompanyInfo();
            if (!existingInfo || !existingInfo._id) {
                throw new Error('更新する会社情報が見つかりません');
            }
            const { _id, ...dataToUpdate } = updateData;
            const updated = await mongodb_client_1.db.update(this.collectionName, existingInfo._id, dataToUpdate);
            return updated;
        }
        catch (error) {
            logger_1.logger.error('Error in updateCompanyInfo:', error);
            throw new Error('会社情報の更新に失敗しました');
        }
    }
    async deleteCompanyInfo() {
        try {
            const existingInfo = await this.getCompanyInfo();
            if (!existingInfo || !existingInfo._id) {
                return false;
            }
            return await mongodb_client_1.db.delete(this.collectionName, existingInfo._id);
        }
        catch (error) {
            logger_1.logger.error('Error in deleteCompanyInfo:', error);
            throw new Error('会社情報の削除に失敗しました');
        }
    }
    async generateInvoiceNumber() {
        try {
            const companyInfo = await this.getCompanyInfo();
            const format = companyInfo?.invoiceNumberFormat || 'INV-{YYYY}{MM}{DD}-{SEQ}';
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
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
            const invoiceNumber = format
                .replace('{YYYY}', year)
                .replace('{YY}', year.slice(-2))
                .replace('{MM}', month)
                .replace('{DD}', day)
                .replace('{SEQ}', seq);
            return invoiceNumber;
        }
        catch (error) {
            logger_1.logger.error('Error in generateInvoiceNumber:', error);
            const timestamp = new Date().getTime();
            return `INV-${timestamp}`;
        }
    }
}
exports.CompanyInfoService = CompanyInfoService;
//# sourceMappingURL=company-info.service.js.map