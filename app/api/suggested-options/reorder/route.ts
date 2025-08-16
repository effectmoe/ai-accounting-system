import { NextRequest, NextResponse } from 'next/server';
import { SuggestedOptionService } from '@/services/suggested-option.service';
import { logger } from '@/lib/logger';
import { 
  withErrorHandler, 
  validateRequired,
  ApiErrorResponse 
} from '@/lib/unified-error-handler';
import { ReorderSuggestedOptionsRequest } from '@/types/suggested-option';

const suggestedOptionService = new SuggestedOptionService();

// おすすめオプション並び替え
export const PUT = withErrorHandler(async (request: NextRequest) => {
  logger.debug('[API] PUT /api/suggested-options/reorder called');
  
  const body = await request.json();
  logger.debug('[API] Request body:', body);
  
  // 必須フィールドの検証
  validateRequired(body, ['items']);
  
  // itemsが配列であることを確認
  if (!Array.isArray(body.items)) {
    throw new ApiErrorResponse('items must be an array', 400, 'INVALID_ITEMS');
  }
  
  // 各アイテムが必要なフィールドを持っているか確認
  for (const item of body.items) {
    if (!item.id || typeof item.displayOrder !== 'number') {
      throw new ApiErrorResponse('Each item must have id and displayOrder', 400, 'INVALID_ITEM_FORMAT');
    }
  }
  
  const reorderData: ReorderSuggestedOptionsRequest = {
    items: body.items.map((item: any) => ({
      id: item.id,
      displayOrder: item.displayOrder
    }))
  };
  
  // TODO: 認証が実装されたら updatedBy を設定
  await suggestedOptionService.reorderSuggestedOptions(reorderData);
  
  logger.debug('[API] Reordered suggested options successfully');
  
  return NextResponse.json({ 
    message: 'おすすめオプションの並び替えが完了しました',
    itemsReordered: reorderData.items.length
  });
});