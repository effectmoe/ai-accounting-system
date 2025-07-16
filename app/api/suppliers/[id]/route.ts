import { NextRequest, NextResponse } from 'next/server';
import { SupplierService } from '@/services/supplier.service';

// GET: 仕入先詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await SupplierService.getSupplierById(params.id);
    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    
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
    console.error('Error updating supplier:', error);
    
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
    console.error('Error deleting supplier:', error);
    
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