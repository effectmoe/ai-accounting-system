import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { Customer, Contact } from '@/types/collections';

import { logger } from '@/lib/logger';
export interface CustomerSearchParams {
  query?: string;
  isActive?: boolean;
  tags?: string[];
  limit?: number;
  skip?: number;
}

export interface CustomerSearchResult {
  customers: Customer[];
  total: number;
  hasMore: boolean;
}

export class CustomerService {
  private collectionName = Collections.CUSTOMERS;

  /**
   * 顧客を検索
   */
  async searchCustomers(params: CustomerSearchParams = {}): Promise<CustomerSearchResult> {
    try {
      const filter: any = {};

      // テキスト検索
      if (params.query) {
        filter.$text = { $search: params.query };
      }

      // アクティブフィルター
      if (params.isActive !== undefined) {
        filter.isActive = params.isActive;
      }

      // タグフィルター
      if (params.tags && params.tags.length > 0) {
        filter.tags = { $in: params.tags };
      }

      const limit = params.limit || 20;
      const skip = params.skip || 0;

      // 顧客を取得
      const customers = await db.find<Customer>(this.collectionName, filter, {
        sort: { companyName: 1 },
        limit: limit + 1, // hasMoreを判定するため1件多く取得
        skip,
      });

      // hasMoreの判定
      const hasMore = customers.length > limit;
      if (hasMore) {
        customers.pop(); // 余分な1件を削除
      }

      // 総数を取得
      const total = await db.count(this.collectionName, filter);

      return {
        customers,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in searchCustomers:', error);
      throw new Error('顧客の検索に失敗しました');
    }
  }

  /**
   * 全ての顧客を取得
   */
  async getAllCustomers(includeInactive: boolean = false): Promise<Customer[]> {
    try {
      const filter = includeInactive ? {} : { isActive: { $ne: false } };
      return await db.find<Customer>(this.collectionName, filter, {
        sort: { companyName: 1 }
      });
    } catch (error) {
      logger.error('Error in getAllCustomers:', error);
      throw new Error('顧客一覧の取得に失敗しました');
    }
  }

  /**
   * 顧客を作成
   */
  async createCustomer(customerData: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    try {
      // メールアドレスの重複チェック
      if (customerData.email) {
        const existing = await db.findOne<Customer>(this.collectionName, {
          email: customerData.email
        });

        if (existing) {
          throw new Error(`メールアドレス ${customerData.email} は既に使用されています`);
        }
      }

      // デフォルト値の設定
      const customer: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'> = {
        ...customerData,
        isActive: customerData.isActive ?? true,
        tags: customerData.tags || [],
        contacts: customerData.contacts || [],
      };

      // 顧客を作成
      const created = await db.create<Customer>(this.collectionName, customer);
      return created;
    } catch (error) {
      logger.error('Error in createCustomer:', error);
      throw error instanceof Error ? error : new Error('顧客の作成に失敗しました');
    }
  }

  /**
   * 顧客を取得
   */
  async getCustomer(id: string): Promise<Customer | null> {
    try {
      return await db.findById<Customer>(this.collectionName, id);
    } catch (error) {
      logger.error('Error in getCustomer:', error);
      throw new Error('顧客の取得に失敗しました');
    }
  }

  /**
   * 顧客を更新
   */
  async updateCustomer(id: string, updateData: Partial<Customer>): Promise<Customer | null> {
    try {
      // _idフィールドは更新対象から除外
      const { _id, ...dataToUpdate } = updateData;

      // メールアドレスの重複チェック（自分自身は除外）
      if (dataToUpdate.email) {
        const existing = await db.findOne<Customer>(this.collectionName, {
          email: dataToUpdate.email,
          _id: { $ne: new ObjectId(id) }
        });

        if (existing) {
          throw new Error(`メールアドレス ${dataToUpdate.email} は既に使用されています`);
        }
      }

      const updated = await db.update<Customer>(this.collectionName, id, dataToUpdate);
      return updated;
    } catch (error) {
      logger.error('Error in updateCustomer:', error);
      throw error instanceof Error ? error : new Error('顧客の更新に失敗しました');
    }
  }

