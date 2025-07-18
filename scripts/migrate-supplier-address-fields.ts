import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function migrateSupplierAddressFields() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db('accounting');
    const collection = db.collection('suppliers');

    // 1. まず全サプライヤーの現状を診断
    console.log('=== DIAGNOSTIC PHASE ===\n');
    
    const allSuppliers = await collection.find({}).toArray();
    console.log(`Total suppliers in database: ${allSuppliers.length}`);

    // フィールドの存在状況を集計
    let stats = {
      hasAddress: 0,
      hasAddress1: 0,
      hasAddress2: 0,
      hasFax: 0,
      hasPhone: 0,
      hasPostalCode: 0,
      needsMigration: 0
    };

    const migrationCandidates: any[] = [];

    for (const supplier of allSuppliers) {
      if ('address' in supplier) stats.hasAddress++;
      if ('address1' in supplier) stats.hasAddress1++;
      if ('address2' in supplier) stats.hasAddress2++;
      if ('fax' in supplier) stats.hasFax++;
      if ('phone' in supplier) stats.hasPhone++;
      if ('postalCode' in supplier) stats.hasPostalCode++;

      // address フィールドがあって address1 がない場合は移行対象
      if (supplier.address && !supplier.address1) {
        stats.needsMigration++;
        migrationCandidates.push(supplier);
      }
    }

    console.log('\nField existence statistics:');
    console.log(`- 'address' field: ${stats.hasAddress} suppliers`);
    console.log(`- 'address1' field: ${stats.hasAddress1} suppliers`);
    console.log(`- 'address2' field: ${stats.hasAddress2} suppliers`);
    console.log(`- 'fax' field: ${stats.hasFax} suppliers`);
    console.log(`- 'phone' field: ${stats.hasPhone} suppliers`);
    console.log(`- 'postalCode' field: ${stats.hasPostalCode} suppliers`);
    console.log(`\nNeed migration (address -> address1): ${stats.needsMigration} suppliers`);

    // 2. 最近作成されたサプライヤーを確認
    console.log('\n=== RECENT SUPPLIERS (Last 5) ===\n');
    
    const recentSuppliers = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    for (const supplier of recentSuppliers) {
      console.log(`\n${supplier.companyName} (ID: ${supplier._id})`);
      console.log(`  Created: ${supplier.createdAt || 'Unknown'}`);
      console.log(`  Fields:`);
      console.log(`    - address: ${supplier.address ? `"${supplier.address}"` : 'undefined'}`);
      console.log(`    - address1: ${supplier.address1 ? `"${supplier.address1}"` : 'undefined'}`);
      console.log(`    - fax: ${supplier.fax ? `"${supplier.fax}"` : 'undefined'}`);
      console.log(`    - phone: ${supplier.phone ? `"${supplier.phone}"` : 'undefined'}`);
      console.log(`    - postalCode: ${supplier.postalCode ? `"${supplier.postalCode}"` : 'undefined'}`);
      if (supplier.notes) {
        console.log(`    - notes: "${supplier.notes}"`);
      }
    }

    // 3. OCRで作成されたサプライヤーを特別に確認
    console.log('\n=== OCR-CREATED SUPPLIERS ===\n');
    
    const ocrSuppliers = await collection
      .find({ notes: { $regex: /OCR/i } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    if (ocrSuppliers.length === 0) {
      console.log('No OCR-created suppliers found');
    } else {
      console.log(`Found ${ocrSuppliers.length} OCR-created suppliers:\n`);
      
      for (const supplier of ocrSuppliers) {
        console.log(`${supplier.companyName} (ID: ${supplier._id})`);
        console.log(`  Created: ${supplier.createdAt || 'Unknown'}`);
        console.log(`  address1: ${supplier.address1 ? `"${supplier.address1}"` : 'undefined'}`);
        console.log(`  fax: ${supplier.fax ? `"${supplier.fax}"` : 'undefined'}`);
        console.log(`  phone: ${supplier.phone ? `"${supplier.phone}"` : 'undefined'}`);
        console.log('');
      }
    }

    // 4. 移行を実行
    if (stats.needsMigration > 0) {
      console.log('\n=== MIGRATION PHASE ===\n');
      console.log(`Migrating ${stats.needsMigration} suppliers...\n`);

      for (const supplier of migrationCandidates) {
        const updateResult = await collection.updateOne(
          { _id: supplier._id },
          {
            $set: { 
              address1: supplier.address,
              updatedAt: new Date()
            },
            $unset: { address: "" }
          }
        );

        console.log(`✓ Migrated: ${supplier.companyName} (${updateResult.modifiedCount} document modified)`);
      }
    } else {
      console.log('\n✓ No migration needed - all suppliers already have proper address1 field');
    }

    // 5. 移行後の確認
    console.log('\n=== POST-MIGRATION VERIFICATION ===\n');
    
    const postMigrationStats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          withAddress: { $sum: { $cond: [{ $ifNull: ['$address', false] }, 1, 0] } },
          withAddress1: { $sum: { $cond: [{ $ifNull: ['$address1', false] }, 1, 0] } },
          withFax: { $sum: { $cond: [{ $ifNull: ['$fax', false] }, 1, 0] } },
          withPhone: { $sum: { $cond: [{ $ifNull: ['$phone', false] }, 1, 0] } }
        }
      }
    ]).toArray();

    if (postMigrationStats.length > 0) {
      const stats = postMigrationStats[0];
      console.log(`Total suppliers: ${stats.totalCount}`);
      console.log(`With 'address' field (should be 0): ${stats.withAddress}`);
      console.log(`With 'address1' field: ${stats.withAddress1}`);
      console.log(`With 'fax' field: ${stats.withFax}`);
      console.log(`With 'phone' field: ${stats.withPhone}`);
    }

    console.log('\n✓ Diagnostic and migration completed successfully');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
migrateSupplierAddressFields();