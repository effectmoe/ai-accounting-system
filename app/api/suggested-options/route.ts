import { NextRequest, NextResponse } from 'next/server';
import { SuggestedOptionService } from '@/services/suggested-option.service';
import { logger } from '@/lib/logger';
import { 
  withErrorHandler, 
  validateRequired,
  validatePagination,
  ApiErrorResponse 
} from '@/lib/unified-error-handler';
import { CreateSuggestedOptionRequest } from '@/types/suggested-option';

const suggestedOptionService = new SuggestedOptionService();

// おすすめオプション一覧取得
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  logger.debug('[API] GET /api/suggested-options called');
  
  // パラメータ取得
  const isActiveParam = searchParams.get('isActive');
  const isActive = isActiveParam === null ? undefined : isActiveParam === 'true';
  
  const sortBy = (searchParams.get('sortBy') as 'displayOrder' | 'createdAt' | 'title') || 'displayOrder';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  
  // ページネーション
  const { page, limit, skip } = validatePagination(searchParams);
  
  const options = {
    isActive,
    sortBy,
    sortOrder,
    limit,
    skip
  };
  
  logger.debug('[API] Query options:', options);
  
  const result = await suggestedOptionService.getSuggestedOptions(options);
  
  return NextResponse.json({
    suggestedOptions: result.suggestedOptions,
    total: result.total,
    page,
    limit
  });
});

// おすすめオプション新規作成
export const POST = withErrorHandler(async (request: NextRequest) => {
  logger.debug('[API] POST /api/suggested-options called');
  
  const body = await request.json();
  logger.debug('[API] Request body:', body);
  
  // 必須フィールドの検証
  const requiredFields = ['title', 'description', 'price', 'features', 'ctaText', 'ctaUrl'];
  validateRequired(body, requiredFields);
  
  // featuresが配列であることを確認
  if (!Array.isArray(body.features)) {
    throw new ApiErrorResponse('features must be an array', 400, 'INVALID_FEATURES');
  }
  
  // URLの簡単な検証
  if (body.ctaUrl && !body.ctaUrl.startsWith('http')) {
    throw new ApiErrorResponse('ctaUrl must be a valid URL starting with http', 400, 'INVALID_URL');
  }
  
  // 金額条件の検証
  if (body.minAmount !== undefined && body.maxAmount !== undefined) {
    if (body.minAmount > body.maxAmount) {
      throw new ApiErrorResponse('minAmount cannot be greater than maxAmount', 400, 'INVALID_AMOUNT_RANGE');
    }
  }
  
  const createData: CreateSuggestedOptionRequest = {
    title: body.title.trim(),
    description: body.description.trim(),
    price: body.price.trim(),
    features: body.features.map((f: string) => f.trim()),
    ctaText: body.ctaText.trim(),
    ctaUrl: body.ctaUrl.trim(),
    isActive: body.isActive,
    displayOrder: body.displayOrder,
    minAmount: body.minAmount,
    maxAmount: body.maxAmount
  };
  
  // TODO: 認証が実装されたら createdBy を設定
  const suggestedOption = await suggestedOptionService.createSuggestedOption(createData);
  
  logger.debug(`[API] Created suggested option: ${suggestedOption.title}`);
  
  return NextResponse.json(suggestedOption, { status: 201 });
});