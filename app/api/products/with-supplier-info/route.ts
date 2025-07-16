import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { ProductWithSupplierInfo } from '@/types/collections';

const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';

// GET: 仕入情報付き商品一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    if (productId) {
      // 特定商品の仕入情報を取得
      const product = await db.collection('products').findOne({ 
        _id: new ObjectId(productId) 
      });
      
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      // 仕入情報を取得
      const supplierInfo = await db.collection('productSupplierInfo')
        .aggregate([
          { $match: { productId: new ObjectId(productId) } },
          {
            $lookup: {
              from: 'suppliers',
              localField: 'supplierId',
              foreignField: '_id',
              as: 'supplier'
            }
          },
          { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } }
        ]).toArray();
      
      // 原価と利益率を計算
      let costPrice = 0;
      if (supplierInfo.length > 0) {
        // 優先仕入先または最安値の仕入価格を原価とする
        const preferredSupplier = supplierInfo.find(s => s.isPreferred);
        if (preferredSupplier) {
          costPrice = preferredSupplier.purchasePrice;
        } else {
          costPrice = Math.min(...supplierInfo.map(s => s.purchasePrice));
        }
      }
      
      const profitAmount = product.unitPrice - costPrice;
      const profitMargin = product.unitPrice > 0 
        ? (profitAmount / product.unitPrice) * 100 
        : 0;
      
      const result: ProductWithSupplierInfo = {
        ...product,
        id: product._id.toString(),
        supplierInfo,
        costPrice,
        profitAmount,
        profitMargin: Math.round(profitMargin * 100) / 100
      };
      
      return NextResponse.json(result);
    } else {
      // 全商品の仕入情報を取得
      const products = await db.collection('products')
        .find({})
        .toArray();
      
      const results = await Promise.all(products.map(async (product) => {
        const supplierInfo = await db.collection('productSupplierInfo')
          .aggregate([
            { $match: { productId: product._id } },
            {
              $lookup: {
                from: 'suppliers',
                localField: 'supplierId',
                foreignField: '_id',
                as: 'supplier'
              }
            },
            { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } }
          ]).toArray();
        
        let costPrice = 0;
        if (supplierInfo.length > 0) {
          const preferredSupplier = supplierInfo.find(s => s.isPreferred);
          if (preferredSupplier) {
            costPrice = preferredSupplier.purchasePrice;
          } else {
            costPrice = Math.min(...supplierInfo.map(s => s.purchasePrice));
          }
        }
        
        const profitAmount = product.unitPrice - costPrice;
        const profitMargin = product.unitPrice > 0 
          ? (profitAmount / product.unitPrice) * 100 
          : 0;
        
        return {
          ...product,
          id: product._id.toString(),
          supplierInfo,
          costPrice,
          profitAmount,
          profitMargin: Math.round(profitMargin * 100) / 100
        };
      }));
      
      return NextResponse.json(results);
    }
  } catch (error) {
    console.error('Error fetching products with supplier info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products with supplier info' },
      { status: 500 }
    );
  }
}

// POST: 商品仕入情報の追加/更新
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.productId || !data.supplierId || !data.purchasePrice) {
      return NextResponse.json(
        { error: 'Product ID, Supplier ID, and purchase price are required' },
        { status: 400 }
      );
    }
    
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    // 既存の仕入情報をチェック
    const existing = await db.collection('productSupplierInfo').findOne({
      productId: new ObjectId(data.productId),
      supplierId: new ObjectId(data.supplierId)
    });
    
    const supplierInfo = {
      productId: new ObjectId(data.productId),
      supplierId: new ObjectId(data.supplierId),
      supplierProductCode: data.supplierProductCode,
      purchasePrice: data.purchasePrice,
      minimumOrderQuantity: data.minimumOrderQuantity,
      leadTimeDays: data.leadTimeDays,
      isPreferred: data.isPreferred || false,
      notes: data.notes,
      lastPurchaseDate: data.lastPurchaseDate ? new Date(data.lastPurchaseDate) : undefined,
      lastPurchasePrice: data.lastPurchasePrice,
      updatedAt: new Date()
    };
    
    if (existing) {
      // 更新
      await db.collection('productSupplierInfo').updateOne(
        { _id: existing._id },
        { $set: supplierInfo }
      );
    } else {
      // 新規作成
      await db.collection('productSupplierInfo').insertOne({
        ...supplierInfo,
        createdAt: new Date()
      });
    }
    
    // 優先仕入先フラグが設定されている場合、他の仕入先のフラグを解除
    if (data.isPreferred) {
      await db.collection('productSupplierInfo').updateMany(
        {
          productId: new ObjectId(data.productId),
          supplierId: { $ne: new ObjectId(data.supplierId) }
        },
        { $set: { isPreferred: false } }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product supplier info:', error);
    return NextResponse.json(
      { error: 'Failed to update product supplier info' },
      { status: 500 }
    );
  }
}

// DELETE: 商品仕入情報の削除
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const supplierId = searchParams.get('supplierId');
    
    if (!productId || !supplierId) {
      return NextResponse.json(
        { error: 'Product ID and Supplier ID are required' },
        { status: 400 }
      );
    }
    
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    const result = await db.collection('productSupplierInfo').deleteOne({
      productId: new ObjectId(productId),
      supplierId: new ObjectId(supplierId)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Product supplier info not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product supplier info:', error);
    return NextResponse.json(
      { error: 'Failed to delete product supplier info' },
      { status: 500 }
    );
  }
}