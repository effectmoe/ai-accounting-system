import { NextRequest, NextResponse } from 'next/server';
import { SuggestedOptionService } from '@/services/suggested-option.service';
import { logger } from '@/lib/logger';
import { 
  withErrorHandler, 
  ApiErrorResponse 
} from '@/lib/unified-error-handler';
import { UpdateSuggestedOptionRequest } from '@/types/suggested-option';

const suggestedOptionService = new SuggestedOptionService();

interface RouteParams {
  params: { id: string };
}

// おすすめオプション詳細取得
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const id = params.id;
  
  logger.debug(`[API] GET /api/suggested-options/${id} called`);
  
  const suggestedOption = await suggestedOptionService.getSuggestedOptionById(id);
  
  if (!suggestedOption) {
    throw new ApiErrorResponse('おすすめオプションが見つかりません', 404, 'NOT_FOUND');
  }
  
  return NextResponse.json(suggestedOption);
});

// おすすめオプション更新
export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const id = params.id;
  
  logger.debug(`[API] PUT /api/suggested-options/${id} called`);
  
  const body = await request.json();
  logger.debug('[API] Request body:', body);
  
  // featuresが配列であることを確認（提供された場合）
  if (body.features !== undefined && !Array.isArray(body.features)) {
    throw new ApiErrorResponse('features must be an array', 400, 'INVALID_FEATURES');
  }
  
  // URLの簡単な検証（提供された場合）
  if (body.ctaUrl && !body.ctaUrl.startsWith('http')) {
    throw new ApiErrorResponse('ctaUrl must be a valid URL starting with http', 400, 'INVALID_URL');
  }
  
  // 金額条件の検証
  if (body.minAmount !== undefined && body.maxAmount !== undefined) {
    if (body.minAmount > body.maxAmount) {
      throw new ApiErrorResponse('minAmount cannot be greater than maxAmount', 400, 'INVALID_AMOUNT_RANGE');
    }
  }
  
  const updateData: UpdateSuggestedOptionRequest = {};
  
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.description !== undefined) updateData.description = body.description.trim();
  if (body.price !== undefined) updateData.price = body.price.trim();
  if (body.features !== undefined) updateData.features = body.features.map((f: string) => f.trim());
  if (body.ctaText !== undefined) updateData.ctaText = body.ctaText.trim();
  if (body.ctaUrl !== undefined) updateData.ctaUrl = body.ctaUrl.trim();
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;
  if (body.minAmount !== undefined) updateData.minAmount = body.minAmount;
  if (body.maxAmount !== undefined) updateData.maxAmount = body.maxAmount;
  
  // TODO: 認証が実装されたら updatedBy を設定
  const suggestedOption = await suggestedOptionService.updateSuggestedOption(id, updateData);
  
  if (!suggestedOption) {
    throw new ApiErrorResponse('おすすめオプションが見つかりません', 404, 'NOT_FOUND');
  }
  
  logger.debug(`[API] Updated suggested option: ${suggestedOption.title}`);
  
  return NextResponse.json(suggestedOption);
});

// おすすめオプション削除
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const id = params.id;
  
  logger.debug(`[API] DELETE /api/suggested-options/${id} called`);
  
  const success = await suggestedOptionService.deleteSuggestedOption(id);
  
  if (!success) {
    throw new ApiErrorResponse('おすすめオプションが見つかりません', 404, 'NOT_FOUND');
  }
  
  logger.debug(`[API] Deleted suggested option: ${id}`);
  
  return NextResponse.json({ message: 'おすすめオプションを削除しました' });
});