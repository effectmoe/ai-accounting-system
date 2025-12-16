import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { Quote, QuoteStatus, QuoteItem, Customer, BankAccount, Invoice } from '@/types/collections';
import { CompanyInfoService } from './company-info.service';
import { InvoiceService } from './invoice.service';

import { logger } from '@/lib/logger';
export interface QuoteSearchParams {
  customerId?: string;
  status?: QuoteStatus;
  dateFrom?: Date;
  dateTo?: Date;
  isGeneratedByAI?: boolean;
  search?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface QuoteSearchResult {
  quotes: Quote[];
  total: number;
  hasMore: boolean;
}

export class QuoteService {
  private collectionName = Collections.QUOTES;

  /**
   * 見積書を検索
   */
  async searchQuotes(params: QuoteSearchParams): Promise<QuoteSearchResult> {
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

      // 検索クエリ（見積書番号、タイトル、顧客名で検索）
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

        // 見積書のフィールドまたは顧客IDで検索
        const searchConditions: any[] = [
          { quoteNumber: searchRegex },
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
        'quoteDate': 'issueDate',  // フロントエンドはquoteDateを送るが、DBではissueDate
        'quoteNumber': 'quoteNumber',
        'title': 'title',
        'expiryDate': 'expiryDate',
        'totalAmount': 'totalAmount',
        'status': 'status',
        'isGeneratedByAI': 'isGeneratedByAI'
      };
      
      const sortBy = fieldMapping[params.sortBy || 'quoteDate'] || 'issueDate';
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder;
      
      // 二次ソート用のフィールドを追加
      if (sortBy !== 'quoteNumber') {
        sortObj.quoteNumber = -1;
      }

      // 見積書を取得
      const quotes = await db.find<Quote>(this.collectionName, filter, {
        sort: sortObj,
        limit: limit + 1, // hasMoreを判定するため1件多く取得
        skip,
      });

      // 顧客情報を取得してマージ
      const customerIds = [...new Set(quotes.map(quote => quote.customerId?.toString()).filter(Boolean))];
      if (customerIds.length > 0) {
        const customers = await db.find<Customer>(Collections.CUSTOMERS, {
          _id: { $in: customerIds.map(id => new ObjectId(id!)) }
        });

        const customerMap = new Map(
          customers.map(customer => [customer._id!.toString(), customer])
        );

        quotes.forEach(quote => {
          if (quote.customerId) {
            quote.customer = customerMap.get(quote.customerId.toString());
          }
          // ocrFilesフィールドが未定義の場合は空配列で初期化
          if (!quote.ocrFiles) {
            quote.ocrFiles = [];
          }
        });
      }

      // 銀行口座情報を取得してマージ
      const bankAccountIds = [...new Set(quotes.map(quote => quote.bankAccountId?.toString()).filter(Boolean))];
      if (bankAccountIds.length > 0) {
        const bankAccounts = await db.find<BankAccount>(Collections.BANK_ACCOUNTS, {
          _id: { $in: bankAccountIds.map(id => new ObjectId(id!)) }
        });

        const bankAccountMap = new Map(
          bankAccounts.map(account => [account._id!.toString(), account])
        );

        quotes.forEach(quote => {
          if (quote.bankAccountId) {
            quote.bankAccount = bankAccountMap.get(quote.bankAccountId.toString());
          }
        });
      }

      // hasMoreの判定
      const hasMore = quotes.length > limit;
      if (hasMore) {
        quotes.pop(); // 余分な1件を削除
      }

      // 総数を取得
      const total = await db.count(this.collectionName, filter);

      return {
        quotes,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in searchQuotes:', error);
      throw new Error('見積書の検索に失敗しました');
    }
  }

