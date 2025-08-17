import { NextRequest, NextResponse } from 'next/server';
import { SuggestedOptionService } from '@/services/suggested-option.service';
import { logger } from '@/lib/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { displayOrder } = body;

    if (typeof displayOrder !== 'number' || displayOrder < 0) {
      return NextResponse.json(
        { error: 'Invalid display order' },
        { status: 400 }
      );
    }

    const service = new SuggestedOptionService();
    
    // 指定されたオプションの表示順を更新
    const updatedOption = await service.updateDisplayOrder(params.id, displayOrder);

    if (!updatedOption) {
      return NextResponse.json(
        { error: 'Option not found' },
        { status: 404 }
      );
    }

    logger.info(`Updated display order for option ${params.id} to ${displayOrder}`);

    return NextResponse.json({
      message: 'Display order updated successfully',
      option: updatedOption
    });
  } catch (error) {
    logger.error('Error updating display order:', error);
    return NextResponse.json(
      { error: 'Failed to update display order' },
      { status: 500 }
    );
  }
}