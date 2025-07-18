import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// GET: Test endpoint to check supplier fields in database
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('id');
    
    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('suppliers');

    // Get raw document from MongoDB
    const supplier = await collection.findOne({ _id: new ObjectId(supplierId) });
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Return all fields to see what's actually stored
    return NextResponse.json({
      message: 'Raw supplier data from MongoDB',
      documentId: supplier._id.toString(),
      allFields: Object.keys(supplier).sort(),
      supplier: supplier,
      specificFields: {
        hasAddress1: 'address1' in supplier,
        address1Value: supplier.address1,
        hasAddress2: 'address2' in supplier,
        address2Value: supplier.address2,
        hasAddress: 'address' in supplier,
        addressValue: supplier.address,
        hasFax: 'fax' in supplier,
        faxValue: supplier.fax,
        hasPhone: 'phone' in supplier,
        phoneValue: supplier.phone
      }
    });
  } catch (error) {
    console.error('Error in test-fields endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier test data' },
      { status: 500 }
    );
  }
}