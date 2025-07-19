import { NextRequest, NextResponse } from 'next/server';
import { SupplierService } from '@/services/supplier.service';

import { logger } from '@/lib/logger';
// GET: 仕入先詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('===== [Supplier API] GET Request Debug START =====');
    logger.debug('[1] Requested supplier ID:', params.id);
    
    const supplier = await SupplierService.getSupplierById(params.id);
    
    logger.debug('[2] Retrieved supplier data:', JSON.stringify({
      _id: supplier._id,
      id: supplier.id,
      supplierCode: supplier.supplierCode,
      companyName: supplier.companyName,
      email: supplier.email,
      phone: supplier.phone,
      fax: supplier.fax,
      address1: supplier.address1,
      address2: supplier.address2,
      postalCode: supplier.postalCode,
      prefecture: supplier.prefecture,
      city: supplier.city,
      status: supplier.status,
      notes: supplier.notes
    }, null, 2));
    
    logger.debug('[3] Field existence check:', {
      hasPhone: !!supplier.phone,
      phoneLength: supplier.phone?.length || 0,
      hasFax: !!supplier.fax,
      faxLength: supplier.fax?.length || 0,
      hasAddress1: !!supplier.address1,
      address1Length: supplier.address1?.length || 0,
      hasPostalCode: !!supplier.postalCode
    });
    
    logger.debug('===== [Supplier API] GET Request Debug END =====');
    
    return NextResponse.json(supplier);
  } catch (error: any) {
    logger.error('Error fetching supplier:', error);
    
    if (error.message === 'Supplier not found') {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

// PUT: 仕入先更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // _idフィールドを除外
    const { _id, id, ...updateData } = data;
    
    const supplier = await SupplierService.updateSupplier(params.id, updateData);
    return NextResponse.json(supplier);
  } catch (error: any) {
    logger.error('Error updating supplier:', error);
    
    if (error.message === 'Supplier not found') {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    
    if (error.message === 'Supplier code already exists') {
      return NextResponse.json(
        { error: 'Supplier code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// DELETE: 仕入先削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await SupplierService.deleteSupplier(params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Error deleting supplier:', error);
    
    if (error.message === 'Supplier not found') {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}