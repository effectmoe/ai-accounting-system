import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { Product } from '@/types/collections';

import { logger } from '@/lib/logger';
export interface ProductSearchParams {
  query?: string;
  category?: string;
  isActive?: boolean;
  limit?: number;
  skip?: number;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  hasMore: boolean;
}

export interface ProductFilterParams {
  filters: any;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
}

export class ProductService {
  private collectionName = Collections.PRODUCTS;

  /**
   * 商品を検索
   */
  async searchProducts(params: ProductSearchParams = {}): Promise<ProductSearchResult> {
    try {
      const filter: any = {};

      // テキスト検索
      if (params.query) {
        filter.$or = [
          { productName: { $regex: params.query, $options: 'i' } },
          { productCode: { $regex: params.query, $options: 'i' } },
          { description: { $regex: params.query, $options: 'i' } },
        ];
      }

      // カテゴリフィルター
      if (params.category) {
        filter.category = params.category;
      }

      // アクティブフィルター
      if (params.isActive !== undefined) {
        filter.isActive = params.isActive;
      }

      const limit = params.limit || 20;
      const skip = params.skip || 0;

      // 商品を取得
      const products = await db.find<Product>(this.collectionName, filter, {
        sort: { productCode: 1, productName: 1 },
        limit: limit + 1, // hasMoreを判定するため1件多く取得
        skip,
      });

      // hasMoreの判定
      const hasMore = products.length > limit;
      if (hasMore) {
        products.pop(); // 余分な1件を削除
      }

      // 総数を取得
      const total = await db.count(this.collectionName, filter);

      return {
        products,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in searchProducts:', error);
      throw new Error('商品の検索に失敗しました');
    }
  }

  /**
   * 全ての商品を取得
   */
  async getAllProducts(includeInactive: boolean = false): Promise<Product[]> {
    try {
      const filter = includeInactive ? {} : { isActive: { $ne: false } };
      return await db.find<Product>(this.collectionName, filter, {
        sort: { productCode: 1, productName: 1 }
      });
    } catch (error) {
      logger.error('Error in getAllProducts:', error);
      throw new Error('商品一覧の取得に失敗しました');
    }
  }

  /**
   * 商品を作成
   */
  async createProduct(productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      // 商品コードの重複チェック
      const existing = await db.findOne<Product>(this.collectionName, {
        productCode: productData.productCode
      });

      if (existing) {
        throw new Error(`商品コード ${productData.productCode} は既に使用されています`);
      }

      // デフォルト値の設定
      const product: Omit<Product, '_id' | 'createdAt' | 'updatedAt'> = {
        ...productData,
        isActive: productData.isActive ?? true,
        tags: productData.tags || [],
      };

      // 商品を作成
      const created = await db.create<Product>(this.collectionName, product);
      return created;
    } catch (error) {
      logger.error('Error in createProduct:', error);
      throw error instanceof Error ? error : new Error('商品の作成に失敗しました');
    }
  }

  /**
   * 商品を取得
   */
  async getProduct(id: string): Promise<Product | null> {
    try {
      return await db.findById<Product>(this.collectionName, id);
    } catch (error) {
      logger.error('Error in getProduct:', error);
      throw new Error('商品の取得に失敗しました');
    }
  }

  /**
   * 商品コードで商品を取得
   */
  async getProductByCode(productCode: string): Promise<Product | null> {
    try {
      return await db.findOne<Product>(this.collectionName, { productCode });
    } catch (error) {
      logger.error('Error in getProductByCode:', error);
      throw new Error('商品の取得に失敗しました');
    }
  }

  /**
   * 商品を更新
   */
  async updateProduct(id: string, updateData: Partial<Product>): Promise<Product | null> {
    try {
      // _idフィールドは更新対象から除外
      const { _id, ...dataToUpdate } = updateData;

      // 商品コードの重複チェック（自分自身は除外）
      if (dataToUpdate.productCode) {
        const existing = await db.findOne<Product>(this.collectionName, {
          productCode: dataToUpdate.productCode,
          _id: { $ne: new ObjectId(id) }
        });

        if (existing) {
          throw new Error(`商品コード ${dataToUpdate.productCode} は既に使用されています`);
        }
      }

      const updated = await db.update<Product>(this.collectionName, id, dataToUpdate);
      return updated;
    } catch (error) {
      logger.error('Error in updateProduct:', error);
      throw error instanceof Error ? error : new Error('商品の更新に失敗しました');
    }
  }

