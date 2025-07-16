import { NextRequest, NextResponse } from 'next/server';
import { DealService } from '@/services/deal.service';

// GET: 案件詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deal = await DealService.getDealById(params.id);
    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error fetching deal:', error);
    
    if (error.message === 'Deal not found') {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

// PUT: 案件更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // _idフィールドを除外
    const { _id, id, ...updateData } = data;
    
    const deal = await DealService.updateDeal(params.id, updateData);
    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error updating deal:', error);
    
    if (error.message === 'Deal not found') {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}

// DELETE: 案件削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await DealService.deleteDeal(params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error deleting deal:', error);
    
    if (error.message === 'Deal not found') {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    );
  }
}

// POST: 案件アクティビティ追加
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, ...data } = await request.json();
    
    if (action === 'add-activity') {
      const result = await DealService.addActivity(params.id, data);
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error processing deal action:', error);
    
    if (error.message === 'Deal not found') {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process deal action' },
      { status: 500 }
    );
  }
}