  /**
   * 見積書を作成
   */
  async createQuote(quoteData: Omit<Quote, '_id' | 'createdAt' | 'updatedAt'>): Promise<Quote> {
    try {
      // 見積書番号の重複チェック
      const existing = await db.findOne<Quote>(this.collectionName, {
        quoteNumber: quoteData.quoteNumber
      });

      if (existing) {
        throw new Error(`見積書番号 ${quoteData.quoteNumber} は既に使用されています`);
      }

      // 顧客の存在確認
      if (quoteData.customerId) {
        const customer = await db.findById<Customer>(Collections.CUSTOMERS, quoteData.customerId);
        if (!customer) {
          throw new Error('指定された顧客が見つかりません');
        }
      }

      // 銀行口座の存在確認
      if (quoteData.bankAccountId) {
        const bankAccount = await db.findById<BankAccount>(Collections.BANK_ACCOUNTS, quoteData.bankAccountId);
        if (!bankAccount) {
          throw new Error('指定された銀行口座が見つかりません');
        }
      }

      // 会社情報のスナップショットを作成
      const companyInfoService = new CompanyInfoService();
      const companyInfo = await companyInfoService.getCompanyInfo();
      let companySnapshot;
      
      if (companyInfo) {
        companySnapshot = {
          companyName: companyInfo.companyName,
          address: companyInfo.address1 || `${companyInfo.prefecture || ''} ${companyInfo.city || ''} ${companyInfo.address1 || ''}`.trim() || '',
          phone: companyInfo.phone || undefined,
          email: companyInfo.email || undefined,
          invoiceRegistrationNumber: companyInfo.registrationNumber || undefined,
          stampImage: companyInfo.stampImage || undefined,
        };
      }

      // 日付をDateオブジェクトに変換
      const quote: Omit<Quote, '_id' | 'createdAt' | 'updatedAt'> = {
        ...quoteData,
        issueDate: new Date(quoteData.issueDate),
        validityDate: new Date(quoteData.validityDate),
        acceptedDate: quoteData.acceptedDate ? new Date(quoteData.acceptedDate) : undefined,
        rejectedDate: quoteData.rejectedDate ? new Date(quoteData.rejectedDate) : undefined,
        expiredDate: quoteData.expiredDate ? new Date(quoteData.expiredDate) : undefined,
        convertedToInvoiceDate: quoteData.convertedToInvoiceDate ? new Date(quoteData.convertedToInvoiceDate) : undefined,
        companySnapshot, // 会社情報のスナップショットを追加
      };

      // 見積書を作成
      const created = await db.create<Quote>(this.collectionName, quote);
      return created;
    } catch (error) {
      logger.error('Error in createQuote:', error);
      throw error instanceof Error ? error : new Error('見積書の作成に失敗しました');
    }
  }

  /**
   * 見積書を取得
   */
  async getQuote(id: string): Promise<Quote | null> {
    try {
      logger.debug('[QuoteService] getQuote called with ID:', id);
      
      const quote = await db.findById<Quote>(this.collectionName, id);
      
      if (!quote) {
        logger.debug('[QuoteService] No quote found for ID:', id);
        return null;
      }
      
      logger.debug('[QuoteService] Quote found:', {
        _id: quote._id,
        quoteNumber: quote.quoteNumber
      });

      // 顧客情報を取得
      if (quote.customerId) {
        quote.customer = await db.findById<Customer>(Collections.CUSTOMERS, quote.customerId);
      }

      // 銀行口座情報を取得
      if (quote.bankAccountId) {
        quote.bankAccount = await db.findById<BankAccount>(Collections.BANK_ACCOUNTS, quote.bankAccountId);
      }

      // ocrFilesフィールドが未定義の場合は空配列で初期化
      if (!quote.ocrFiles) {
        quote.ocrFiles = [];
      }
      
      // 仕入先見積書情報を取得
      if (quote.sourceSupplierQuoteId) {
        quote.sourceSupplierQuote = await db.findById(Collections.SUPPLIER_QUOTES, quote.sourceSupplierQuoteId);
      }

      return quote;
    } catch (error) {
      logger.error('Error in getQuote:', error);
      throw new Error('見積書の取得に失敗しました');
    }
  }

