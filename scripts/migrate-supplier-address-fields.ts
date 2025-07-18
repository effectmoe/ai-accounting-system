import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'accounting';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

async function migrateSupplierAddressFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const suppliersCollection = db.collection('suppliers');
    
    // address1フィールドを持つが、addressフィールドを持たない仕入先を検索
    const suppliersToMigrate = await suppliersCollection.find({
      address1: { $exists: true, $ne: null, $ne: '' },
      address: { $exists: false }
    }).toArray();
    
    console.log(`Found ${suppliersToMigrate.length} suppliers to migrate`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const supplier of suppliersToMigrate) {
      try {
        // address1の値をaddressフィールドにコピー
        const updateResult = await suppliersCollection.updateOne(
          { _id: supplier._id },
          { 
            $set: { 
              address: supplier.address1,
              updatedAt: new Date()
            }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          migratedCount++;
          console.log(`✓ Migrated supplier: ${supplier.companyName} (${supplier.supplierCode})`);
          console.log(`  address1: ${supplier.address1}`);
          console.log(`  → address: ${supplier.address1}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating supplier ${supplier.companyName}:`, error);
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total suppliers found: ${suppliersToMigrate.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    // 統計情報を表示
    const stats = await suppliersCollection.aggregate([
      {
        $group: {
          _id: null,
          totalSuppliers: { $sum: 1 },
          hasAddress1: { 
            $sum: { 
              $cond: [{ $and: [{ $ne: ['$address1', null] }, { $ne: ['$address1', ''] }] }, 1, 0] 
            } 
          },
          hasAddress: { 
            $sum: { 
              $cond: [{ $and: [{ $ne: ['$address', null] }, { $ne: ['$address', ''] }] }, 1, 0] 
            } 
          },
          hasFax: { 
            $sum: { 
              $cond: [{ $and: [{ $ne: ['$fax', null] }, { $ne: ['$fax', ''] }] }, 1, 0] 
            } 
          },
          hasEmail: { 
            $sum: { 
              $cond: [{ $and: [{ $ne: ['$email', null] }, { $ne: ['$email', ''] }] }, 1, 0] 
            } 
          },
          hasWebsite: { 
            $sum: { 
              $cond: [{ $and: [{ $ne: ['$website', null] }, { $ne: ['$website', ''] }] }, 1, 0] 
            } 
          }
        }
      }
    ]).toArray();
    
    if (stats.length > 0) {
      console.log('\n=== Database Statistics ===');
      console.log(`Total suppliers: ${stats[0].totalSuppliers}`);
      console.log(`Suppliers with address1: ${stats[0].hasAddress1}`);
      console.log(`Suppliers with address: ${stats[0].hasAddress}`);
      console.log(`Suppliers with fax: ${stats[0].hasFax}`);
      console.log(`Suppliers with email: ${stats[0].hasEmail}`);
      console.log(`Suppliers with website: ${stats[0].hasWebsite}`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// スクリプトを実行
migrateSupplierAddressFields().catch(console.error);