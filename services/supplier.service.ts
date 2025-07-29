import { ObjectId } from 'mongodb';
import { getDatabase, db } from '@/lib/mongodb-client';
import { Supplier, SupplierStatus } from '@/types/collections';

import { logger } from '@/lib/logger';
// MongoDB接続はgetDatabase()で'accounting'データベースを使用するため、この定数は不要
const COLLECTION_NAME = 'suppliers';

export class SupplierService {
  // 仕入先一覧取得
  static async getSuppliers(params?: {
    status?: SupplierStatus;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { 
      status, 
      search, 
      page = 1, 
      limit = 20, 
      sortBy = 'companyName', 
      sortOrder = 'asc' 
    } = params || {};

    const db = await getDatabase();
    const collection = db.collection<Supplier>(COLLECTION_NAME);

    // フィルター条件の構築
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { companyNameKana: { $regex: search, $options: 'i' } },
        { supplierCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // ソート条件
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter)
    ]);

    return {
      suppliers: suppliers.map(supplier => ({
        ...supplier,
        id: supplier._id?.toString()
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 仕入先詳細取得
  static async getSupplierById(id: string) {
    logger.debug('===== [SupplierService] getSupplierById Debug START =====');
    logger.debug('[1] Looking for supplier with ID:', id);
    
    const db = await getDatabase();
    const collection = db.collection<Supplier>(COLLECTION_NAME);

    const supplier = await collection.findOne({ _id: new ObjectId(id) });
    if (!supplier) {
      logger.debug('[2] Supplier not found in database');
      throw new Error('Supplier not found');
    }
    
    logger.debug('[2] Raw supplier from MongoDB:', JSON.stringify({
      _id: supplier._id,
      supplierCode: supplier.supplierCode,
      companyName: supplier.companyName,
      email: supplier.email,
      phone: supplier.phone,
      fax: supplier.fax,
      address1: supplier.address1,
      address2: supplier.address2,
      postalCode: supplier.postalCode,
      prefecture: supplier.prefecture,
      city: supplier.city,
      status: supplier.status,
      notes: supplier.notes,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    }, null, 2));
    
    logger.debug('[3] MongoDB field types:', {
      phoneType: typeof supplier.phone,
      phoneValue: supplier.phone,
      faxType: typeof supplier.fax,
      faxValue: supplier.fax,
      address1Type: typeof supplier.address1,
      address1Value: supplier.address1,
      postalCodeType: typeof supplier.postalCode,
      postalCodeValue: supplier.postalCode
    });

    // 銀行口座情報を含める場合
    if (supplier.bankAccountId) {
      const bankAccount = await db.collection('bankAccounts').findOne({ 
        _id: supplier.bankAccountId 
      });
      if (bankAccount) {
        supplier.bankAccount = bankAccount as any;
      }
    }

    const result = {
      ...supplier,
      id: supplier._id?.toString()
    };
    
    logger.debug('[4] Final supplier object to return:', JSON.stringify({
      _id: result._id,
      id: result.id,
      phone: result.phone,
      fax: result.fax,
      address1: result.address1,
      postalCode: result.postalCode,
      bankTransferInfo: result.bankTransferInfo,
      hasBankTransferInfo: !!result.bankTransferInfo
    }, null, 2));
    
    logger.debug('===== [SupplierService] getSupplierById Debug END =====');
    
    return result;
  }

  // 仕入先作成
  static async createSupplier(data: Omit<Supplier, '_id' | 'createdAt' | 'updatedAt'>) {
    const db = await getDatabase();
    const collection = db.collection<Supplier>(COLLECTION_NAME);

    // 仕入先コードの重複チェック
    const existing = await collection.findOne({ supplierCode: data.supplierCode });
    if (existing) {
      throw new Error('Supplier code already exists');
    }

    const now = new Date();
    const supplier: Supplier = {
      ...data,
      status: data.status || 'active',
      currentBalance: 0,
      totalPurchaseAmount: 0,
      createdAt: now,
      updatedAt: now
    };

    const result = await collection.insertOne(supplier);
    
    return {
      ...supplier,
      _id: result.insertedId,
      id: result.insertedId.toString()
    };
  }

  // 仕入先更新
  static async updateSupplier(id: string, data: Partial<Omit<Supplier, '_id' | 'createdAt'>>) {
    const db = await getDatabase();
    const collection = db.collection<Supplier>(COLLECTION_NAME);

    // 仕入先コードの重複チェック（自分以外）
    if (data.supplierCode) {
      const existing = await collection.findOne({ 
        supplierCode: data.supplierCode,
        _id: { $ne: new ObjectId(id) }
      });
      if (existing) {
        throw new Error('Supplier code already exists');
      }
    }

    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    // ObjectId型への変換
    if (data.bankAccountId) {
      updateData.bankAccountId = new ObjectId(data.bankAccountId);
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('Supplier not found');
    }

    return {
      ...result,
      id: result._id?.toString()
    };
  }

  // 仕入先削除
  static async deleteSupplier(id: string) {
    logger.debug('[SupplierService.deleteSupplier] Starting deletion for ID:', id);
    
    const db = await getDatabase();
    const collection = db.collection<Supplier>(COLLECTION_NAME);

    // 関連する発注書や見積書が存在するかチェック
    const [purchaseOrders, supplierQuotes] = await Promise.all([
      db.collection('purchaseOrders').countDocuments({ supplierId: new ObjectId(id) }),
      db.collection('supplierQuotes').countDocuments({ supplierId: new ObjectId(id) })
    ]);
    
    logger.debug('[SupplierService.deleteSupplier] Related documents:', {
      purchaseOrders,
      supplierQuotes
    });

    if (purchaseOrders > 0 || supplierQuotes > 0) {
      // 完全削除ではなく、ステータスを非アクティブに変更
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'inactive' as SupplierStatus,
            updatedAt: new Date()
          } 
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error('Supplier not found');
      }

      return {
        ...result,
        id: result._id?.toString(),
        deleted: false,
        deactivated: true
      };
    }

    // 関連データがない場合は削除
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      throw new Error('Supplier not found');
    }

    return { deleted: true };
  }

  // 仕入先コードの自動生成
  static async generateSupplierCode() {
    const db = await getDatabase();
    const collection = db.collection<Supplier>(COLLECTION_NAME);

    // 最新の仕入先コードを取得
    const lastSupplier = await collection
      .find({ supplierCode: { $regex: /^SUP-\d+$/ } })
      .sort({ supplierCode: -1 })
      .limit(1)
      .toArray();

    let nextNumber = 1;
    if (lastSupplier.length > 0) {
      const match = lastSupplier[0].supplierCode.match(/SUP-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `SUP-${nextNumber.toString().padStart(5, '0')}`;
  }

  // 仕入先の統計情報取得
  static async getSupplierStats(supplierId: string) {
    const db = await getDatabase();

    const supplierObjectId = new ObjectId(supplierId);

    // 発注書の統計
    const purchaseOrderStats = await db.collection('purchaseOrders').aggregate([
      { $match: { supplierId: supplierObjectId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { 
              $cond: [
                { $in: ['$status', ['sent', 'confirmed', 'partial']] }, 
                '$totalAmount', 
                0
              ] 
            }
          }
        }
      }
    ]).toArray();

    // 商品別の統計
    const productStats = await db.collection('purchaseOrders').aggregate([
      { $match: { supplierId: supplierObjectId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.itemName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.amount' },
          averagePrice: { $avg: '$items.unitPrice' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]).toArray();

    return {
      purchaseOrders: purchaseOrderStats[0] || {
        totalOrders: 0,
        totalAmount: 0,
        completedOrders: 0,
        pendingAmount: 0
      },
      topProducts: productStats
    };
  }
}