  /**
   * 見積書を更新
   */
  async updateQuote(id: string, updateData: Partial<Quote>): Promise<Quote | null> {
    try {
      logger.debug('[QuoteService] updateQuote called with:', {
        id,
        updateData: JSON.stringify(updateData, null, 2)
      });
      
      // _idフィールドは更新対象から除外
      const { _id, ...dataToUpdate } = updateData;

      // 日付フィールドをDateオブジェクトに変換
      if (dataToUpdate.issueDate) {
        dataToUpdate.issueDate = new Date(dataToUpdate.issueDate);
      }
      if (dataToUpdate.validityDate) {
        dataToUpdate.validityDate = new Date(dataToUpdate.validityDate);
      }
      if (dataToUpdate.acceptedDate) {
        dataToUpdate.acceptedDate = new Date(dataToUpdate.acceptedDate);
      }
      if (dataToUpdate.rejectedDate) {
        dataToUpdate.rejectedDate = new Date(dataToUpdate.rejectedDate);
      }
      if (dataToUpdate.expiredDate) {
        dataToUpdate.expiredDate = new Date(dataToUpdate.expiredDate);
      }
      if (dataToUpdate.convertedToInvoiceDate) {
        dataToUpdate.convertedToInvoiceDate = new Date(dataToUpdate.convertedToInvoiceDate);
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

      const updated = await db.update<Quote>(this.collectionName, id, dataToUpdate);
      
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
      logger.error('Error in updateQuote:', error);
      throw error instanceof Error ? error : new Error('見積書の更新に失敗しました');
    }
  }

  /**
   * 見積書を削除
   */
  async deleteQuote(id: string): Promise<boolean> {
    try {
      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error('Error in deleteQuote:', error);
      throw new Error('見積書の削除に失敗しました');
    }
  }

  /**
   * 見積書のステータスを更新
   */
  async updateQuoteStatus(id: string, status: QuoteStatus, statusDate?: Date): Promise<Quote | null> {
    try {
      const updateData: Partial<Quote> = { status };

      if (status === 'accepted' && statusDate) {
        updateData.acceptedDate = statusDate;
      } else if (status === 'rejected' && statusDate) {
        updateData.rejectedDate = statusDate;
      } else if (status === 'expired' && statusDate) {
        updateData.expiredDate = statusDate;
      }

      return await this.updateQuote(id, updateData);
    } catch (error) {
      logger.error('Error in updateQuoteStatus:', error);
      throw new Error('見積書ステータスの更新に失敗しました');
    }
  }

  /**
   * 見積書番号を生成
   */
  async generateQuoteNumber(format?: string): Promise<string> {
    try {
      // 会社情報から見積書番号プレフィックスを取得
      const companyInfoService = new CompanyInfoService();
      const companyInfo = await companyInfoService.getCompanyInfo();
      
      // プレフィックスを取得（設定がない場合はQUO-をデフォルト）
      const prefix = companyInfo?.quotePrefix || 'QUO-';
      
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      
      // 今日の見積書数を取得してシーケンス番号を生成
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const quoteCount = await db.count(this.collectionName, {
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });
      
      const seq = (quoteCount + 1).toString().padStart(3, '0');
      
      // プレフィックスを使用してフォーマット
      const quoteFormat = format || `${prefix}{YYYY}{MM}{DD}-{SEQ}`;
      
      // フォーマットに従って見積書番号を生成
      const quoteNumber = quoteFormat
        .replace('{YYYY}', year)
        .replace('{YY}', year.slice(-2))
        .replace('{MM}', month)
        .replace('{DD}', day)
        .replace('{SEQ}', seq);
      
      return quoteNumber;
    } catch (error) {
      logger.error('Error in generateQuoteNumber:', error);
      // エラーの場合はタイムスタンプベースの番号を生成
      const timestamp = new Date().getTime();
      return `QUO-${timestamp}`;
    }
  }

  /**
   * 見積書を請求書に変換
   */
  async convertToInvoice(quoteId: string, invoiceData?: Partial<Invoice>): Promise<Invoice> {
    try {
      // 見積書を取得
      const quote = await this.getQuote(quoteId);
      if (!quote) {
        throw new Error('見積書が見つかりません');
      }

      // どのステータスの見積書でも請求書に変換可能にする
      if (quote.status === 'cancelled') {
        throw new Error('キャンセルされた見積書は請求書に変換できません');
      }

      if (quote.convertedToInvoiceId) {
        throw new Error('この見積書は既に請求書に変換されています');
      }

      // InvoiceServiceを使用して請求書を作成
      const invoiceService = new InvoiceService();
      
      // 見積書データを請求書データに変換
      const defaultInvoiceData: Omit<Invoice, '_id' | 'createdAt' | 'updatedAt'> = {
        invoiceNumber: await invoiceService.generateInvoiceNumber(),
        title: quote.title, // 見積書のタイトルを転記
        customerId: quote.customerId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + (quote.customer?.paymentTerms || 30) * 24 * 60 * 60 * 1000), // デフォルト30日後
        items: quote.items.map(item => ({
          itemName: item.itemName,
          description: item.description,
          itemType: item.itemType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          notes: item.notes,
          discountReason: item.discountReason,
        })),
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        taxRate: quote.taxRate,
        totalAmount: quote.totalAmount,
        paymentMethod: quote.paymentMethod,
        bankAccountId: quote.bankAccountId,
        status: 'draft',
        notes: quote.notes,
        internalNotes: `見積書 ${quote.quoteNumber} より変換`,
        isGeneratedByAI: quote.isGeneratedByAI,
        aiGenerationMetadata: quote.aiGenerationMetadata,
        aiConversationId: quote.aiConversationId,
      };

      // カスタムデータがある場合はマージ
      const finalInvoiceData = { ...defaultInvoiceData, ...invoiceData };

      // 請求書を作成
      const invoice = await invoiceService.createInvoice(finalInvoiceData);

      // 見積書のステータスを更新
      await this.updateQuote(quoteId, {
        status: 'converted',
        convertedToInvoiceId: invoice._id!,
        convertedToInvoiceDate: new Date(),
      });

      return invoice;
    } catch (error) {
      logger.error('Error in convertToInvoice:', error);
      throw error instanceof Error ? error : new Error('見積書から請求書への変換に失敗しました');
    }
  }

