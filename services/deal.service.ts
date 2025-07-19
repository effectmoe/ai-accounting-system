import { ObjectId } from 'mongodb';
import { getMongoClient, db } from '@/lib/mongodb-client';
import { Deal, DealStatus, DealItem, DealActivity } from '@/types/collections';

const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';
const COLLECTION_NAME = 'deals';

export class DealService {
  // 案件一覧取得
  static async getDeals(params?: {
    status?: DealStatus;
    dealType?: 'sale' | 'purchase' | 'both';
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    dateRange?: { start: Date; end: Date };
  }) {
    const { 
      status, 
      dealType,
      customerId,
      search, 
      page = 1, 
      limit = 20, 
      sortBy = 'startDate', 
      sortOrder = 'desc',
      dateRange
    } = params || {};

    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection<Deal>(COLLECTION_NAME);

    // フィルター条件の構築
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (dealType) {
      filter.dealType = dealType;
    }
    if (customerId) {
      filter.customerId = new ObjectId(customerId);
    }
    if (search) {
      filter.$or = [
        { dealName: { $regex: search, $options: 'i' } },
        { dealNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (dateRange) {
      filter.startDate = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    // ソート条件
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // 顧客情報を含めて取得
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit }
    ];

    const [deals, total] = await Promise.all([
      collection.aggregate<Deal>(pipeline).toArray(),
      collection.countDocuments(filter)
    ]);

    return {
      deals: deals.map(deal => ({
        ...deal,
        id: deal._id?.toString()
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 案件詳細取得
  static async getDealById(id: string) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection<Deal>(COLLECTION_NAME);

    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      // 関連見積書の取得
      {
        $lookup: {
          from: 'quotes',
          localField: 'relatedQuotes',
          foreignField: '_id',
          as: 'quotesData'
        }
      },
      // 関連請求書の取得
      {
        $lookup: {
          from: 'invoices',
          localField: 'relatedInvoices',
          foreignField: '_id',
          as: 'invoicesData'
        }
      }
    ];

    const deals = await collection.aggregate<Deal>(pipeline).toArray();
    
    if (deals.length === 0) {
      throw new Error('Deal not found');
    }

    const deal = deals[0];

    // 商品情報を展開
    if (deal.items && deal.items.length > 0) {
      const productIds = deal.items
        .filter(item => item.productId)
        .map(item => item.productId!);

      if (productIds.length > 0) {
        const products = await db.collection('products')
          .find({ _id: { $in: productIds } })
          .toArray();

        const productMap = new Map(
          products.map(p => [p._id.toString(), p])
        );

        deal.items = deal.items.map(item => ({
          ...item,
          product: item.productId ? productMap.get(item.productId.toString()) : undefined
        }));
      }
    }

    return {
      ...deal,
      id: deal._id?.toString()
    };
  }

  // 案件作成
  static async createDeal(data: Omit<Deal, '_id' | 'createdAt' | 'updatedAt'>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection<Deal>(COLLECTION_NAME);

    // 案件番号の生成
    const dealNumber = await this.generateDealNumber();

    const now = new Date();
    const deal: Deal = {
      ...data,
      dealNumber,
      customerId: new ObjectId(data.customerId),
      status: data.status || 'lead',
      activities: [],
      createdAt: now,
      updatedAt: now
    };

    // 初期アクティビティの追加
    deal.activities?.push({
      id: new ObjectId().toString(),
      type: 'note',
      description: '案件を作成しました',
      createdBy: data.assignedTo || 'System',
      createdAt: now,
      metadata: { status: 'lead' }
    });

    const result = await db.create(COLLECTION_NAME, deal);
    
    return {
      ...result,
      id: result._id.toString()
    };
  }

  // 案件更新
  static async updateDeal(id: string, data: Partial<Omit<Deal, '_id' | 'createdAt'>>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection<Deal>(COLLECTION_NAME);

    // 現在の案件を取得
    const currentDeal = await collection.findOne({ _id: new ObjectId(id) });
    if (!currentDeal) {
      throw new Error('Deal not found');
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    // ObjectId型への変換
    if (data.customerId) {
      updateData.customerId = new ObjectId(data.customerId);
    }
    if (data.relatedQuotes) {
      updateData.relatedQuotes = data.relatedQuotes.map(id => new ObjectId(id));
    }
    if (data.relatedInvoices) {
      updateData.relatedInvoices = data.relatedInvoices.map(id => new ObjectId(id));
    }

    // ステータス変更の場合、アクティビティを追加
    if (data.status && data.status !== currentDeal.status) {
      const activity: DealActivity = {
        id: new ObjectId().toString(),
        type: 'status_change',
        description: `ステータスを「${currentDeal.status}」から「${data.status}」に変更しました`,
        createdBy: data.assignedTo || 'System',
        createdAt: new Date(),
        metadata: { 
          oldStatus: currentDeal.status, 
          newStatus: data.status 
        }
      };

      updateData.activities = [...(currentDeal.activities || []), activity];

      // ステータスに応じて日付を設定
      if (data.status === 'won' || data.status === 'lost') {
        updateData.actualCloseDate = new Date();
      }
    }

    // 利益計算
    if (data.items) {
      const { totalAmount, totalCost, profitAmount, profitMargin } = this.calculateProfit(data.items);
      updateData.actualValue = totalAmount;
      updateData.profitAmount = profitAmount;
      updateData.profitMargin = profitMargin;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('Deal not found');
    }

    return {
      ...result,
      id: result._id?.toString()
    };
  }

  // 案件削除
  static async deleteDeal(id: string) {
    const result = await db.delete(COLLECTION_NAME, id);
    
    if (!result) {
      throw new Error('Deal not found');
    }

    return { deleted: true };
  }

  // 案件番号の自動生成
  static async generateDealNumber() {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection<Deal>(COLLECTION_NAME);

    const year = new Date().getFullYear();
    const prefix = `DEAL-${year}-`;

    // 今年の最新の案件番号を取得
    const lastDeal = await collection
      .find({ dealNumber: { $regex: new RegExp(`^${prefix}\\d+$`) } })
      .sort({ dealNumber: -1 })
      .limit(1)
      .toArray();

    let nextNumber = 1;
    if (lastDeal.length > 0) {
      const match = lastDeal[0].dealNumber.match(new RegExp(`${prefix}(\\d+)`));
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  // 利益計算
  private static calculateProfit(items: DealItem[]) {
    let totalAmount = 0;
    let totalCost = 0;

    items.forEach(item => {
      const amount = item.quantity * item.unitPrice;
      const cost = item.quantity * (item.purchasePrice || 0);
      
      totalAmount += amount;
      totalCost += cost;
    });

    const profitAmount = totalAmount - totalCost;
    const profitMargin = totalAmount > 0 ? (profitAmount / totalAmount) * 100 : 0;

    return {
      totalAmount,
      totalCost,
      profitAmount,
      profitMargin: Math.round(profitMargin * 100) / 100 // 小数点2桁まで
    };
  }

  // 案件アクティビティ追加
  static async addActivity(dealId: string, activity: Omit<DealActivity, 'id' | 'createdAt'>) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection<Deal>(COLLECTION_NAME);

    const newActivity: DealActivity = {
      ...activity,
      id: new ObjectId().toString(),
      createdAt: new Date()
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(dealId) },
      { 
        $push: { activities: newActivity },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('Deal not found');
    }

    return {
      ...result,
      id: result._id?.toString()
    };
  }

  // 案件統計取得
  static async getDealStats(params?: {
    customerId?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection = db.collection<Deal>(COLLECTION_NAME);

    const filter: any = {};
    if (params?.customerId) {
      filter.customerId = new ObjectId(params.customerId);
    }
    if (params?.dateRange) {
      filter.startDate = {
        $gte: params.dateRange.start,
        $lte: params.dateRange.end
      };
    }

    const stats = await collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
          inProgress: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['lead', 'negotiation', 'quote_sent']] }, 
                1, 
                0
              ] 
            } 
          },
          totalValue: { $sum: '$actualValue' },
          totalProfit: { $sum: '$profitAmount' }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      total: 0,
      won: 0,
      lost: 0,
      inProgress: 0,
      totalValue: 0,
      totalProfit: 0
    };

    // 勝率計算
    const closedDeals = result.won + result.lost;
    result.winRate = closedDeals > 0 ? (result.won / closedDeals) * 100 : 0;
    result.averageDealSize = result.won > 0 ? result.totalValue / result.won : 0;

    return result;
  }
}