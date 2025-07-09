import { ObjectId } from 'mongodb';
import { DatabaseService } from './database.service';
import { Product } from '../types/collections';

export class ProductService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * 商品を新規作成
   */
  async createProduct(productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date();
    
    // 商品コードの重複チェック
    const existingProduct = await this.db.findOne<Product>('products', {
      productCode: productData.productCode
    });
    
    if (existingProduct) {
      throw new Error('商品コードが重複しています');
    }

    const product: Omit<Product, '_id'> = {
      ...productData,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.db.insertOne('products', product);
    return {
      ...product,
      _id: result.insertedId
    };
  }

  /**
   * 商品一覧を取得
   */
  async getProducts(options: {
    isActive?: boolean;
    category?: string;
    limit?: number;
    skip?: number;
    sortBy?: 'productName' | 'productCode' | 'category' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<Product[]> {
    const filter: any = {};
    
    if (options.isActive !== undefined) {
      filter.isActive = options.isActive;
    }
    
    if (options.category) {
      filter.category = options.category;
    }

    const sort: any = {};
    if (options.sortBy) {
      sort[options.sortBy] = options.sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // デフォルトは作成日の降順
    }

    return await this.db.find<Product>('products', filter, {
      sort,
      limit: options.limit,
      skip: options.skip
    });
  }

  /**
   * IDで商品を取得
   */
  async getProductById(id: string): Promise<Product | null> {
    return await this.db.findOne<Product>('products', { _id: new ObjectId(id) });
  }

  /**
   * 商品コードで商品を取得
   */
  async getProductByCode(productCode: string): Promise<Product | null> {
    return await this.db.findOne<Product>('products', { productCode });
  }

  /**
   * 商品を更新
   */
  async updateProduct(id: string, updateData: Partial<Omit<Product, '_id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null> {
    const now = new Date();
    
    // 商品コードの重複チェック（自分以外で同じコードがないか）
    if (updateData.productCode) {
      const existingProduct = await this.db.findOne<Product>('products', {
        productCode: updateData.productCode,
        _id: { $ne: new ObjectId(id) }
      });
      
      if (existingProduct) {
        throw new Error('商品コードが重複しています');
      }
    }

    const result = await this.db.updateOne(
      'products',
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: now
        }
      }
    );

    if (result.modifiedCount === 0) {
      return null;
    }

    return await this.getProductById(id);
  }

  /**
   * 商品を削除
   */
  async deleteProduct(id: string): Promise<boolean> {
    const result = await this.db.deleteOne('products', { _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  /**
   * 商品を検索
   */
  async searchProducts(query: string): Promise<Product[]> {
    const filter = {
      $or: [
        { productName: { $regex: query, $options: 'i' } },
        { productCode: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    };

    return await this.db.find<Product>('products', filter, {
      sort: { productName: 1 }
    });
  }

  /**
   * カテゴリ一覧を取得
   */
  async getCategories(): Promise<string[]> {
    const products = await this.db.find<Product>('products', {}, {
      projection: { category: 1 }
    });
    
    const categories = [...new Set(products.map(p => p.category))];
    return categories.sort();
  }

  /**
   * 商品の在庫を更新
   */
  async updateStock(id: string, quantity: number): Promise<Product | null> {
    const product = await this.getProductById(id);
    if (!product) {
      return null;
    }

    const newStock = product.stockQuantity + quantity;
    if (newStock < 0) {
      throw new Error('在庫数が不足しています');
    }

    return await this.updateProduct(id, { stockQuantity: newStock });
  }

  /**
   * 商品の有効/無効を切り替え
   */
  async toggleActive(id: string): Promise<Product | null> {
    const product = await this.getProductById(id);
    if (!product) {
      return null;
    }

    return await this.updateProduct(id, { isActive: !product.isActive });
  }

  /**
   * 商品数を取得
   */
  async getProductCount(filter: { isActive?: boolean; category?: string } = {}): Promise<number> {
    const query: any = {};
    
    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }
    
    if (filter.category) {
      query.category = filter.category;
    }

    return await this.db.countDocuments('products', query);
  }
}