import { getMongoClient } from '../lib/mongodb-client';

const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';

async function setupPurchaseSalesCollections() {
  console.log('🚀 仕入販売管理システムのコレクションをセットアップしています...');
  
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    // 仕入先コレクション
    console.log('📦 仕入先コレクションを作成しています...');
    const suppliersExists = await db.listCollections({ name: 'suppliers' }).hasNext();
    if (!suppliersExists) {
      await db.createCollection('suppliers');
      await db.collection('suppliers').createIndexes([
        { key: { supplierCode: 1 }, unique: true },
        { key: { companyName: 1 } },
        { key: { status: 1 } },
        { key: { email: 1 } },
        { key: { createdAt: -1 } }
      ]);
      console.log('✅ 仕入先コレクションを作成しました');
    } else {
      console.log('⏭️  仕入先コレクションは既に存在します');
    }
    
    // 商品仕入情報コレクション
    console.log('📦 商品仕入情報コレクションを作成しています...');
    const productSupplierInfoExists = await db.listCollections({ name: 'productSupplierInfo' }).hasNext();
    if (!productSupplierInfoExists) {
      await db.createCollection('productSupplierInfo');
      await db.collection('productSupplierInfo').createIndexes([
        { key: { productId: 1, supplierId: 1 }, unique: true },
        { key: { productId: 1 } },
        { key: { supplierId: 1 } },
        { key: { isPreferred: 1 } }
      ]);
      console.log('✅ 商品仕入情報コレクションを作成しました');
    } else {
      console.log('⏭️  商品仕入情報コレクションは既に存在します');
    }
    
    // 案件コレクション
    console.log('📦 案件コレクションを作成しています...');
    const dealsExists = await db.listCollections({ name: 'deals' }).hasNext();
    if (!dealsExists) {
      await db.createCollection('deals');
      await db.collection('deals').createIndexes([
        { key: { dealNumber: 1 }, unique: true },
        { key: { customerId: 1 } },
        { key: { status: 1 } },
        { key: { dealType: 1 } },
        { key: { startDate: -1 } },
        { key: { createdAt: -1 } }
      ]);
      console.log('✅ 案件コレクションを作成しました');
    } else {
      console.log('⏭️  案件コレクションは既に存在します');
    }
    
    // 仕入見積書コレクション
    console.log('📦 仕入見積書コレクションを作成しています...');
    const supplierQuotesExists = await db.listCollections({ name: 'supplierQuotes' }).hasNext();
    if (!supplierQuotesExists) {
      await db.createCollection('supplierQuotes');
      await db.collection('supplierQuotes').createIndexes([
        { key: { quoteNumber: 1 }, unique: true },
        { key: { supplierId: 1 } },
        { key: { dealId: 1 } },
        { key: { status: 1 } },
        { key: { issueDate: -1 } },
        { key: { createdAt: -1 } }
      ]);
      console.log('✅ 仕入見積書コレクションを作成しました');
    } else {
      console.log('⏭️  仕入見積書コレクションは既に存在します');
    }
    
    // 発注書コレクション
    console.log('📦 発注書コレクションを作成しています...');
    const purchaseOrdersExists = await db.listCollections({ name: 'purchaseOrders' }).hasNext();
    if (!purchaseOrdersExists) {
      await db.createCollection('purchaseOrders');
      await db.collection('purchaseOrders').createIndexes([
        { key: { purchaseOrderNumber: 1 }, unique: true },
        { key: { supplierId: 1 } },
        { key: { dealId: 1 } },
        { key: { status: 1 } },
        { key: { issueDate: -1 } },
        { key: { paymentStatus: 1 } },
        { key: { createdAt: -1 } }
      ]);
      console.log('✅ 発注書コレクションを作成しました');
    } else {
      console.log('⏭️  発注書コレクションは既に存在します');
    }
    
    // サンプルデータの挿入（必要に応じて）
    const suppliersCount = await db.collection('suppliers').countDocuments();
    if (suppliersCount === 0) {
      console.log('📝 サンプル仕入先データを挿入しています...');
      await db.collection('suppliers').insertMany([
        {
          supplierCode: 'SUP-00001',
          companyName: 'サンプル商事株式会社',
          companyNameKana: 'サンプルショウジカブシキガイシャ',
          postalCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          address1: '千代田1-1-1',
          phone: '03-1234-5678',
          email: 'info@sample-shoji.co.jp',
          paymentTerms: 30,
          paymentMethod: 'bank_transfer',
          status: 'active',
          creditLimit: 1000000,
          currentBalance: 0,
          totalPurchaseAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          supplierCode: 'SUP-00002',
          companyName: '株式会社テスト商会',
          companyNameKana: 'カブシキガイシャテストショウカイ',
          postalCode: '550-0001',
          prefecture: '大阪府',
          city: '大阪市北区',
          address1: '梅田2-2-2',
          phone: '06-1234-5678',
          email: 'info@test-shokai.co.jp',
          paymentTerms: 45,
          paymentMethod: 'invoice',
          status: 'active',
          creditLimit: 2000000,
          currentBalance: 0,
          totalPurchaseAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      console.log('✅ サンプル仕入先データを挿入しました');
    }
    
    console.log('🎉 仕入販売管理システムのセットアップが完了しました！');
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトを実行
setupPurchaseSalesCollections();