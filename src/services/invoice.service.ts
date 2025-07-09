import { DatabaseService, Collections, withTransaction } from '@/lib/mongodb-client';
import { 
  Invoice, 
  InvoiceItem, 
  InvoiceStatus, 
  Customer, 
  CustomerSnapshot,
  CompanyInfo,
  CompanySnapshot,
  BankAccount,
  PaymentMethod 
} from '@/types/collections';
import { CustomerService } from './customer.service';
import { CompanyInfoService } from './company-info.service';
import { BankAccountService } from './bank-account.service';

export class InvoiceService {
  private db: DatabaseService;
  private customerService: CustomerService;
  private companyInfoService: CompanyInfoService;
  private bankAccountService: BankAccountService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.customerService = new CustomerService();
    this.companyInfoService = new CompanyInfoService();
    this.bankAccountService = new BankAccountService();
  }

  /**
   * 請求書番号を生成
   */
  async generateInvoiceNumber(prefix: string = 'INV'): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // 今月の請求書数を取得
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0);
    
    const count = await this.db.count(Collections.INVOICES, {
      invoiceDate: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}${month}-${sequence}`;
  }

  /**
   * 請求書を作成
   */
  async createInvoice(invoice: Omit<Invoice, '_id' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'customerSnapshot' | 'companySnapshot'>): Promise<Invoice> {
    // 顧客情報を取得
    const customer = await this.customerService.getCustomerById(invoice.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // 自社情報を取得
    const companyInfo = invoice.companyInfoId 
      ? await this.companyInfoService.getCompanyInfoById(invoice.companyInfoId)
      : await this.companyInfoService.getDefaultCompanyInfo();
    
    if (!companyInfo) {
      throw new Error('Company info not found');
    }

    // 銀行口座情報を取得（必要な場合）
    let bankAccount: BankAccount | null = null;
    if (invoice.paymentMethod === PaymentMethod.BANK_TRANSFER) {
      bankAccount = invoice.bankAccountId
        ? await this.bankAccountService.getBankAccountById(invoice.bankAccountId)
        : await this.bankAccountService.getDefaultBankAccount();
    }

    // 請求書番号を生成
    const invoiceNumber = await this.generateInvoiceNumber();

    // 顧客情報のスナップショットを作成
    const customerSnapshot: CustomerSnapshot = {
      companyName: customer.companyName,
      postalCode: customer.postalCode,
      address: `${customer.prefecture}${customer.city}${customer.address1}${customer.address2 || ''}`,
      phone: customer.phone,
      email: customer.email,
      contactName: customer.contacts.find(c => c.isPrimary)?.name
    };

    // 自社情報のスナップショットを作成
    const companySnapshot: CompanySnapshot = {
      companyName: companyInfo.companyName,
      invoiceRegistrationNumber: companyInfo.invoiceRegistrationNumber,
      postalCode: companyInfo.postalCode,
      address: `${companyInfo.prefecture}${companyInfo.city}${companyInfo.address1}${companyInfo.address2 || ''}`,
      phone: companyInfo.phone,
      email: companyInfo.email,
      logoUrl: companyInfo.logoUrl,
      sealImageUrl: companyInfo.sealImageUrl
    };

    // 銀行口座情報を追加
    if (bankAccount) {
      companySnapshot.bankAccount = {
        bankName: bankAccount.bankName,
        branchName: bankAccount.branchName,
        accountType: this.getAccountTypeLabel(bankAccount.accountType),
        accountNumber: bankAccount.accountNumber,
        accountHolder: bankAccount.accountHolder
      };
    }

    // 金額の再計算（整合性チェック）
    const calculatedAmounts = this.calculateInvoiceAmounts(invoice.items);

    const invoiceData: Omit<Invoice, '_id' | 'createdAt' | 'updatedAt'> = {
      ...invoice,
      invoiceNumber,
      customerSnapshot,
      companySnapshot,
      companyInfoId: companyInfo._id!.toString(),
      subtotal: calculatedAmounts.subtotal,
      taxAmount: calculatedAmounts.taxAmount,
      totalAmount: calculatedAmounts.totalAmount,
      status: invoice.status || InvoiceStatus.DRAFT,
      paidAmount: invoice.paidAmount || 0,
      isGeneratedByAI: invoice.isGeneratedByAI || false
    };

    return await this.db.create<Invoice>(Collections.INVOICES, invoiceData);
  }

  /**
   * 請求書をIDで取得
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    return await this.db.findById<Invoice>(Collections.INVOICES, id);
  }

  /**
   * 請求書を番号で取得
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    return await this.db.findOne<Invoice>(Collections.INVOICES, { invoiceNumber });
  }

  /**
   * 請求書を検索
   */
  async searchInvoices(params: {
    customerId?: string;
    status?: InvoiceStatus | InvoiceStatus[];
    dateFrom?: Date;
    dateTo?: Date;
    isGeneratedByAI?: boolean;
    aiConversationId?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ invoices: Invoice[]; total: number }> {
    const filter: any = {};

    if (params.customerId) {
      filter.customerId = params.customerId;
    }

    if (params.status) {
      if (Array.isArray(params.status)) {
        filter.status = { $in: params.status };
      } else {
        filter.status = params.status;
      }
    }

    if (params.dateFrom || params.dateTo) {
      filter.invoiceDate = {};
      if (params.dateFrom) {
        filter.invoiceDate.$gte = params.dateFrom;
      }
      if (params.dateTo) {
        filter.invoiceDate.$lte = params.dateTo;
      }
    }

    if (params.isGeneratedByAI !== undefined) {
      filter.isGeneratedByAI = params.isGeneratedByAI;
    }

    if (params.aiConversationId) {
      filter.aiConversationId = params.aiConversationId;
    }

    const [invoices, total] = await Promise.all([
      this.db.find<Invoice>(Collections.INVOICES, filter, {
        sort: { invoiceDate: -1 },
        limit: params.limit,
        skip: params.skip
      }),
      this.db.count(Collections.INVOICES, filter)
    ]);

    return { invoices, total };
  }

  /**
   * 請求書を更新
   */
  async updateInvoice(id: string, update: Partial<Invoice>): Promise<Invoice | null> {
    const { _id, createdAt, updatedAt, invoiceNumber, customerSnapshot, companySnapshot, ...updateData } = update;

    // 明細が更新される場合は金額を再計算
    if (updateData.items) {
      const calculatedAmounts = this.calculateInvoiceAmounts(updateData.items);
      updateData.subtotal = calculatedAmounts.subtotal;
      updateData.taxAmount = calculatedAmounts.taxAmount;
      updateData.totalAmount = calculatedAmounts.totalAmount;
    }

    return await this.db.update<Invoice>(Collections.INVOICES, id, updateData);
  }

  /**
   * 請求書のステータスを更新
   */
  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice | null> {
    const update: Partial<Invoice> = { status };

    // 支払済みステータスの場合は支払日も設定
    if (status === InvoiceStatus.PAID) {
      const invoice = await this.getInvoiceById(id);
      if (invoice) {
        update.paidAmount = invoice.totalAmount;
        update.paidDate = new Date();
      }
    }

    return await this.updateInvoice(id, update);
  }

  /**
   * 支払いを記録
   */
  async recordPayment(id: string, amount: number, paymentDate: Date = new Date()): Promise<Invoice | null> {
    const invoice = await this.getInvoiceById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const newPaidAmount = invoice.paidAmount + amount;
    const update: Partial<Invoice> = {
      paidAmount: newPaidAmount
    };

    // 支払い状況に応じてステータスを更新
    if (newPaidAmount >= invoice.totalAmount) {
      update.status = InvoiceStatus.PAID;
      update.paidDate = paymentDate;
      update.paidAmount = invoice.totalAmount; // 過払いを防ぐ
    } else if (newPaidAmount > 0) {
      update.status = InvoiceStatus.PARTIALLY_PAID;
    }

    return await this.updateInvoice(id, update);
  }

  /**
   * 請求書を削除（キャンセル）
   */
  async cancelInvoice(id: string): Promise<Invoice | null> {
    return await this.updateInvoiceStatus(id, InvoiceStatus.CANCELLED);
  }

  /**
   * 請求書を物理削除（通常は使用しない）
   */
  async deleteInvoice(id: string): Promise<boolean> {
    return await this.db.delete(Collections.INVOICES, id);
  }

  /**
   * 請求書の金額を計算
   */
  private calculateInvoiceAmounts(items: InvoiceItem[]): {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  } {
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      subtotal += item.amount;
      taxAmount += item.taxAmount;
    }

    const totalAmount = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(taxAmount),
      totalAmount: Math.round(totalAmount)
    };
  }

  /**
   * 口座種別のラベルを取得
   */
  private getAccountTypeLabel(accountType: string): string {
    const labels: Record<string, string> = {
      checking: '当座預金',
      savings: '普通預金',
      time_deposit: '定期預金',
      other: 'その他'
    };
    return labels[accountType] || accountType;
  }

  /**
   * 期限超過の請求書を更新
   */
  async updateOverdueInvoices(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await this.db.find<Invoice>(Collections.INVOICES, {
      status: { $in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIALLY_PAID] },
      dueDate: { $lt: today }
    });

    let updatedCount = 0;
    for (const invoice of overdueInvoices) {
      await this.updateInvoiceStatus(invoice._id!.toString(), InvoiceStatus.OVERDUE);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * 請求書のPDFを生成（実装は別途必要）
   */
  async generateInvoicePDF(id: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // TODO: PDF生成ロジックを実装
    // 現時点ではプレースホルダー
    throw new Error('PDF generation not implemented yet');
  }

  /**
   * AI会話から請求書を作成するためのヘルパーメソッド
   */
  async createInvoiceFromAIConversation(params: {
    customerId: string;
    items: InvoiceItem[];
    dueDate: Date;
    aiConversationId: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
  }): Promise<Invoice> {
    const invoiceData: Omit<Invoice, '_id' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'customerSnapshot' | 'companySnapshot'> = {
      invoiceDate: new Date(),
      dueDate: params.dueDate,
      customerId: params.customerId,
      items: params.items,
      subtotal: 0, // 自動計算される
      taxAmount: 0, // 自動計算される
      totalAmount: 0, // 自動計算される
      paymentMethod: params.paymentMethod || PaymentMethod.BANK_TRANSFER,
      status: InvoiceStatus.DRAFT,
      paidAmount: 0,
      isGeneratedByAI: true,
      aiConversationId: params.aiConversationId,
      notes: params.notes,
      companyInfoId: '' // デフォルトが使用される
    };

    return await this.createInvoice(invoiceData);
  }
}