  /**
   * 請求書変換を取り消し
   */
  async undoConvertToInvoice(quoteId: string): Promise<Quote> {
    try {
      // 見積書を取得
      const quote = await this.getQuote(quoteId);
      if (!quote) {
        throw new Error('見積書が見つかりません');
      }

      if (quote.status !== 'converted') {
        throw new Error('この見積書は請求書に変換されていません');
      }

      if (!quote.convertedToInvoiceId) {
        throw new Error('変換された請求書IDが見つかりません');
      }

      // 請求書の削除確認（オプション - 請求書を残す場合はコメントアウト）
      const invoiceService = new InvoiceService();
      try {
        // 請求書を削除
        await invoiceService.deleteInvoice(quote.convertedToInvoiceId.toString());
        logger.debug('Associated invoice deleted:', { invoiceId: quote.convertedToInvoiceId });
      } catch (invoiceError) {
        logger.warn('Could not delete associated invoice:', {
          invoiceId: quote.convertedToInvoiceId,
          error: invoiceError
        });
        // 請求書削除に失敗しても見積書の状態は戻す
      }

      // 見積書のステータスを元に戻す
      const updatedQuote = await this.updateQuote(quoteId, {
        status: 'accepted', // 承認済みに戻す
        convertedToInvoiceId: undefined,
        convertedToInvoiceDate: undefined,
      });

      if (!updatedQuote) {
        throw new Error('見積書の更新に失敗しました');
      }

      logger.debug('Quote conversion undone:', {
        quoteId,
        quoteNumber: updatedQuote.quoteNumber
      });

      return updatedQuote;
    } catch (error) {
      logger.error('Error in undoConvertToInvoice:', error);
      throw error instanceof Error ? error : new Error('請求書変換の取り消しに失敗しました');
    }
  }

  /**
   * 月次の見積書集計
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