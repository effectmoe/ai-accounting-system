import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('id');
    
    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const collection = db.collection('suppliers');
    
    // Get raw data from MongoDB
    const supplier = await collection.findOne({ _id: new ObjectId(supplierId) });
    
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    
    // Return detailed field information
    return NextResponse.json({
      supplierId: supplier._id.toString(),
      supplierCode: supplier.supplierCode,
      companyName: supplier.companyName,
      fields: {
        phone: {
          exists: 'phone' in supplier,
          value: supplier.phone,
          type: typeof supplier.phone,
          length: supplier.phone?.length || 0,
          isEmpty: supplier.phone === '',
          isNull: supplier.phone === null,
          isUndefined: supplier.phone === undefined
        },
        fax: {
          exists: 'fax' in supplier,
          value: supplier.fax,
          type: typeof supplier.fax,
          length: supplier.fax?.length || 0,
          isEmpty: supplier.fax === '',
          isNull: supplier.fax === null,
          isUndefined: supplier.fax === undefined
        },
        address: {
          exists: 'address' in supplier,
          value: supplier.address,
          type: typeof supplier.address
        },
        address1: {
          exists: 'address1' in supplier,
          value: supplier.address1,
          type: typeof supplier.address1,
          length: supplier.address1?.length || 0
        },
        address2: {
          exists: 'address2' in supplier,
          value: supplier.address2,
          type: typeof supplier.address2,
          length: supplier.address2?.length || 0
        }
      },
      rawData: supplier
    });
  } catch (error) {
    console.error('Error in test-fields:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}