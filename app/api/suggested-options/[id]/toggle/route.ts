import { NextRequest, NextResponse } from 'next/server';
import { SuggestedOptionService } from '@/services/suggested-option.service';
import { logger } from '@/lib/logger';
import { 
  withErrorHandler, 
  ApiErrorResponse 
} from '@/lib/unified-error-handler';

const suggestedOptionService = new SuggestedOptionService();

interface RouteParams {
  params: { id: string };
}

// おすすめオプションのアクティブ状態切り替え
export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const id = params.id;
  
  logger.debug(`[API] PUT /api/suggested-options/${id}/toggle called`);
  
  // TODO: 認証が実装されたら updatedBy を設定
  const suggestedOption = await suggestedOptionService.toggleActiveStatus(id);
  
  if (!suggestedOption) {
    throw new ApiErrorResponse('おすすめオプションが見つかりません', 404, 'NOT_FOUND');
  }
  
  logger.debug(`[API] Toggled active status for suggested option: ${id} -> ${suggestedOption.isActive}`);
  
  return NextResponse.json({
    id: suggestedOption._id,
    isActive: suggestedOption.isActive,
    message: `おすすめオプションを${suggestedOption.isActive ? '有効' : '無効'}にしました`
  });
});