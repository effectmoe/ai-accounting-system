import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
export interface BankAccount {
  _id?: ObjectId;
  bankName: string;
  branchName: string;
  accountType: 'checking' | 'savings';
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BankAccountService {
  private collectionName = Collections.BANK_ACCOUNTS;

  /**
   * 全ての銀行口座を取得
   */
  async getAllBankAccounts(): Promise<BankAccount[]> {
    try {
      const accounts = await db.find<BankAccount>(this.collectionName, {}, {
        sort: { isDefault: -1, bankName: 1 }
      });
      return accounts;
    } catch (error) {
      logger.error('Error in getAllBankAccounts:', error);
      throw new Error('銀行口座の取得に失敗しました');
    }
  }

  /**
   * 銀行口座をIDで取得
   */
  async getBankAccountById(id: string): Promise<BankAccount | null> {
    try {
      return await db.findById<BankAccount>(this.collectionName, id);
    } catch (error) {
      logger.error('Error in getBankAccountById:', error);
      throw new Error('銀行口座の取得に失敗しました');
    }
  }

  /**
   * 新規銀行口座を作成
   */
  async createBankAccount(accountData: Omit<BankAccount, '_id' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> {
    try {
      // デフォルト口座に設定する場合、他の口座のデフォルトフラグを解除
      if (accountData.isDefault) {
        await this.unsetDefaultAccounts();
      }

      const account = await db.create<BankAccount>(this.collectionName, accountData);
      return account;
    } catch (error) {
      logger.error('Error in createBankAccount:', error);
      throw new Error('銀行口座の作成に失敗しました');
    }
  }

  /**
   * 銀行口座を更新
   */
  async updateBankAccount(id: string, updateData: Partial<BankAccount>): Promise<BankAccount | null> {
    try {
      // デフォルト口座に設定する場合、他の口座のデフォルトフラグを解除
      if (updateData.isDefault) {
        await this.unsetDefaultAccounts(id);
      }

      // _idフィールドは更新対象から除外
      const { _id, ...dataToUpdate } = updateData;

      const updated = await db.update<BankAccount>(this.collectionName, id, dataToUpdate);
      return updated;
    } catch (error) {
      logger.error('Error in updateBankAccount:', error);
      throw new Error('銀行口座の更新に失敗しました');
    }
  }

  /**
   * 銀行口座を削除
   */
  async deleteBankAccount(id: string): Promise<boolean> {
    try {
      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error('Error in deleteBankAccount:', error);
      throw new Error('銀行口座の削除に失敗しました');
    }
  }

  /**
   * デフォルト口座を取得
   */
  async getDefaultAccount(): Promise<BankAccount | null> {
    try {
      return await db.findOne<BankAccount>(this.collectionName, { isDefault: true });
    } catch (error) {
      logger.error('Error in getDefaultAccount:', error);
      throw new Error('デフォルト口座の取得に失敗しました');
    }
  }

  /**
   * 全ての口座のデフォルトフラグを解除
   */
  private async unsetDefaultAccounts(excludeId?: string): Promise<void> {
    try {
      const collection = await db.getCollection<BankAccount>(this.collectionName);
      const filter: any = { isDefault: true };
      
      // 特定のIDを除外する場合
      if (excludeId) {
        filter._id = { $ne: new ObjectId(excludeId) };
      }

      await collection.updateMany(filter, { $set: { isDefault: false } });
    } catch (error) {
      logger.error('Error in unsetDefaultAccounts:', error);
      throw new Error('デフォルトフラグの解除に失敗しました');
    }
  }
}