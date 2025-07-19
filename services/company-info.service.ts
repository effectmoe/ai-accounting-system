import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { SpeechSettings } from '@/types/collections';

import { logger } from '@/lib/logger';
export interface CompanyInfo {
  _id?: ObjectId;
  companyName: string;
  registrationNumber?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  fiscalYearEnd?: string;
  invoiceNumberFormat?: string;
  invoicePrefix?: string;
  paymentTerms?: string;
  invoiceNotes?: string;
  logoUrl?: string;
  logoImage?: string;
  stampImage?: string;
  representative?: string;
  establishedDate?: string;
  capital?: number;
  quoteValidityDays?: number;
  speechSettings?: SpeechSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CompanyInfoService {
  private collectionName = Collections.COMPANY_INFO;

  /**
   * 会社情報を取得（最初の1件）
   */
  async getCompanyInfo(): Promise<CompanyInfo | null> {
    try {
      const companies = await db.find<CompanyInfo>(this.collectionName, {}, { limit: 1 });
      return companies.length > 0 ? companies[0] : null;
    } catch (error) {
      logger.error('Error in getCompanyInfo:', error);
      throw new Error('会社情報の取得に失敗しました');
    }
  }

  /**
   * 会社情報を作成または更新（アップサート）
   */
  async upsertCompanyInfo(companyData: Omit<CompanyInfo, '_id' | 'createdAt' | 'updatedAt'>): Promise<CompanyInfo> {
    try {
      logger.debug('upsertCompanyInfo called with data:', {
        ...companyData,
        logoImage: companyData.logoImage ? '[BASE64_IMAGE]' : null,
        stampImage: companyData.stampImage ? '[BASE64_IMAGE]' : null,
      });

      // 既存の会社情報を取得
      const existingInfo = await this.getCompanyInfo();
      logger.debug('Existing company info found:', !!existingInfo);

      if (existingInfo && existingInfo._id) {
        // 更新
        logger.debug('Updating existing company info with ID:', existingInfo._id);
        
        // _idフィールドを除外して更新データを準備
        const { _id, createdAt, updatedAt, ...updateData } = { ...companyData } as any;
        logger.debug('Update data prepared:', {
          ...updateData,
          logoImage: updateData.logoImage ? '[BASE64_IMAGE]' : null,
          stampImage: updateData.stampImage ? '[BASE64_IMAGE]' : null,
        });
        
        const updated = await db.update<CompanyInfo>(
          this.collectionName,
          existingInfo._id,
          updateData
        );
        
        if (!updated) {
          throw new Error('会社情報の更新に失敗しました');
        }
        
        logger.debug('Company info updated successfully');
        return updated;
      } else {
        // 新規作成
        logger.debug('Creating new company info');
        const created = await db.create<CompanyInfo>(this.collectionName, companyData);
        logger.debug('Company info created successfully');
        return created;
      }
    } catch (error) {
      logger.error('Error in upsertCompanyInfo:', error);
      throw new Error('会社情報の保存に失敗しました');
    }
  }

  /**
   * 会社情報を更新
   */
  async updateCompanyInfo(updateData: Partial<CompanyInfo>): Promise<CompanyInfo | null> {
    try {
      const existingInfo = await this.getCompanyInfo();
      
      if (!existingInfo || !existingInfo._id) {
        throw new Error('更新する会社情報が見つかりません');
      }

      // _idフィールドは更新対象から除外
      const { _id, ...dataToUpdate } = updateData;

      const updated = await db.update<CompanyInfo>(
        this.collectionName,
        existingInfo._id,
        dataToUpdate
      );

      return updated;
    } catch (error) {
      logger.error('Error in updateCompanyInfo:', error);
      throw new Error('会社情報の更新に失敗しました');
    }
  }

  /**
   * 会社情報を削除
   */
  async deleteCompanyInfo(): Promise<boolean> {
    try {
      const existingInfo = await this.getCompanyInfo();
      
      if (!existingInfo || !existingInfo._id) {
        return false;
      }

      return await db.delete(this.collectionName, existingInfo._id);
    } catch (error) {
      logger.error('Error in deleteCompanyInfo:', error);
      throw new Error('会社情報の削除に失敗しました');
    }
  }

  /**
   * 請求書番号を生成
   */
  async generateInvoiceNumber(): Promise<string> {
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
      
      const invoiceCount = await db.count(Collections.INVOICES, {
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
    } catch (error) {
      logger.error('Error in generateInvoiceNumber:', error);
      // エラーの場合はデフォルトフォーマットで生成
      const timestamp = new Date().getTime();
      return `INV-${timestamp}`;
    }
  }
}