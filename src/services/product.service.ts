import { ObjectId } from 'mongodb';
import { DatabaseService } from '@/lib/mongodb-client';
import { Product } from '@/types/collections';

export class ProductService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
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

    const result = await this.db.create<Product>('products', product);
    return result;
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
    return await this.db.findById<Product>('products', id);
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
      const existingProducts = await this.db.find<Product>('products', {
        productCode: updateData.productCode
      });
      
      const duplicateProduct = existingProducts.find(product => product._id!.toString() !== id);
      
      if (duplicateProduct) {
        throw new Error('商品コードが重複しています');
      }
    }

    const result = await this.db.update<Product>('products', id, {
      ...updateData,
      updatedAt: now
    });

    return result;
  }

  /**
   * 商品を削除
   */
  async deleteProduct(id: string): Promise<boolean> {
    return await this.db.delete('products', id);
  }

  /**
   * 商品を検索
   */
  async searchProducts(query: string): Promise<Product[]> {
    // 簡単な実装：すべての商品を取得してフィルタリング
    const allProducts = await this.db.find<Product>('products', {});
    return allProducts.filter(product => 
      product.productName.toLowerCase().includes(query.toLowerCase()) ||
      product.productCode.toLowerCase().includes(query.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(query.toLowerCase())) ||
      (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
    );
  }

  /**
   * カテゴリ一覧を取得
   */
  async getCategories(): Promise<string[]> {
    const products = await this.db.find<Product>('products', {});
    
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
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

    const newStock = (product.stockQuantity || 0) + quantity;
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