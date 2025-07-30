/**
 * 最適化されたMongoDBクエリ実装
 * フェーズ2 段階3: クエリパフォーマンス最適化
 */

import { Collection, Db } from 'mongodb';
import { Customer, SortableField, SortOrder, FilterState } from '@/types/collections';
import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb-client';

export interface CustomerListParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  sortBy: SortableField;
  sortOrder: SortOrder;
  filters: FilterState;
}

export class OptimizedCustomerQueries {
  private static db: Db | null = null;
  private static collection: Collection<Customer> | null = null;

  /**
   * データベース接続の初期化
   */
  private static async initialize(): Promise<void> {
    if (!this.db || !this.collection) {
      this.db = await getDatabase();
      this.collection = this.db.collection<Customer>('customers');
    }
  }

  /**
   * プライマリ連絡先データを事前計算して保存
   * 新規顧客作成・更新時に呼び出す
   */
  static async preprocessCustomerData(customer: Partial<Customer>): Promise<Partial<Customer>> {
    const primaryContact = customer.contacts?.find(c => c.isPrimary) || customer.contacts?.[0];
    
    return {
      ...customer,
      // 計算済みフィールドを追加
      _primaryContactName: primaryContact?.name || '',
      _primaryContactNameKana: primaryContact?.nameKana || '',
      _primaryContactEmail: primaryContact?.email || '',
      _primaryContactPhone: primaryContact?.phone || '',
    };
  }

  /**
   * 既存の顧客データのプライマリ連絡先フィールドを更新
   * マイグレーションスクリプトで使用
   */
  static async updatePrimaryContactFields(customerId: string): Promise<boolean> {
    await this.initialize();
    
    try {
      const customer = await this.collection!.findOne({ _id: customerId as any });
      if (!customer) return false;

      const primaryContact = customer.contacts?.find(c => c.isPrimary) || customer.contacts?.[0];
      
      await this.collection!.updateOne(
        { _id: customerId as any },
        {
          $set: {
            _primaryContactName: primaryContact?.name || '',
            _primaryContactNameKana: primaryContact?.nameKana || '',
            _primaryContactEmail: primaryContact?.email || '',
            _primaryContactPhone: primaryContact?.phone || '',
          }
        }
      );

      return true;
    } catch (error) {
      logger.error('Failed to update primary contact fields:', error);
      return false;
    }
  }

  /**
   * 最適化された顧客一覧取得
   */
  static async getOptimizedCustomersList(params: CustomerListParams): Promise<{
    customers: Customer[];
    total: number;
  }> {
    await this.initialize();
    const startTime = Date.now();

    const { page, limit, skip, search, sortBy, sortOrder, filters } = params;

    // テキスト検索の場合は専用最適化
    if (search) {
      const result = await this.getCustomersWithTextSearch(search, skip, limit, sortBy, sortOrder, filters);
      const duration = Date.now() - startTime;
      logger.debug(`🚀 Optimized text search completed in ${duration}ms`);
      return result;
    }

    // プライマリ連絡先ソートの場合は事前計算フィールドを使用
    let optimizedSortBy = sortBy;
    if (sortBy === 'primaryContactName') {
      optimizedSortBy = '_primaryContactName' as any;
    } else if (sortBy === 'primaryContactNameKana') {
      optimizedSortBy = '_primaryContactNameKana' as any;
    }

    // 通常のクエリ実行
    const query = this.buildFilterQuery(filters);
    
    // カウントと取得を並列実行
    const [total, customers] = await Promise.all([
      this.collection!.countDocuments(query),
      this.getCustomersWithSimpleSort(skip, limit, optimizedSortBy, sortOrder, filters)
    ]);

    const duration = Date.now() - startTime;
    logger.debug(`🚀 Optimized query completed in ${duration}ms`);

    return { customers, total };
  }

