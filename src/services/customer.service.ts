import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { Customer, Contact, PaymentTerms } from '@/types/collections';
import { ObjectId } from 'mongodb';

export class CustomerService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * 顧客を作成
   */
  async createCustomer(customer: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    // デフォルト値の設定
    const customerWithDefaults = {
      ...customer,
      isActive: customer.isActive ?? true,
      tags: customer.tags ?? [],
      contacts: customer.contacts ?? []
    };

    return await this.db.create<Customer>(Collections.CUSTOMERS, customerWithDefaults);
  }

  /**
   * 顧客をIDで取得
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    return await this.db.findById<Customer>(Collections.CUSTOMERS, id);
  }

  /**
   * 顧客を検索
   */
  async searchCustomers(params: {
    query?: string;
    isActive?: boolean;
    tags?: string[];
    limit?: number;
    skip?: number;
  }): Promise<{ customers: Customer[]; total: number }> {
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

    const [customers, total] = await Promise.all([
      this.db.find<Customer>(Collections.CUSTOMERS, filter, {
        sort: { companyName: 1 },
        limit: params.limit,
        skip: params.skip
      }),
      this.db.count(Collections.CUSTOMERS, filter)
    ]);

    return { customers, total };
  }

  /**
   * 顧客を更新
   */
  async updateCustomer(id: string, update: Partial<Customer>): Promise<Customer | null> {
    // _id, createdAt, updatedAtは更新しない
    const { _id, createdAt, updatedAt, ...updateData } = update;
    return await this.db.update<Customer>(Collections.CUSTOMERS, id, updateData);
  }

  /**
   * 顧客を削除（論理削除）
   */
  async deleteCustomer(id: string): Promise<boolean> {
    const result = await this.db.update<Customer>(Collections.CUSTOMERS, id, {
      isActive: false
    });
    return result !== null;
  }

  /**
   * 顧客を物理削除
   */
  async permanentlyDeleteCustomer(id: string): Promise<boolean> {
    return await this.db.delete(Collections.CUSTOMERS, id);
  }

  /**
   * 担当者を追加
   */
  async addContact(customerId: string, contact: Contact): Promise<Customer | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updatedContacts = [...customer.contacts, contact];
    return await this.updateCustomer(customerId, { contacts: updatedContacts });
  }

  /**
   * 担当者を更新
   */
  async updateContact(customerId: string, contactIndex: number, contact: Contact): Promise<Customer | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (contactIndex < 0 || contactIndex >= customer.contacts.length) {
      throw new Error('Invalid contact index');
    }

    const updatedContacts = [...customer.contacts];
    updatedContacts[contactIndex] = contact;
    return await this.updateCustomer(customerId, { contacts: updatedContacts });
  }

  /**
   * 担当者を削除
   */
  async removeContact(customerId: string, contactIndex: number): Promise<Customer | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (contactIndex < 0 || contactIndex >= customer.contacts.length) {
      throw new Error('Invalid contact index');
    }

    const updatedContacts = customer.contacts.filter((_, index) => index !== contactIndex);
    return await this.updateCustomer(customerId, { contacts: updatedContacts });
  }

  /**
   * 支払条件を更新
   */
  async updatePaymentTerms(customerId: string, paymentTerms: PaymentTerms): Promise<Customer | null> {
    return await this.updateCustomer(customerId, { paymentTerms });
  }

  /**
   * タグを追加
   */
  async addTags(customerId: string, tags: string[]): Promise<Customer | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updatedTags = Array.from(new Set([...customer.tags || [], ...tags]));
    return await this.updateCustomer(customerId, { tags: updatedTags });
  }

  /**
   * タグを削除
   */
  async removeTags(customerId: string, tags: string[]): Promise<Customer | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updatedTags = (customer.tags || []).filter(tag => !tags.includes(tag));
    return await this.updateCustomer(customerId, { tags: updatedTags });
  }

  /**
   * 重複チェック
   */
  async checkDuplicates(params: {
    companyName?: string;
    email?: string;
    registrationNumber?: string;
    excludeId?: string;
  }): Promise<Customer[]> {
    const conditions = [];

    if (params.companyName) {
      conditions.push({ companyName: params.companyName });
    }
    if (params.email) {
      conditions.push({ email: params.email });
    }
    if (params.registrationNumber) {
      conditions.push({ registrationNumber: params.registrationNumber });
    }

    if (conditions.length === 0) {
      return [];
    }

    const filter: any = { $or: conditions };
    if (params.excludeId) {
      filter._id = { $ne: new ObjectId(params.excludeId) };
    }

    return await this.db.find<Customer>(Collections.CUSTOMERS, filter);
  }
}