  /**
   * 商品を削除
   */
  async deleteProduct(id: string): Promise<boolean> {
    try {
      // 関連する請求書明細の存在チェック
      const invoiceCount = await db.count(Collections.INVOICES, {
        'items.productCode': { $exists: true },
        'items.productCode': { $ne: null }
      });

      if (invoiceCount > 0) {
        // ソフトデリート（無効化）
        await this.updateProduct(id, { isActive: false });
        return true;
      }

      return await db.delete(this.collectionName, id);
    } catch (error) {
      logger.error('Error in deleteProduct:', error);
      throw new Error('商品の削除に失敗しました');
    }
  }

  /**
   * 商品の有効/無効を切り替え
   */
  async toggleProductStatus(id: string): Promise<Product | null> {
    try {
      const product = await this.getProduct(id);
      if (!product) {
        throw new Error('商品が見つかりません');
      }

      return await this.updateProduct(id, {
        isActive: !product.isActive
      });
    } catch (error) {
      logger.error('Error in toggleProductStatus:', error);
      throw error instanceof Error ? error : new Error('商品ステータスの切り替えに失敗しました');
    }
  }

  /**
   * カテゴリ一覧を取得
   */
  async getCategories(): Promise<string[]> {
    try {
      const pipeline = [
        { $match: { category: { $exists: true, $ne: null } } },
        { $group: { _id: '$category' } },
        { $sort: { _id: 1 } },
      ];

      const result = await db.aggregate<{ _id: string }>(this.collectionName, pipeline);
      return result.map(item => item._id).filter(Boolean);
    } catch (error) {
      logger.error('Error in getCategories:', error);
      throw new Error('カテゴリ一覧の取得に失敗しました');
    }
  }

  /**
   * タグを追加
   */
  async addTag(productId: string, tag: string): Promise<Product | null> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        throw new Error('商品が見つかりません');
      }

      const tags = product.tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }

      return await this.updateProduct(productId, { tags });
    } catch (error) {
      logger.error('Error in addTag:', error);
      throw error instanceof Error ? error : new Error('タグの追加に失敗しました');
    }
  }

  /**
   * タグを削除
   */
  async removeTag(productId: string, tag: string): Promise<Product | null> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        throw new Error('商品が見つかりません');
      }

      const tags = (product.tags || []).filter(t => t !== tag);

      return await this.updateProduct(productId, { tags });
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

  /**
   * 商品の在庫を更新（将来の拡張用）
   */
  async updateStock(productId: string, quantity: number): Promise<Product | null> {
    try {
      // 在庫管理機能が追加された場合の実装
      throw new Error('在庫管理機能は未実装です');
    } catch (error) {
      logger.error('Error in updateStock:', error);
      throw error instanceof Error ? error : new Error('在庫の更新に失敗しました');
    }
  }

  /**
   * フィルターとソートを適用して商品を取得
   */
  async getProductsWithFilters(params: ProductFilterParams): Promise<ProductSearchResult> {
    try {
      const { filters = {}, sortBy = 'createdAt', sortOrder = 'desc', limit = 20, skip = 0 } = params;

      // ソートオプションの構築
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // 商品を取得
      const products = await db.find<Product>(this.collectionName, filters, {
        sort: sortOptions,
        limit: limit + 1, // hasMoreを判定するため1件多く取得
        skip,
      });

      // hasMoreの判定
      const hasMore = products.length > limit;
      if (hasMore) {
        products.pop(); // 余分な1件を削除
      }

      // 総数を取得
      const total = await db.count(this.collectionName, filters);

      return {
        products,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in getProductsWithFilters:', error);
      throw new Error('商品の取得に失敗しました');
    }
  }
}