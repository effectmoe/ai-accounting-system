import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('accounting-automation');
    const collection = db.collection('suppliers');

    // Create a test supplier with all new fields
    const testSupplier = {
      supplierNumber: `TEST-${Date.now()}`,
      name: 'Field Test Supplier',
      postalCode: '100-0001',
      address1: '東京都千代田区千代田1-1',
      address2: '皇居ビル5F',
      phone: '03-1234-5678',
      fax: '03-1234-5679',
      email: 'test@example.com',
      website: 'https://example.com',
      taxIdNumber: '1234567890123',
      paymentTerms: 'NET30',
      bankName: 'テスト銀行',
      branchName: '本店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolder: 'テスト株式会社',
      createdAt: new Date(),
      updatedAt: new Date(),
      testData: true,
      deploymentVersion: '1.0.1'
    };

    const result = await collection.insertOne(testSupplier);
    
    // Retrieve the created supplier to verify all fields
    const created = await collection.findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      message: 'Test supplier created successfully',
      supplier: created,
      fieldsCheck: {
        hasAddress1: 'address1' in (created || {}),
        hasAddress2: 'address2' in (created || {}),
        hasPostalCode: 'postalCode' in (created || {}),
        hasFax: 'fax' in (created || {}),
        hasWebsite: 'website' in (created || {}),
        hasOldAddressField: 'address' in (created || {})
      }
    });
  } catch (error) {
    console.error('Test supplier creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('accounting-automation');
    const collection = db.collection('suppliers');

    // Get recent test suppliers
    const testSuppliers = await collection
      .find({ testData: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Check field availability in existing suppliers
    const regularSuppliers = await collection
      .find({ testData: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const fieldAnalysis = regularSuppliers.map(supplier => ({
      id: supplier._id,
      name: supplier.name,
      createdAt: supplier.createdAt,
      hasAddress1: 'address1' in supplier,
      hasAddress2: 'address2' in supplier,
      hasPostalCode: 'postalCode' in supplier,
      hasFax: 'fax' in supplier,
      hasWebsite: 'website' in supplier,
      hasOldAddress: 'address' in supplier
    }));

    return NextResponse.json({
      testSuppliers,
      fieldAnalysis,
      summary: {
        totalTestSuppliers: testSuppliers.length,
        latestTestSupplier: testSuppliers[0] || null,
        deploymentVersion: '1.0.1'
      }
    });
  } catch (error) {
    console.error('Test supplier fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db('accounting-automation');
    const collection = db.collection('suppliers');

    // Delete all test suppliers
    const result = await collection.deleteMany({ testData: true });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} test suppliers`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Test supplier deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}