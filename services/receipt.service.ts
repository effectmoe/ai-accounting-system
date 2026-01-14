import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import {
  Receipt,
  ReceiptStatus,
  ReceiptItem,
  CreateReceiptParams,
  ReceiptSearchParams,
  SendReceiptEmailParams,
  ReceiptSearchResult
} from '@/types/receipt';
import { Invoice, Customer } from '@/types/collections';
import { CompanyInfoService } from './company-info.service';
import { logger } from '@/lib/logger';

export class ReceiptService {
  private collectionName = Collections.RECEIPTS;
  private companyInfoService = new CompanyInfoService();

  /**
   * 請求書から領収書を生成
   */
  async createReceiptFromInvoice(params: CreateReceiptParams): Promise<Receipt> {
    try {
      // 請求書を取得
      const invoice = await db.findById<Invoice>(Collections.INVOICES, params.invoiceId);
      if (!invoice) {
        throw new Error('指定された請求書が見つかりません');
      }

      // 請求書が支払済みでない場合は警告
      if (invoice.status !== 'paid' && invoice.status !== 'partially_paid') {
        logger.warn(`Invoice ${invoice.invoiceNumber} is not paid yet. Creating receipt anyway.`);
      }

      // 顧客情報を取得
      const customer = await db.findById<Customer>(Collections.CUSTOMERS, invoice.customerId);
      if (!customer) {
        throw new Error('顧客情報が見つかりません');
      }

      // 会社情報を取得
      const companyInfo = await this.companyInfoService.getCompanyInfo();
      if (!companyInfo) {
        throw new Error('会社情報が設定されていません');
      }

      // 領収書番号を生成
      const receiptNumber = await this.generateReceiptNumber();

      // 領収書の明細を請求書から作成
      const receiptItems: ReceiptItem[] = invoice.items.map(item => ({
        itemName: item.itemName,
        description: item.description || item.itemName,
        quantity: item.quantity,
        unit: item.unit || '個',
        unitPrice: item.unitPrice,
        amount: item.amount,
        taxType: 'taxable' as const
      }));

      // 領収書データを作成
      const receiptData: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'> = {
        receiptNumber,
        invoiceId: invoice._id!,
        invoiceNumber: invoice.invoiceNumber,

        // 顧客情報
        customerId: customer._id!,
        customerName: `${customer.companyName} 御中`,
        customerAddress: this.formatAddress(customer),

        // 発行者情報
        issuerName: companyInfo.companyName,
        issuerAddress: this.formatCompanyAddress(companyInfo),
        issuerPhone: companyInfo.phone,
        issuerEmail: companyInfo.email,
        issuerRegistrationNumber: companyInfo.registrationNumber,
        issuerStamp: companyInfo.stampImage,

        // 金額情報
        subtotal: invoice.subtotal || 0,
        taxAmount: invoice.taxAmount || 0,
        totalAmount: invoice.totalAmount || 0,
        taxRate: invoice.taxRate || 0.1,

        // 内訳
        items: receiptItems,

        // 日付情報
        issueDate: params.issueDate ? new Date(params.issueDate) : new Date(),
        paidDate: invoice.paidDate,

        // その他
        title: invoice.title,
        subject: params.subject || `${invoice.invoiceNumber}の代金として`,
        notes: params.notes || invoice.notes,
        status: 'draft' as ReceiptStatus
      };

      // 領収書を保存
      const receipt = await db.create<Receipt>(this.collectionName, receiptData);

      logger.info(`Receipt created: ${receiptNumber} for invoice ${invoice.invoiceNumber}`);
      return receipt;
    } catch (error) {
      logger.error('Error creating receipt from invoice:', error);
      throw error instanceof Error ? error : new Error('領収書の作成に失敗しました');
    }
  }

  /**
   * 領収書番号を生成
   */
  private async generateReceiptNumber(): Promise<string> {
    try {
      // 最新の領収書番号を取得
      const lastReceipt = await db.findOne<Receipt>(this.collectionName, {}, {
        sort: { receiptNumber: -1 }
      });

      let nextNumber = 1;
      if (lastReceipt && lastReceipt.receiptNumber) {
        // REC-0000000001 のような形式から番号を抽出
        const match = lastReceipt.receiptNumber.match(/REC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // 10桁のゼロパディング
      const paddedNumber = nextNumber.toString().padStart(10, '0');
      return `REC-${paddedNumber}`;
    } catch (error) {
      logger.error('Error generating receipt number:', error);
      // エラーの場合はタイムスタンプベースの番号を生成
      return `REC-${Date.now()}`;
    }
  }

  /**
   * 住所をフォーマット
   */
  private formatAddress(customer: Customer): string {
    const parts = [];
    if (customer.postalCode) parts.push(`〒${customer.postalCode}`);
    if (customer.prefecture) parts.push(customer.prefecture);
    if (customer.city) parts.push(customer.city);
    if (customer.address1) parts.push(customer.address1);
    if (customer.address2) parts.push(customer.address2);
    return parts.join(' ');
  }

  /**
   * 会社住所をフォーマット
   */
  private formatCompanyAddress(companyInfo: any): string {
    const parts = [];
    if (companyInfo.postalCode) parts.push(`〒${companyInfo.postalCode}`);
    if (companyInfo.prefecture) parts.push(companyInfo.prefecture);
    if (companyInfo.city) parts.push(companyInfo.city);
    if (companyInfo.address1) parts.push(companyInfo.address1);
    if (companyInfo.address2) parts.push(companyInfo.address2);
    return parts.join(' ');
  }

  /**
   * 領収書を検索
   */
  async searchReceipts(params: ReceiptSearchParams): Promise<ReceiptSearchResult> {
    try {
      const filter: any = {};

      if (params.customerId) {
        filter.customerId = new ObjectId(params.customerId);
      }

      if (params.invoiceId) {
        filter.invoiceId = new ObjectId(params.invoiceId);
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

      // スキャン取込フィルタ
      if (params.scannedFromPdf !== undefined) {
        if (params.scannedFromPdf) {
          filter.scannedFromPdf = true;
        } else {
          // 手動作成の場合、scannedFromPdfがfalseまたは未設定のものを取得
          filter.$or = [
            { scannedFromPdf: false },
            { scannedFromPdf: { $exists: false } },
          ];
        }
      }

      // 勘定科目フィルタ
      if (params.accountCategory) {
        filter.accountCategory = params.accountCategory;
      }

      // 金額範囲フィルタ
      if (params.amountMin !== undefined || params.amountMax !== undefined) {
        filter.totalAmount = {};
        if (params.amountMin !== undefined) {
          filter.totalAmount.$gte = params.amountMin;
        }
        if (params.amountMax !== undefined) {
          filter.totalAmount.$lte = params.amountMax;
        }
      }

      // 検索クエリ
      if (params.search) {
        const searchRegex = { $regex: params.search, $options: 'i' };
        const searchConditions = [
          { receiptNumber: searchRegex },
          { customerName: searchRegex },
          { issuerName: searchRegex },
          { invoiceNumber: searchRegex }, // 請求書番号でも検索可能に
          { subject: searchRegex },
        ];
        if (filter.$or) {
          // 既存の$orがある場合は$andで結合
          filter.$and = [
            { $or: filter.$or },
            { $or: searchConditions },
          ];
          delete filter.$or;
        } else {
          filter.$or = searchConditions;
        }
      }

      const limit = params.limit || 20;
      const skip = params.skip || 0;

      // ソート設定（processedAtはscanMetadata.processedAtにマッピング）
      const sortFieldMapping: Record<string, string> = {
        processedAt: 'scanMetadata.processedAt',
      };
      const sortByParam = params.sortBy || 'issueDate';
      const sortBy = sortFieldMapping[sortByParam] || sortByParam;
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder;

      // 領収書を取得
      const receipts = await db.find<Receipt>(this.collectionName, filter, {
        sort: sortObj,
        limit: limit + 1, // hasMoreを判定するため1件多く取得
        skip,
      });

      // 顧客情報を取得してマージ（スキャン取込の場合はcustomerIdがない）
      const customerIds = [...new Set(receipts.map(receipt => receipt.customerId?.toString()).filter(Boolean))] as string[];
      if (customerIds.length > 0) {
        const customers = await db.find<Customer>(Collections.CUSTOMERS, {
          _id: { $in: customerIds.map(id => new ObjectId(id)) }
        });

        const customerMap = new Map(
          customers.map(customer => [customer._id!.toString(), customer])
        );

        receipts.forEach(receipt => {
          if (receipt.customerId) {
            const customer = customerMap.get(receipt.customerId.toString());
            if (customer) {
              // 顧客情報を領収書に添付（型定義には含まれないが実行時に利用）
              (receipt as any).customer = customer;
            }
          }
        });
      }

      // hasMoreの判定
      const hasMore = receipts.length > limit;
      if (hasMore) {
        receipts.pop(); // 余分な1件を削除
      }

      // 総数を取得
      const total = await db.count(this.collectionName, filter);

      return {
        receipts,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in searchReceipts:', error);
      throw new Error('領収書の検索に失敗しました');
    }
  }

  /**
   * 領収書を取得
   */
  async getReceipt(id: string): Promise<Receipt | null> {
    try {
      const receipt = await db.findById<Receipt>(this.collectionName, id);

      if (!receipt) {
        return null;
      }

      // 顧客情報を取得
      if (receipt.customerId) {
        const customer = await db.findById<Customer>(Collections.CUSTOMERS, receipt.customerId);
        if (customer) {
          (receipt as any).customer = customer;
        }
      }

      // 請求書情報を取得
      if (receipt.invoiceId) {
        const invoice = await db.findById<Invoice>(Collections.INVOICES, receipt.invoiceId);
        if (invoice) {
          (receipt as any).invoice = invoice;
        }
      }

      return receipt;
    } catch (error) {
      logger.error('Error in getReceipt:', error);
      throw new Error('領収書の取得に失敗しました');
    }
  }

  /**
   * 領収書を更新
   */
  async updateReceipt(id: string, updateData: Partial<Receipt>): Promise<Receipt | null> {
    try {
      // _idフィールドは更新対象から除外
      const { _id, ...dataToUpdate } = updateData;

      // 日付フィールドをDateオブジェクトに変換
      if (dataToUpdate.issueDate) {
        dataToUpdate.issueDate = new Date(dataToUpdate.issueDate);
      }
      if (dataToUpdate.paidDate) {
        dataToUpdate.paidDate = new Date(dataToUpdate.paidDate);
      }

      const updated = await db.update<Receipt>(this.collectionName, id, dataToUpdate);

      if (updated) {
        // 顧客情報を取得
        if (updated.customerId) {
          const customer = await db.findById<Customer>(Collections.CUSTOMERS, updated.customerId);
          if (customer) {
            (updated as any).customer = customer;
          }
        }
      }

      return updated;
    } catch (error) {
      logger.error('Error in updateReceipt:', error);
      throw error instanceof Error ? error : new Error('領収書の更新に失敗しました');
    }
  }

  /**
   * 領収書を削除
   */
  async deleteReceipt(id: string): Promise<boolean> {
    try {
      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error('Error in deleteReceipt:', error);
      throw new Error('領収書の削除に失敗しました');
    }
  }

  /**
   * 領収書のステータスを更新
   */
  async updateReceiptStatus(id: string, status: ReceiptStatus): Promise<Receipt | null> {
    try {
      const updateData: Partial<Receipt> = { status };

      if (status === 'sent') {
        updateData.emailSentAt = new Date();
      }

      return await this.updateReceipt(id, updateData);
    } catch (error) {
      logger.error('Error in updateReceiptStatus:', error);
      throw new Error('領収書ステータスの更新に失敗しました');
    }
  }

  /**
   * 領収書を作成（新規作成用）
   */
  async createReceipt(receiptData: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'>): Promise<Receipt> {
    try {
      // 領収書番号の重複チェック
      const existing = await db.findOne<Receipt>(this.collectionName, {
        receiptNumber: receiptData.receiptNumber
      });

      if (existing) {
        throw new Error(`領収書番号 ${receiptData.receiptNumber} は既に使用されています`);
      }

      // 顧客の存在確認
      if (receiptData.customerId) {
        const customer = await db.findById<Customer>(Collections.CUSTOMERS, receiptData.customerId);
        if (!customer) {
          throw new Error('指定された顧客が見つかりません');
        }
      }

      // 日付をDateオブジェクトに変換
      const receipt: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'> = {
        ...receiptData,
        issueDate: new Date(receiptData.issueDate),
        paidDate: receiptData.paidDate ? new Date(receiptData.paidDate) : undefined,
      };

      // 領収書を作成
      const created = await db.create<Receipt>(this.collectionName, receipt);
      return created;
    } catch (error) {
      logger.error('Error in createReceipt:', error);
      throw error instanceof Error ? error : new Error('領収書の作成に失敗しました');
    }
  }
}