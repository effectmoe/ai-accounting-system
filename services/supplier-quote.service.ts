import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { SupplierQuote, SupplierQuoteStatus, SupplierQuoteItem, Supplier } from '@/types/collections';

import { logger } from '@/lib/logger';
export interface SupplierQuoteSearchParams {
  supplierId?: string;
  status?: SupplierQuoteStatus;
  dateFrom?: Date;
  dateTo?: Date;
  isGeneratedByAI?: boolean;
  limit?: number;
  skip?: number;
}

export interface SupplierQuoteSearchResult {
  supplierQuotes: SupplierQuote[];
  total: number;
  hasMore: boolean;
}

export class SupplierQuoteService {
  private collectionName = 'supplierQuotes';

  /**
   * 仕入先見積書を検索
   */
  async searchSupplierQuotes(params: SupplierQuoteSearchParams): Promise<SupplierQuoteSearchResult> {
    try {
      const filter: any = {};

      if (params.supplierId) {
        filter.supplierId = new ObjectId(params.supplierId);
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

      const limit = params.limit || 20;
      const skip = params.skip || 0;

      // 仕入先見積書を取得
      const supplierQuotes = await db.find<SupplierQuote>(this.collectionName, filter, {
        sort: { issueDate: -1, quoteNumber: -1 },
        limit: limit + 1, // hasMoreを判定するため1件多く取得
        skip,
      });

      // 仕入先情報を取得してマージ
      const supplierIds = [...new Set(supplierQuotes.map(quote => quote.supplierId?.toString()).filter(Boolean))];
      if (supplierIds.length > 0) {
        const suppliers = await db.find<Supplier>('suppliers', {
          _id: { $in: supplierIds.map(id => new ObjectId(id!)) }
        });

        const supplierMap = new Map(
          suppliers.map(supplier => [supplier._id!.toString(), supplier])
        );

        supplierQuotes.forEach(quote => {
          if (quote.supplierId) {
            quote.supplier = supplierMap.get(quote.supplierId.toString());
          }
        });
      }

      // hasMoreの判定
      const hasMore = supplierQuotes.length > limit;
      if (hasMore) {
        supplierQuotes.pop(); // 余分な1件を削除
      }

      // 総数を取得
      const total = await db.count(this.collectionName, filter);

      return {
        supplierQuotes,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in searchSupplierQuotes:', error);
      throw new Error('仕入先見積書の検索に失敗しました');
    }
  }

  /**
   * 仕入先見積書を作成
   */
  async createSupplierQuote(quoteData: Omit<SupplierQuote, '_id' | 'createdAt' | 'updatedAt'>): Promise<SupplierQuote> {
    try {
      // 見積書番号の重複チェック
      let finalQuoteNumber = quoteData.quoteNumber;
      const existing = await db.findOne<SupplierQuote>(this.collectionName, {
        quoteNumber: quoteData.quoteNumber
      });

      if (existing) {
        logger.debug(`[SupplierQuoteService] Duplicate quote number detected: ${quoteData.quoteNumber}`);
        // 重複が検出された場合、新しい番号を生成
        finalQuoteNumber = await this.generateSupplierQuoteNumber();
        logger.debug(`[SupplierQuoteService] Generated new quote number: ${finalQuoteNumber}`);
      }

      // 仕入先の存在確認
      if (quoteData.supplierId) {
        const supplier = await db.findById<Supplier>('suppliers', quoteData.supplierId);
        if (!supplier) {
          throw new Error('指定された仕入先が見つかりません');
        }
      }

      // 日付をDateオブジェクトに変換
      const quote: Omit<SupplierQuote, '_id' | 'createdAt' | 'updatedAt'> = {
        ...quoteData,
        quoteNumber: finalQuoteNumber, // 重複チェック後の番号を使用
        issueDate: new Date(quoteData.issueDate),
        validityDate: new Date(quoteData.validityDate),
        receivedDate: quoteData.receivedDate ? new Date(quoteData.receivedDate) : undefined,
        acceptedDate: quoteData.acceptedDate ? new Date(quoteData.acceptedDate) : undefined,
        rejectedDate: quoteData.rejectedDate ? new Date(quoteData.rejectedDate) : undefined,
        expiredDate: quoteData.expiredDate ? new Date(quoteData.expiredDate) : undefined,
        convertedToPurchaseOrderDate: quoteData.convertedToPurchaseOrderDate ? new Date(quoteData.convertedToPurchaseOrderDate) : undefined,
      };

      // 仕入先見積書を作成
      const created = await db.create<SupplierQuote>(this.collectionName, quote);
      return created;
    } catch (error) {
      logger.error('Error in createSupplierQuote:', error);
      throw error instanceof Error ? error : new Error('仕入先見積書の作成に失敗しました');
    }
  }

  /**
   * 仕入先見積書を取得
   */
  async getSupplierQuote(id: string): Promise<SupplierQuote | null> {
    try {
      logger.debug('[SupplierQuoteService] getSupplierQuote called with ID:', id);
      
      // IDの検証
      if (!id || id === 'undefined' || id === 'null') {
        logger.debug('[SupplierQuoteService] Invalid ID provided:', id);
        return null;
      }

      // IDの長さチェック（ObjectIdは24文字）
      if (id.length !== 24) {
        logger.debug('[SupplierQuoteService] Invalid ObjectId length:', id.length);
        return null;
      }
      
      const quote = await db.findById<SupplierQuote>(this.collectionName, id);
      
      if (!quote) {
        logger.debug('[SupplierQuoteService] No supplier quote found for ID:', id);
        return null;
      }
      
      logger.debug('[SupplierQuoteService] Supplier quote found:', {
        _id: quote._id,
        quoteNumber: quote.quoteNumber
      });

      // 仕入先情報を取得
      if (quote.supplierId) {
        try {
          quote.supplier = await db.findById<Supplier>('suppliers', quote.supplierId);
        } catch (error) {
          logger.error('Error fetching supplier:', error);
          // 仕入先の取得に失敗しても処理を続行
        }
      }

      return quote;
    } catch (error) {
      logger.error('Error in getSupplierQuote:', error);
      if (error instanceof Error && error.message.includes('must be a valid ObjectId')) {
        logger.error('Invalid ObjectId format:', id);
        return null;
      }
      throw new Error('仕入先見積書の取得に失敗しました');
    }
  }

  /**
   * 仕入先見積書を更新
   */
  async updateSupplierQuote(id: string, updateData: Partial<SupplierQuote>): Promise<SupplierQuote | null> {
    try {
      logger.debug('[SupplierQuoteService] updateSupplierQuote called with:', {
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
      if (dataToUpdate.receivedDate) {
        dataToUpdate.receivedDate = new Date(dataToUpdate.receivedDate);
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
      if (dataToUpdate.convertedToPurchaseOrderDate) {
        dataToUpdate.convertedToPurchaseOrderDate = new Date(dataToUpdate.convertedToPurchaseOrderDate);
      }

      // 仕入先の存在確認
      if (dataToUpdate.supplierId) {
        const supplier = await db.findById<Supplier>('suppliers', dataToUpdate.supplierId);
        if (!supplier) {
          throw new Error('指定された仕入先が見つかりません');
        }
      }

      const updated = await db.update<SupplierQuote>(this.collectionName, id, dataToUpdate);
      
      if (updated) {
        // 仕入先情報を取得
        if (updated.supplierId) {
          updated.supplier = await db.findById<Supplier>('suppliers', updated.supplierId);
        }
      }

      return updated;
    } catch (error) {
      logger.error('Error in updateSupplierQuote:', error);
      throw error instanceof Error ? error : new Error('仕入先見積書の更新に失敗しました');
    }
  }

  /**
   * 仕入先見積書を削除
   */
  async deleteSupplierQuote(id: string): Promise<boolean> {
    try {
      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error('Error in deleteSupplierQuote:', error);
      throw new Error('仕入先見積書の削除に失敗しました');
    }
  }

  /**
   * 仕入先見積書のステータスを更新
   */
  async updateSupplierQuoteStatus(id: string, status: SupplierQuoteStatus, statusDate?: Date): Promise<SupplierQuote | null> {
    try {
      const updateData: Partial<SupplierQuote> = { status };

      if (status === 'received' && statusDate) {
        updateData.receivedDate = statusDate;
      } else if (status === 'accepted' && statusDate) {
        updateData.acceptedDate = statusDate;
      } else if (status === 'rejected' && statusDate) {
        updateData.rejectedDate = statusDate;
      } else if (status === 'expired' && statusDate) {
        updateData.expiredDate = statusDate;
      }

      return await this.updateSupplierQuote(id, updateData);
    } catch (error) {
      logger.error('Error in updateSupplierQuoteStatus:', error);
      throw new Error('仕入先見積書ステータスの更新に失敗しました');
    }
  }

  /**
   * 仕入先見積書番号を生成
   */
  async generateSupplierQuoteNumber(): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      
      // プレフィックスを作成
      const prefix = `SQ-${year}${month}${day}`;
      
      // 同じプレフィックスを持つ最大のシーケンス番号を取得
      const existingQuotes = await db.find<SupplierQuote>(this.collectionName, {
        quoteNumber: { $regex: `^${prefix}-` }
      }, {
        sort: { quoteNumber: -1 },
        limit: 1
      });
      
      let seq = 1;
      if (existingQuotes.length > 0) {
        const lastQuoteNumber = existingQuotes[0].quoteNumber;
        const lastSeq = lastQuoteNumber.split('-').pop();
        if (lastSeq && !isNaN(parseInt(lastSeq))) {
          seq = parseInt(lastSeq) + 1;
        }
      }
      
      // 重複チェックのためのループ
      let attempts = 0;
      let quoteNumber = '';
      
      while (attempts < 100) {
        quoteNumber = `${prefix}-${seq.toString().padStart(3, '0')}`;
        
        // 重複チェック
        const existing = await db.findOne<SupplierQuote>(this.collectionName, {
          quoteNumber: quoteNumber
        });
        
        if (!existing) {
          return quoteNumber;
        }
        
        seq++;
        attempts++;
      }
      
      // 100回試しても重複が解消されない場合は、タイムスタンプを追加
      logger.warn('Failed to generate unique quote number after 100 attempts');
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}-${seq.toString().padStart(3, '0')}-${timestamp}`;
      
    } catch (error) {
      logger.error('Error in generateSupplierQuoteNumber:', error);
      // エラーの場合はタイムスタンプベースの番号を生成
      const timestamp = new Date().getTime();
      return `SQ-${timestamp}`;
    }
  }

  /**
   * 月次の仕入先見積書集計
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