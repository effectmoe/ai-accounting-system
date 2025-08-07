import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { PaymentRecord, Invoice, InvoiceStatus } from '@/types/collections';
import { InvoiceService } from './invoice.service';
import { logger } from '@/lib/logger';

export interface PaymentRecordSearchParams {
  invoiceId?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  skip?: number;
}

export interface PaymentRecordSearchResult {
  paymentRecords: PaymentRecord[];
  total: number;
  hasMore: boolean;
}

export class PaymentRecordService {
  private collectionName = Collections.PAYMENT_RECORDS;
  private invoiceService = new InvoiceService();

  /**
   * 入金記録を検索
   */
  async searchPaymentRecords(params: PaymentRecordSearchParams): Promise<PaymentRecordSearchResult> {
    try {
      const filter: any = {};

      if (params.invoiceId) {
        filter.invoiceId = new ObjectId(params.invoiceId);
      }

      if (params.status) {
        filter.status = params.status;
      }

      if (params.dateFrom || params.dateTo) {
        filter.paymentDate = {};
        if (params.dateFrom) {
          filter.paymentDate.$gte = params.dateFrom;
        }
        if (params.dateTo) {
          filter.paymentDate.$lte = params.dateTo;
        }
      }

      const limit = params.limit || 20;
      const skip = params.skip || 0;

      // 入金記録を取得
      const paymentRecords = await db.find<PaymentRecord>(this.collectionName, filter, {
        sort: { paymentDate: -1, paymentNumber: -1 },
        limit: limit + 1,
        skip,
      });

      // 請求書情報を取得してマージ
      const invoiceIds = [...new Set(paymentRecords.map(pr => pr.invoiceId?.toString()).filter(Boolean))];
      if (invoiceIds.length > 0) {
        const invoices = await db.find<Invoice>(Collections.INVOICES, {
          _id: { $in: invoiceIds.map(id => new ObjectId(id!)) }
        });

        const invoiceMap = new Map(
          invoices.map(invoice => [invoice._id!.toString(), invoice])
        );

        paymentRecords.forEach(paymentRecord => {
          if (paymentRecord.invoiceId) {
            paymentRecord.invoice = invoiceMap.get(paymentRecord.invoiceId.toString());
          }
        });
      }

      // hasMoreの判定
      const hasMore = paymentRecords.length > limit;
      if (hasMore) {
        paymentRecords.pop();
      }

      // 総数を取得
      const total = await db.count(this.collectionName, filter);

      return {
        paymentRecords,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in searchPaymentRecords:', error);
      throw new Error('入金記録の検索に失敗しました');
    }
  }

  /**
   * 入金記録を作成
   */
  async createPaymentRecord(paymentData: Omit<PaymentRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<PaymentRecord> {
    try {
      // 請求書の存在確認
      const invoice = await this.invoiceService.getInvoice(paymentData.invoiceId.toString());
      if (!invoice) {
        throw new Error('指定された請求書が見つかりません');
      }

      // 入金番号の生成
      const paymentNumber = await this.generatePaymentNumber();

      // 入金記録を作成
      const paymentRecord: Omit<PaymentRecord, '_id' | 'createdAt' | 'updatedAt'> = {
        ...paymentData,
        paymentNumber,
        paymentDate: new Date(paymentData.paymentDate),
        status: paymentData.status || 'pending',
      };

      const created = await db.create<PaymentRecord>(this.collectionName, paymentRecord);

      // 自動で請求書のステータスを更新（確認済みの場合のみ）
      if (created.status === 'confirmed') {
        await this.updateInvoicePaymentStatus(invoice, created);
      }

      return created;
    } catch (error) {
      logger.error('Error in createPaymentRecord:', error);
      throw error instanceof Error ? error : new Error('入金記録の作成に失敗しました');
    }
  }

  /**
   * 入金記録を取得
   */
  async getPaymentRecord(id: string): Promise<PaymentRecord | null> {
    try {
      const paymentRecord = await db.findById<PaymentRecord>(this.collectionName, id);
      
      if (!paymentRecord) {
        return null;
      }

      // 請求書情報を取得
      if (paymentRecord.invoiceId) {
        paymentRecord.invoice = await db.findById<Invoice>(Collections.INVOICES, paymentRecord.invoiceId);
      }

      return paymentRecord;
    } catch (error) {
      logger.error('Error in getPaymentRecord:', error);
      throw new Error('入金記録の取得に失敗しました');
    }
  }

  /**
   * 入金記録を更新
   */
  async updatePaymentRecord(id: string, updateData: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
    try {
      const currentRecord = await this.getPaymentRecord(id);
      if (!currentRecord) {
        return null;
      }

      // _idフィールドは更新対象から除外
      const { _id, ...dataToUpdate } = updateData;

      // 日付フィールドをDateオブジェクトに変換
      if (dataToUpdate.paymentDate) {
        dataToUpdate.paymentDate = new Date(dataToUpdate.paymentDate);
      }
      if (dataToUpdate.confirmedAt) {
        dataToUpdate.confirmedAt = new Date(dataToUpdate.confirmedAt);
      }
      if (dataToUpdate.cancelledAt) {
        dataToUpdate.cancelledAt = new Date(dataToUpdate.cancelledAt);
      }

      const updated = await db.update<PaymentRecord>(this.collectionName, id, dataToUpdate);

      // ステータスが変更された場合、請求書のステータスも更新
      if (updated && updateData.status && updateData.status !== currentRecord.status) {
        const invoice = await this.invoiceService.getInvoice(updated.invoiceId.toString());
        if (invoice) {
          if (updateData.status === 'confirmed') {
            await this.updateInvoicePaymentStatus(invoice, updated);
          } else if (updateData.status === 'cancelled' && currentRecord.status === 'confirmed') {
            // 確認済みから取り消された場合は請求書のステータスを再計算
            await this.recalculateInvoicePaymentStatus(invoice._id!.toString());
          }
        }
      }

      if (updated && updated.invoiceId) {
        updated.invoice = await db.findById<Invoice>(Collections.INVOICES, updated.invoiceId);
      }

      return updated;
    } catch (error) {
      logger.error('Error in updatePaymentRecord:', error);
      throw error instanceof Error ? error : new Error('入金記録の更新に失敗しました');
    }
  }

  /**
   * 入金記録を削除
   */
  async deletePaymentRecord(id: string): Promise<boolean> {
    try {
      const paymentRecord = await this.getPaymentRecord(id);
      if (!paymentRecord) {
        return false;
      }

      const deleted = await db.delete(this.collectionName, id);

      // 削除後、請求書のステータスを再計算
      if (deleted && paymentRecord.status === 'confirmed') {
        await this.recalculateInvoicePaymentStatus(paymentRecord.invoiceId.toString());
      }

      return deleted;
    } catch (error) {
      logger.error('Error in deletePaymentRecord:', error);
      throw new Error('入金記録の削除に失敗しました');
    }
  }

  /**
   * 入金記録を確認済みにする
   */
  async confirmPaymentRecord(id: string, confirmedBy: string): Promise<PaymentRecord | null> {
    try {
      const updateData: Partial<PaymentRecord> = {
        status: 'confirmed',
        confirmedBy,
        confirmedAt: new Date(),
      };

      return await this.updatePaymentRecord(id, updateData);
    } catch (error) {
      logger.error('Error in confirmPaymentRecord:', error);
      throw new Error('入金記録の確認に失敗しました');
    }
  }

  /**
   * 入金記録を取り消す
   */
  async cancelPaymentRecord(id: string, cancelledBy: string, cancelReason?: string): Promise<PaymentRecord | null> {
    try {
      const updateData: Partial<PaymentRecord> = {
        status: 'cancelled',
        cancelledBy,
        cancelledAt: new Date(),
        cancelReason,
      };

      return await this.updatePaymentRecord(id, updateData);
    } catch (error) {
      logger.error('Error in cancelPaymentRecord:', error);
      throw new Error('入金記録の取り消しに失敗しました');
    }
  }

  /**
   * 請求書に紐づく入金記録を取得
   */
  async getPaymentRecordsByInvoiceId(invoiceId: string): Promise<PaymentRecord[]> {
    try {
      const paymentRecords = await db.find<PaymentRecord>(this.collectionName, {
        invoiceId: new ObjectId(invoiceId),
        status: 'confirmed',
      }, {
        sort: { paymentDate: 1 },
      });

      return paymentRecords;
    } catch (error) {
      logger.error('Error in getPaymentRecordsByInvoiceId:', error);
      throw new Error('請求書の入金記録の取得に失敗しました');
    }
  }

  /**
   * 請求書の支払いステータスを更新
   */
  private async updateInvoicePaymentStatus(invoice: Invoice, paymentRecord: PaymentRecord): Promise<void> {
    try {
      // 確認済みの入金記録の合計を計算
      const confirmedPayments = await this.getPaymentRecordsByInvoiceId(invoice._id!.toString());
      const totalPaidAmount = confirmedPayments.reduce((sum, pr) => sum + pr.amount, 0);

      let newStatus: InvoiceStatus;
      let paidAmount = totalPaidAmount;
      let paidDate: Date | undefined;

      if (totalPaidAmount >= invoice.totalAmount) {
        // 全額支払い済み
        newStatus = 'paid';
        paidDate = paymentRecord.paymentDate;
      } else if (totalPaidAmount > 0) {
        // 部分支払い
        newStatus = 'partially_paid';
      } else {
        // 未払い
        newStatus = 'unpaid';
      }

      await this.invoiceService.updateInvoiceStatus(
        invoice._id!.toString(),
        newStatus,
        paidDate,
        paidAmount
      );
    } catch (error) {
      logger.error('Error in updateInvoicePaymentStatus:', error);
      throw new Error('請求書のステータス更新に失敗しました');
    }
  }

  /**
   * 請求書の支払いステータスを再計算
   */
  private async recalculateInvoicePaymentStatus(invoiceId: string): Promise<void> {
    try {
      const invoice = await this.invoiceService.getInvoice(invoiceId);
      if (!invoice) {
        return;
      }

      // 確認済みの入金記録の合計を計算
      const confirmedPayments = await this.getPaymentRecordsByInvoiceId(invoiceId);
      const totalPaidAmount = confirmedPayments.reduce((sum, pr) => sum + pr.amount, 0);

      let newStatus: InvoiceStatus;
      let paidAmount = totalPaidAmount;
      let paidDate: Date | undefined;

      if (totalPaidAmount >= invoice.totalAmount) {
        // 全額支払い済み
        newStatus = 'paid';
        // 最後の入金日を支払い完了日とする
        const lastPayment = confirmedPayments[confirmedPayments.length - 1];
        paidDate = lastPayment ? lastPayment.paymentDate : undefined;
      } else if (totalPaidAmount > 0) {
        // 部分支払い
        newStatus = 'partially_paid';
      } else {
        // 未払い
        newStatus = 'unpaid';
        paidAmount = 0;
      }

      await this.invoiceService.updateInvoiceStatus(
        invoiceId,
        newStatus,
        paidDate,
        paidAmount
      );
    } catch (error) {
      logger.error('Error in recalculateInvoicePaymentStatus:', error);
      throw new Error('請求書のステータス再計算に失敗しました');
    }
  }

  /**
   * 入金番号を生成
   */
  private async generatePaymentNumber(): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');

      // 今日の入金記録数を取得してシーケンス番号を生成
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const paymentCount = await db.count(this.collectionName, {
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });

      const seq = (paymentCount + 1).toString().padStart(3, '0');

      return `PR-${year}${month}${day}-${seq}`;
    } catch (error) {
      logger.error('Error in generatePaymentNumber:', error);
      // エラーの場合はタイムスタンプベースの番号を生成
      const timestamp = new Date().getTime();
      return `PR-${timestamp}`;
    }
  }

  /**
   * 一括消し込み処理
   */
  async bulkReconciliation(paymentRecords: Array<{
    invoiceId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: PaymentRecord['paymentMethod'];
    notes?: string;
  }>): Promise<PaymentRecord[]> {
    try {
      const createdRecords: PaymentRecord[] = [];

      for (const record of paymentRecords) {
        const paymentRecord = await this.createPaymentRecord({
          invoiceId: new ObjectId(record.invoiceId),
          amount: record.amount,
          paymentDate: record.paymentDate,
          paymentMethod: record.paymentMethod,
          notes: record.notes,
          status: 'confirmed',
          confirmedBy: 'system',
          confirmedAt: new Date(),
        });

        createdRecords.push(paymentRecord);
      }

      return createdRecords;
    } catch (error) {
      logger.error('Error in bulkReconciliation:', error);
      throw new Error('一括消し込み処理に失敗しました');
    }
  }
}