  /**
   * テキスト検索最適化
   */
  private static async getCustomersWithTextSearch(
    search: string,
    skip: number,
    limit: number,
    sortBy: SortableField,
    sortOrder: SortOrder,
    filters: FilterState
  ): Promise<{ customers: Customer[]; total: number }> {
    const pipeline = [
      {
        $match: {
          $text: { $search: search },
          ...this.buildFilterQuery(filters)
        }
      },
      {
        $addFields: {
          score: { $meta: 'textScore' }
        }
      },
      {
        $facet: {
          // 総件数を取得
          totalCount: [{ $count: 'count' }],
          // ページングされた結果を取得
          results: [
            { $sort: { score: { $meta: 'textScore' }, _id: 1 } },
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ];

    const [result] = await this.collection!.aggregate(pipeline).toArray();
    
    const total = result.totalCount[0]?.count || 0;
    const customers = result.results || [];

    return { customers, total };
  }

  /**
   * シンプルソート最適化
   */
  private static async getCustomersWithSimpleSort(
    skip: number,
    limit: number,
    sortBy: SortableField | string,
    sortOrder: SortOrder,
    filters: FilterState
  ): Promise<Customer[]> {
    const query = this.buildFilterQuery(filters);
    const sortCondition: { [key: string]: 1 | -1 } = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    };

    // セカンダリソートキーを追加（安定したソート順を保証）
    if (sortBy !== '_id') {
      sortCondition._id = 1;
    }

    let cursor = this.collection!
      .find(query)
      .sort(sortCondition)
      .skip(skip)
      .limit(limit);

    // 日本語ソートの場合はcollationを適用
    if (sortBy === 'companyNameKana' || sortBy === '_primaryContactNameKana') {
      cursor = cursor.collation({
        locale: 'ja',
        caseLevel: false,
        strength: 1
      });
    }

    return cursor.toArray();
  }

  /**
   * フィルタークエリの構築
   */
  private static buildFilterQuery(filters: FilterState): any {
    const query: any = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.prefecture) {
      query.prefecture = { $regex: filters.prefecture, $options: 'i' };
    }

    if (filters.city) {
      query.city = { $regex: filters.city, $options: 'i' };
    }

    if (filters.paymentTermsMin !== undefined || filters.paymentTermsMax !== undefined) {
      query.paymentTerms = {};
      if (filters.paymentTermsMin !== undefined) {
        query.paymentTerms.$gte = filters.paymentTermsMin;
      }
      if (filters.paymentTermsMax !== undefined) {
        query.paymentTerms.$lte = filters.paymentTermsMax;
      }
    }

    if (filters.createdAtStart || filters.createdAtEnd) {
      query.createdAt = {};
      if (filters.createdAtStart) {
        const startDate = new Date(filters.createdAtStart);
        startDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = startDate;
      }
      if (filters.createdAtEnd) {
        const endDate = new Date(filters.createdAtEnd);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    return query;
  }

  /**
   * バッチ更新用：すべての顧客のプライマリ連絡先フィールドを更新
   */
  static async batchUpdatePrimaryContactFields(batchSize: number = 100): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    await this.initialize();
    
    const stats = {
      processed: 0,
      updated: 0,
      errors: 0
    };

    try {
      const cursor = this.collection!.find({}).batchSize(batchSize);
      
      while (await cursor.hasNext()) {
        const customer = await cursor.next();
        if (!customer) continue;

        stats.processed++;

        try {
          const primaryContact = customer.contacts?.find(c => c.isPrimary) || customer.contacts?.[0];
          
          await this.collection!.updateOne(
            { _id: customer._id },
            {
              $set: {
                _primaryContactName: primaryContact?.name || '',
                _primaryContactNameKana: primaryContact?.nameKana || '',
                _primaryContactEmail: primaryContact?.email || '',
                _primaryContactPhone: primaryContact?.phone || '',
              }
            }
          );

          stats.updated++;
        } catch (error) {
          stats.errors++;
          logger.error(`Failed to update customer ${customer._id}:`, error);
        }

        // 進捗ログ
        if (stats.processed % 100 === 0) {
          logger.info(`📊 Batch update progress: ${stats.processed} processed, ${stats.updated} updated`);
        }
      }

      await cursor.close();

    } catch (error) {
      logger.error('Batch update failed:', error);
      throw error;
    }

    return stats;
  }

  /**
   * クエリの実行計画を取得（デバッグ用）
   */
  static async explainQuery(params: CustomerListParams): Promise<any> {
    await this.initialize();
    
    const query = this.buildFilterQuery(params.filters);
    
    if (params.search) {
      // テキスト検索の実行計画
      return this.collection!.find({
        $text: { $search: params.search },
        ...query
      }).explain('executionStats');
    }

    // 通常クエリの実行計画
    return this.collection!.find(query)
      .sort({ [params.sortBy]: params.sortOrder === 'asc' ? 1 : -1 })
      .skip(params.skip)
      .limit(params.limit)
      .explain('executionStats');
  }
}