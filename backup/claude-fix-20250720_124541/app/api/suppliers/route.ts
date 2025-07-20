import { NextRequest, NextResponse } from 'next/server';
import { SupplierService } from '@/services/supplier.service';
import { SupplierStatus } from '@/types/collections';

import { logger } from '@/lib/logger';
// GET: 仕入先一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params = {
      status: searchParams.get('status') as SupplierStatus | undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sortBy: searchParams.get('sortBy') || 'companyName',
      sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
    };

    const result = await SupplierService.getSuppliers(params);
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST: 仕入先作成
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 必須フィールドのバリデーション
    if (!data.companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // 仕入先コードが指定されていない場合は自動生成
    if (!data.supplierCode) {
      data.supplierCode = await SupplierService.generateSupplierCode();
    }

    const supplier = await SupplierService.createSupplier(data);
    
    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    logger.error('Error creating supplier:', error);
    
    if (error.message === 'Supplier code already exists') {
      return NextResponse.json(
        { error: 'Supplier code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}