  /**
   * 顧客を削除
   */
  async deleteCustomer(id: string): Promise<boolean> {
    try {
      // 関連する請求書の存在チェック
      const invoiceCount = await db.count(Collections.INVOICES, {
        customerId: new ObjectId(id)
      });

      if (invoiceCount > 0) {
        throw new Error('この顧客に関連する請求書が存在するため削除できません');
      }

      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error('Error in deleteCustomer:', error);
      throw error instanceof Error ? error : new Error('顧客の削除に失敗しました');
    }
  }

  /**
   * 顧客の有効/無効を切り替え
   */
  async toggleCustomerStatus(id: string): Promise<Customer | null> {
    try {
      const customer = await this.getCustomer(id);
      if (!customer) {
        throw new Error('顧客が見つかりません');
      }

      return await this.updateCustomer(id, {
        isActive: !customer.isActive
      });
    } catch (error) {
      logger.error('Error in toggleCustomerStatus:', error);
      throw error instanceof Error ? error : new Error('顧客ステータスの切り替えに失敗しました');
    }
  }

  /**
   * 連絡先を追加
   */
  async addContact(customerId: string, contact: Contact): Promise<Customer | null> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('顧客が見つかりません');
      }

      const contacts = customer.contacts || [];
      
      // 既にプライマリー連絡先がある場合は、新しい連絡先をプライマリーにしない
      if (contact.isPrimary && contacts.some(c => c.isPrimary)) {
        contacts.forEach(c => c.isPrimary = false);
      }

      contacts.push(contact);

      return await this.updateCustomer(customerId, { contacts });
    } catch (error) {
      logger.error('Error in addContact:', error);
      throw error instanceof Error ? error : new Error('連絡先の追加に失敗しました');
    }
  }

  /**
   * 連絡先を更新
   */
  async updateContact(customerId: string, contactIndex: number, contact: Contact): Promise<Customer | null> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('顧客が見つかりません');
      }

      const contacts = customer.contacts || [];
      if (contactIndex < 0 || contactIndex >= contacts.length) {
        throw new Error('無効な連絡先インデックスです');
      }

      // プライマリー連絡先の処理
      if (contact.isPrimary) {
        contacts.forEach((c, i) => {
          if (i !== contactIndex) {
            c.isPrimary = false;
          }
        });
      }

      contacts[contactIndex] = contact;

      return await this.updateCustomer(customerId, { contacts });
    } catch (error) {
      logger.error('Error in updateContact:', error);
      throw error instanceof Error ? error : new Error('連絡先の更新に失敗しました');
    }
  }

  /**
   * 連絡先を削除
   */
  async removeContact(customerId: string, contactIndex: number): Promise<Customer | null> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('顧客が見つかりません');
      }

      const contacts = customer.contacts || [];
      if (contactIndex < 0 || contactIndex >= contacts.length) {
        throw new Error('無効な連絡先インデックスです');
      }

      contacts.splice(contactIndex, 1);

      return await this.updateCustomer(customerId, { contacts });
    } catch (error) {
      logger.error('Error in removeContact:', error);
      throw error instanceof Error ? error : new Error('連絡先の削除に失敗しました');
    }
  }

  /**
   * タグを追加
   */
  async addTag(customerId: string, tag: string): Promise<Customer | null> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('顧客が見つかりません');
      }

      const tags = customer.tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }

      return await this.updateCustomer(customerId, { tags });
    } catch (error) {
      logger.error('Error in addTag:', error);
      throw error instanceof Error ? error : new Error('タグの追加に失敗しました');
    }
  }

  /**
   * タグを削除
   */
  async removeTag(customerId: string, tag: string): Promise<Customer | null> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('顧客が見つかりません');
      }

      const tags = (customer.tags || []).filter(t => t !== tag);

      return await this.updateCustomer(customerId, { tags });
    } catch (error) {
      logger.error('Error in removeTag:', error);
      throw error instanceof Error ? error : new Error('タグの削除に失敗しました');
    }
  }

  /**
   * 全てのタグを取得
   */
  async getAllTags(): Promise<string[]> {
    try {
      const pipeline = [
        { $unwind: '$tags' },
        { $group: { _id: '$tags' } },
        { $sort: { _id: 1 } },
      ];

      const result = await db.aggregate<{ _id: string }>(this.collectionName, pipeline);
      return result.map(item => item._id);
    } catch (error) {
      logger.error('Error in getAllTags:', error);
      throw new Error('タグ一覧の取得に失敗しました');
    }
  }
}