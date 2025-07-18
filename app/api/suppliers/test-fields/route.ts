import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// Test endpoint to check supplier fields
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('id');
    const supplierCode = searchParams.get('code');
    
    let query: any = {};
    if (supplierId) {
      query._id = new ObjectId(supplierId);
    } else if (supplierCode) {
      query.supplierCode = supplierCode;
    } else {
      // Get SUP-00013 by default
      query.supplierCode = 'SUP-00013';
    }
    
    const supplier = await db.findOne('suppliers', query);
    
    if (!supplier) {
      return NextResponse.json({
        error: 'Supplier not found',
        query
      }, { status: 404 });
    }
    
    // Return detailed field information
    return NextResponse.json({
      supplier: {
        _id: supplier._id,
        supplierCode: supplier.supplierCode,
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone,
        fax: supplier.fax,
        website: supplier.website,
        address1: supplier.address1,
        address2: supplier.address2,
        postalCode: supplier.postalCode,
        status: supplier.status,
        notes: supplier.notes,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt
      },
      fieldStatus: {
        hasFax: !!supplier.fax,
        hasWebsite: !!supplier.website,
        hasAddress1: !!supplier.address1,
        hasAddress2: !!supplier.address2,
        hasPostalCode: !!supplier.postalCode,
        hasPhone: !!supplier.phone,
        hasEmail: !!supplier.email
      }
    });
  } catch (error) {
    console.error('Error in GET /api/suppliers/test-fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}