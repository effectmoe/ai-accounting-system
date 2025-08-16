import { NextRequest, NextResponse } from 'next/server';
import { SuggestedOptionService } from '@/services/suggested-option.service';
import { logger } from '@/lib/logger';
import { 
  withErrorHandler, 
  validateRequired,
  ApiErrorResponse 
} from '@/lib/unified-error-handler';

const suggestedOptionService = new SuggestedOptionService();

// 見積書の金額に応じたおすすめオプション取得
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  logger.debug('[API] GET /api/suggested-options/for-quote called');
  
  // パラメータ取得
  const amountParam = searchParams.get('amount');
  const limitParam = searchParams.get('limit');
  
  if (!amountParam) {
    throw new ApiErrorResponse('amount parameter is required', 400, 'MISSING_AMOUNT');
  }
  
  const amount = parseFloat(amountParam);
  if (isNaN(amount) || amount < 0) {
    throw new ApiErrorResponse('amount must be a valid positive number', 400, 'INVALID_AMOUNT');
  }
  
  const limit = limitParam ? parseInt(limitParam, 10) : 10;
  if (isNaN(limit) || limit < 1 || limit > 50) {
    throw new ApiErrorResponse('limit must be between 1 and 50', 400, 'INVALID_LIMIT');
  }
  
  logger.debug('[API] Query params:', { amount, limit });
  
  const options = await suggestedOptionService.getSuggestedOptionsForQuote({
    amount,
    isActive: true,
    limit
  });
  
  logger.debug(`[API] Found ${options.length} suggested options for amount ${amount}`);
  
  return NextResponse.json({
    suggestedOptions: options,
    amount,
    count: options.length
  });
});