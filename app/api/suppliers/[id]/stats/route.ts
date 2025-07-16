import { NextRequest, NextResponse } from 'next/server';
import { SupplierService } from '@/services/supplier.service';

// GET: 仕入先統計情報取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stats = await SupplierService.getSupplierStats(params.id);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching supplier stats:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch supplier stats' },
      { status: 500 }
    );
  }
}