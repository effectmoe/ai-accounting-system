import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { 
  Receipt, 
  ReceiptStatus, 
  ReceiptItem, 
  CreateReceiptParams,
  ReceiptSearchParams,
  SendReceiptEmailParams
} from '@/types/receipt';
import { Invoice, Customer } from '@/types/collections';
import { CompanyInfoService } from './company-info.service';
import { logger } from '@/lib/logger';

export interface ReceiptSearchResult {
  receipts: Receipt[];
  total: number;
  hasMore: boolean;
}

export class ReceiptService {
  private collectionName = 'receipts'; // 新しいコレクション
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
        description: item.description || item.itemName,
        quantity: item.quantity,
        unit: item.unit || '個',
        unitPrice: item.unitPrice,
        amount: item.amount,
        taxType: item.taxType || 'taxable'
      }));

      // 領収書データを作成
      const receiptData: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'> = {
        receiptNumber,
        invoiceId: invoice._id!.toString(),
        invoiceNumber: invoice.invoiceNumber,
        
        // 顧客情報
        customerId: customer._id!.toString(),
        customerName: `${customer.companyName} 御中`,
        customerAddress: this.formatAddress(customer),
        
        // 発行者情報
        issuerName: companyInfo.companyName,
        issuerAddress: this.formatCompanyAddress(companyInfo),
        issuerPhone: companyInfo.phone,
        issuerEmail: companyInfo.email,
        issuerStamp: companyInfo.sealImage, // 印影画像がある場合
        
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
        subject: invoice.title || `${invoice.invoiceNumber}に対する領収書`,
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
        // REC-0000000007 のような形式から番号を抽出
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
        filter.customerId = params.customerId;
      }

      if (params.invoiceId) {
        filter.invoiceId = params.invoiceId;
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

      const limit = params.limit || 20;
      const skip = params.skip || 0;
      
      const sortBy = params.sortBy || 'issueDate';
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder;

      // 領収書を取得
      const receipts = await db.find<Receipt>(this.collectionName, filter, {
        sort: sortObj,
        limit: limit + 1,
        skip,
      });

      // hasMoreの判定
      const hasMore = receipts.length > limit;
      if (hasMore) {
        receipts.pop();
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
   * 領収書を取得（顧客情報を含む）
   */
  async getReceipt(id: string): Promise<Receipt | null> {
    try {
      const receipt = await db.findById<Receipt>(this.collectionName, id);
      if (!receipt) {
        return null;
      }

      // 顧客情報を取得して含める
      if (receipt.customerId) {
        const customer = await db.findById<Customer>(Collections.CUSTOMERS, receipt.customerId);
        if (customer) {
          // 顧客情報を領収書に追加（見積書と同じ方式）
          (receipt as any).customer = customer;
          // 顧客のメールアドレスも追加
          (receipt as any).customerEmail = customer.email || customer.contacts?.[0]?.email || '';
        }
      }

      // 会社情報スナップショットも含める（見積書と同じ）
      const companyInfo = await this.companyInfoService.getCompanyInfo();
      if (companyInfo) {
        (receipt as any).companySnapshot = {
          companyName: companyInfo.companyName,
          address: this.formatCompanyAddress(companyInfo),
          phone: companyInfo.phone,
          email: companyInfo.email,
          invoiceRegistrationNumber: companyInfo.invoiceRegistrationNumber,
          stampImage: companyInfo.sealImage,
        };
      }

      return receipt;
    } catch (error) {
      logger.error('Error getting receipt:', error);
      throw new Error('領収書の取得に失敗しました');
    }
  }

  /**
   * 領収書を更新
   */
  async updateReceipt(id: string, data: Partial<Receipt>): Promise<Receipt | null> {
    try {
      const updated = await db.update<Receipt>(this.collectionName, id, data);
      if (updated) {
        logger.info(`Receipt updated: ${updated.receiptNumber}`);
      }
      return updated;
    } catch (error) {
      logger.error('Error updating receipt:', error);
      throw new Error('領収書の更新に失敗しました');
    }
  }

  /**
   * 領収書のステータスを更新
   */
  async updateStatus(id: string, status: ReceiptStatus): Promise<Receipt | null> {
    return this.updateReceipt(id, { status });
  }

  /**
   * 領収書を削除
   */
  async deleteReceipt(id: string): Promise<boolean> {
    try {
      const result = await db.delete(this.collectionName, id);
      if (result) {
        logger.info(`Receipt deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting receipt:', error);
      throw new Error('領収書の削除に失敗しました');
    }
  }
}