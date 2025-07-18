import clientPromise from '../lib/mongodb';

async function migrateSupplierAddressFields() {
  console.log('Starting supplier address field migration...');
  
  try {
    const client = await clientPromise;
    const db = client.db('accounting-automation');
    const collection = db.collection('suppliers');

    // Find all suppliers with old 'address' field
    const suppliersWithOldAddress = await collection.find({
      address: { $exists: true }
    }).toArray();

    console.log(`Found ${suppliersWithOldAddress.length} suppliers with old address field`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const supplier of suppliersWithOldAddress) {
      try {
        // Prepare update object
        const updateFields: any = {
          address1: supplier.address,
          updatedAt: new Date()
        };

        // Add missing fields with empty strings if they don't exist
        if (!supplier.address2) updateFields.address2 = '';
        if (!supplier.postalCode) updateFields.postalCode = '';
        if (!supplier.fax) updateFields.fax = '';
        if (!supplier.website) updateFields.website = '';

        // Update the supplier
        const result = await collection.updateOne(
          { _id: supplier._id },
          {
            $set: updateFields,
            $unset: { address: "" } // Remove old address field
          }
        );

        if (result.modifiedCount > 0) {
          migratedCount++;
          console.log(`✓ Migrated supplier: ${supplier.name} (${supplier.supplierNumber})`);
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating supplier ${supplier.name}:`, error);
      }
    }

    // Check for suppliers missing the new fields
    const suppliersWithoutNewFields = await collection.find({
      $or: [
        { address1: { $exists: false } },
        { address2: { $exists: false } },
        { postalCode: { $exists: false } },
        { fax: { $exists: false } },
        { website: { $exists: false } }
      ]
    }).toArray();

    console.log(`\nFound ${suppliersWithoutNewFields.length} suppliers missing new fields`);

    // Add missing fields to these suppliers
    for (const supplier of suppliersWithoutNewFields) {
      try {
        const updateFields: any = { updatedAt: new Date() };
        
        if (!supplier.address1) updateFields.address1 = supplier.address || '';
        if (!supplier.address2) updateFields.address2 = '';
        if (!supplier.postalCode) updateFields.postalCode = '';
        if (!supplier.fax) updateFields.fax = '';
        if (!supplier.website) updateFields.website = '';

        const result = await collection.updateOne(
          { _id: supplier._id },
          { $set: updateFields }
        );

        if (result.modifiedCount > 0) {
          console.log(`✓ Added missing fields to: ${supplier.name} (${supplier.supplierNumber})`);
        }
      } catch (error) {
        console.error(`✗ Error updating supplier ${supplier.name}:`, error);
      }
    }

    console.log(`\nMigration completed!`);
    console.log(`- Suppliers migrated from old address field: ${migratedCount}`);
    console.log(`- Errors encountered: ${errorCount}`);

    // Final verification
    const verificationResults = await collection.aggregate([
      {
        $project: {
          _id: 0,
          hasOldAddress: { $cond: [{ $ifNull: ['$address', false] }, true, false] },
          hasAddress1: { $cond: [{ $ifNull: ['$address1', false] }, true, false] },
          hasAddress2: { $cond: [{ $ifNull: ['$address2', false] }, true, false] },
          hasPostalCode: { $cond: [{ $ifNull: ['$postalCode', false] }, true, false] },
          hasFax: { $cond: [{ $ifNull: ['$fax', false] }, true, false] },
          hasWebsite: { $cond: [{ $ifNull: ['$website', false] }, true, false] }
        }
      },
      {
        $group: {
          _id: null,
          totalSuppliers: { $sum: 1 },
          withOldAddress: { $sum: { $cond: ['$hasOldAddress', 1, 0] } },
          withAddress1: { $sum: { $cond: ['$hasAddress1', 1, 0] } },
          withAddress2: { $sum: { $cond: ['$hasAddress2', 1, 0] } },
          withPostalCode: { $sum: { $cond: ['$hasPostalCode', 1, 0] } },
          withFax: { $sum: { $cond: ['$hasFax', 1, 0] } },
          withWebsite: { $sum: { $cond: ['$hasWebsite', 1, 0] } }
        }
      }
    ]).toArray();

    console.log('\nVerification Results:');
    console.log(JSON.stringify(verificationResults[0], null, 2));

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateSupplierAddressFields();