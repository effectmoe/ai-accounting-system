import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { Invoice, InvoiceStatus, InvoiceItem, Customer, BankAccount } from '@/types/collections';
import { CompanyInfoService } from './company-info.service';

import { logger } from '@/lib/logger';
export interface InvoiceSearchParams {
  customerId?: string;
  status?: InvoiceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  isGeneratedByAI?: boolean;
  search?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface InvoiceSearchResult {
  invoices: Invoice[];
  total: number;
  hasMore: boolean;
}

export class InvoiceService {
  private collectionName = Collections.INVOICES;

  /**
   * 請求書を検索
   */
  async searchInvoices(params: InvoiceSearchParams): Promise<InvoiceSearchResult> {
    try {
      const filter: any = {};

      if (params.customerId) {
        filter.customerId = new ObjectId(params.customerId);
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

      // 検索クエリ（請求書番号、タイトル、顧客名で検索）
      if (params.search) {
        const searchRegex = { $regex: params.search, $options: 'i' };

        // 顧客名で検索する場合、まず顧客を検索してIDを取得
        const matchingCustomers = await db.find<Customer>(Collections.CUSTOMERS, {
          $or: [
            { companyName: searchRegex },
            { companyNameKana: searchRegex },
            { 'contacts.name': searchRegex },
          ]
        });
        const matchingCustomerIds = matchingCustomers.map(c => c._id);

        // 請求書のフィールドまたは顧客IDで検索
        const searchConditions: any[] = [
          { invoiceNumber: searchRegex },
          { title: searchRegex },
        ];

        // マッチした顧客がいる場合、その顧客IDも検索条件に追加
        // customerId は ObjectId 型と String 型の両方で検索（DBの保存形式に対応）
        if (matchingCustomerIds.length > 0) {
          const customerIdStrings = matchingCustomerIds.map(id => id?.toString()).filter(Boolean);
          searchConditions.push({
            customerId: {
              $in: [
                ...matchingCustomerIds,  // ObjectId型
                ...customerIdStrings      // String型
              ]
            }
          });
        }

        filter.$or = searchConditions;
      }

      const limit = params.limit || 20;
      const skip = params.skip || 0;
      
      // ソート設定（フィールド名のマッピング）
      const fieldMapping: Record<string, string> = {
        'invoiceDate': 'issueDate',  // フロントエンドはinvoiceDateを送るが、DBではissueDate
        'invoiceNumber': 'invoiceNumber',
        'title': 'title',
        'dueDate': 'dueDate',
        'totalAmount': 'totalAmount',
        'status': 'status',
        'isGeneratedByAI': 'isGeneratedByAI'
      };
      
      const sortBy = fieldMapping[params.sortBy || 'invoiceDate'] || 'issueDate';
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder;
      
      // 二次ソート用のフィールドを追加
      if (sortBy !== 'invoiceNumber') {
        sortObj.invoiceNumber = -1;
      }

      // 請求書を取得
      const invoices = await db.find<Invoice>(this.collectionName, filter, {
        sort: sortObj,
        limit: limit + 1, // hasMoreを判定するため1件多く取得
        skip,
      });

      // 顧客情報を取得してマージ
      const customerIds = [...new Set(invoices.map(inv => inv.customerId?.toString()).filter(Boolean))];
      if (customerIds.length > 0) {
        const customers = await db.find<Customer>(Collections.CUSTOMERS, {
          _id: { $in: customerIds.map(id => new ObjectId(id!)) }
        });

        const customerMap = new Map(
          customers.map(customer => [customer._id!.toString(), customer])
        );

        invoices.forEach(invoice => {
          if (invoice.customerId) {
            invoice.customer = customerMap.get(invoice.customerId.toString());
          }
        });
      }

      // 銀行口座情報を取得してマージ
      const bankAccountIds = [...new Set(invoices.map(inv => inv.bankAccountId?.toString()).filter(Boolean))];
      if (bankAccountIds.length > 0) {
        const bankAccounts = await db.find<BankAccount>(Collections.BANK_ACCOUNTS, {
          _id: { $in: bankAccountIds.map(id => new ObjectId(id!)) }
        });

        const bankAccountMap = new Map(
          bankAccounts.map(account => [account._id!.toString(), account])
        );

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
      const total = await db.count(this.collectionName, filter);

      return {
        invoices,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in searchInvoices:', error);
      throw new Error('請求書の検索に失敗しました');
    }
  }

  /**
   * 請求書を作成
   */
  async createInvoice(invoiceData: Omit<Invoice, '_id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    try {
      // 請求書番号の重複チェック
      const existing = await db.findOne<Invoice>(this.collectionName, {
        invoiceNumber: invoiceData.invoiceNumber
      });

      if (existing) {
        throw new Error(`請求書番号 ${invoiceData.invoiceNumber} は既に使用されています`);
      }

      // 顧客の存在確認
      if (invoiceData.customerId) {
        const customer = await db.findById<Customer>(Collections.CUSTOMERS, invoiceData.customerId);
        if (!customer) {
          throw new Error('指定された顧客が見つかりません');
        }
      }

      // 銀行口座の存在確認
      if (invoiceData.bankAccountId) {
        const bankAccount = await db.findById<BankAccount>(Collections.BANK_ACCOUNTS, invoiceData.bankAccountId);
        if (!bankAccount) {
          throw new Error('指定された銀行口座が見つかりません');
        }
      }

      // 日付をDateオブジェクトに変換
      const invoice: Omit<Invoice, '_id' | 'createdAt' | 'updatedAt'> = {
        ...invoiceData,
        issueDate: new Date(invoiceData.issueDate),
        dueDate: new Date(invoiceData.dueDate),
        paidDate: invoiceData.paidDate ? new Date(invoiceData.paidDate) : undefined,
      };

      // 請求書を作成
      const created = await db.create<Invoice>(this.collectionName, invoice);
      return created;
    } catch (error) {
      logger.error('Error in createInvoice:', error);
      throw error instanceof Error ? error : new Error('請求書の作成に失敗しました');
    }
  }

  /**
   * 請求書を取得
   */
  async getInvoice(id: string): Promise<Invoice | null> {
    try {
      logger.debug('[InvoiceService] getInvoice called with ID:', id);
      logger.debug('[InvoiceService] ID type:', typeof id, 'Length:', id?.length);
      
      const invoice = await db.findById<Invoice>(this.collectionName, id);
      
      if (!invoice) {
        logger.debug('[InvoiceService] No invoice found for ID:', id);
        return null;
      }
      
      logger.debug('[InvoiceService] Invoice found:', {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });

      // 顧客情報を取得
      if (invoice.customerId) {
        invoice.customer = await db.findById<Customer>(Collections.CUSTOMERS, invoice.customerId);
      }

      // 銀行口座情報を取得
      if (invoice.bankAccountId) {
        invoice.bankAccount = await db.findById<BankAccount>(Collections.BANK_ACCOUNTS, invoice.bankAccountId);
      }
      
      // 仕入先見積書情報を取得
      if (invoice.sourceSupplierQuoteId) {
        invoice.sourceSupplierQuote = await db.findById(Collections.SUPPLIER_QUOTES, invoice.sourceSupplierQuoteId);
      }

      return invoice;
    } catch (error) {
      logger.error('Error in getInvoice:', error);
      throw new Error('請求書の取得に失敗しました');
    }
  }

  /**
   * 請求書を更新
   */
  async updateInvoice(id: string, updateData: Partial<Invoice>): Promise<Invoice | null> {
    try {
      logger.debug('[InvoiceService] updateInvoice called with:', {
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
        const customer = await db.findById<Customer>(Collections.CUSTOMERS, dataToUpdate.customerId);
        if (!customer) {
          throw new Error('指定された顧客が見つかりません');
        }
      }

      // 銀行口座の存在確認
      if (dataToUpdate.bankAccountId) {
        const bankAccount = await db.findById<BankAccount>(Collections.BANK_ACCOUNTS, dataToUpdate.bankAccountId);
        if (!bankAccount) {
          throw new Error('指定された銀行口座が見つかりません');
        }
      }

      logger.debug('[InvoiceService] Calling db.update with:', {
        collection: this.collectionName,
        id,
        dataToUpdate: JSON.stringify(dataToUpdate, null, 2)
      });
      
      const updated = await db.update<Invoice>(this.collectionName, id, dataToUpdate);
      
      logger.debug('[InvoiceService] Updated invoice:', updated ? 'Success' : 'Failed');
      
      if (updated) {
        // 顧客情報を取得
        if (updated.customerId) {
          updated.customer = await db.findById<Customer>(Collections.CUSTOMERS, updated.customerId);
        }

        // 銀行口座情報を取得
        if (updated.bankAccountId) {
          updated.bankAccount = await db.findById<BankAccount>(Collections.BANK_ACCOUNTS, updated.bankAccountId);
        }
      }

      return updated;
    } catch (error) {
      logger.error('Error in updateInvoice:', error);
      throw error instanceof Error ? error : new Error('請求書の更新に失敗しました');
    }
  }

  /**
   * 請求書を削除
   */
  async deleteInvoice(id: string): Promise<boolean> {
    try {
      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error('Error in deleteInvoice:', error);
      throw new Error('請求書の削除に失敗しました');
    }
  }

  /**
   * 請求書のステータスを更新
   */
  async updateInvoiceStatus(id: string, status: InvoiceStatus, paidDate?: Date, paidAmount?: number): Promise<Invoice | null> {
    try {
      // 現在の請求書を取得して以前のステータスを確認
      const currentInvoice = await this.getInvoice(id);
      if (!currentInvoice) {
        return null;
      }

      const updateData: Partial<Invoice> = { status };

      // 支払済みにする場合の処理
      if (status === 'paid' && currentInvoice.status !== 'paid') {
        updateData.paidDate = paidDate || new Date();
        if (paidAmount !== undefined) {
          updateData.paidAmount = paidAmount;
        } else {
          // paidAmountが指定されていない場合は、総額を設定
          updateData.paidAmount = currentInvoice.totalAmount;
        }
      }

      // 部分支払済みの場合の処理
      if (status === 'partially_paid' && paidAmount !== undefined) {
        updateData.paidAmount = paidAmount;
      }

      // キャンセルする場合の処理
      if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
      }

      const updatedInvoice = await this.updateInvoice(id, updateData);
      
      // 更新前のステータスを含めて返す（アクティビティログ用）
      if (updatedInvoice) {
        (updatedInvoice as any).previousStatus = currentInvoice.status;
      }
      
      return updatedInvoice;
    } catch (error) {
      logger.error('Error in updateInvoiceStatus:', error);
      throw new Error('請求書ステータスの更新に失敗しました');
    }
  }

  /**
   * 請求書番号を生成
   */
  async generateInvoiceNumber(format?: string): Promise<string> {
    try {
      // 会社情報から請求書番号プレフィックスを取得
      const companyInfoService = new CompanyInfoService();
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
      
      const invoiceCount = await db.count(this.collectionName, {
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
    } catch (error) {
      logger.error('Error in generateInvoiceNumber:', error);
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
  async recordPayment(id: string, paidAmount: number, paymentDate: Date): Promise<Invoice | null> {
    try {
      const invoice = await this.getInvoice(id);
      if (!invoice) {
        return null;
      }

      const updateData: Partial<Invoice> = {
        status: 'paid',
        paidDate: paymentDate,
        paidAmount: paidAmount
      };

      return await this.updateInvoice(id, updateData);
    } catch (error) {
      logger.error('Error in recordPayment:', error);
      throw new Error('支払い記録の更新に失敗しました');
    }
  }

  /**
   * 請求書をキャンセル
   */
  async cancelInvoice(id: string): Promise<Invoice | null> {
    try {
      const updateData: Partial<Invoice> = {
        status: 'cancelled'
      };

      return await this.updateInvoice(id, updateData);
    } catch (error) {
      logger.error('Error in cancelInvoice:', error);
      throw new Error('請求書のキャンセルに失敗しました');
    }
  }

  /**
   * 月次の請求書集計
   */
  async getMonthlyAggregation(year: number, month: number): Promise<any> {
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

      return await db.aggregate(this.collectionName, pipeline);
    } catch (error) {
      logger.error('Error in getMonthlyAggregation:', error);
      throw new Error('月次集計の取得に失敗しました');
    }
  }
}