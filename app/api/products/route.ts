import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { logger } from '@/lib/logger';
import { 
  withErrorHandler, 
  validateRequired, 
  validatePagination,
  validateAmount,
  ApiErrorResponse 
} from '@/lib/unified-error-handler';
const productService = new ProductService();

// 商品一覧取得
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    
    // ページネーション
    const { page, limit, skip } = validatePagination(searchParams);
    
    // 検索クエリ
    const q = searchParams.get('q') || undefined;
    
    // ソート
    const sortBy = searchParams.get('sortBy') as 'productCode' | 'productName' | 'category' | 'unitPrice' | 'stockQuantity' | 'taxRate' | 'createdAt' || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    
    // フィルター
    const isActive = searchParams.get('isActive') === 'true' ? true : 
                     searchParams.get('isActive') === 'false' ? false : undefined;
    const category = searchParams.get('category') || undefined;
    const unitPriceMin = searchParams.get('unitPriceMin') ? parseInt(searchParams.get('unitPriceMin')!) : undefined;
    const unitPriceMax = searchParams.get('unitPriceMax') ? parseInt(searchParams.get('unitPriceMax')!) : undefined;
    const stockQuantityMin = searchParams.get('stockQuantityMin') ? parseInt(searchParams.get('stockQuantityMin')!) : undefined;
    const stockQuantityMax = searchParams.get('stockQuantityMax') ? parseInt(searchParams.get('stockQuantityMax')!) : undefined;
    const taxRates = searchParams.get('taxRates') ? searchParams.get('taxRates')!.split(',').map(rate => parseFloat(rate)) : undefined;
    const createdAtStart = searchParams.get('createdAtStart') || undefined;
    const createdAtEnd = searchParams.get('createdAtEnd') || undefined;

    // フィルター条件の構築
    const filters: any = {};
    
    if (isActive !== undefined) {
      filters.isActive = isActive;
    }
    
    if (category) {
      filters.category = category;
    }
    
    if (unitPriceMin !== undefined || unitPriceMax !== undefined) {
      filters.unitPrice = {};
      if (unitPriceMin !== undefined) filters.unitPrice.$gte = unitPriceMin;
      if (unitPriceMax !== undefined) filters.unitPrice.$lte = unitPriceMax;
    }
    
    if (stockQuantityMin !== undefined || stockQuantityMax !== undefined) {
      filters.stockQuantity = {};
      if (stockQuantityMin !== undefined) filters.stockQuantity.$gte = stockQuantityMin;
      if (stockQuantityMax !== undefined) filters.stockQuantity.$lte = stockQuantityMax;
    }
    
    if (taxRates && taxRates.length > 0) {
      filters.taxRate = { $in: taxRates };
    }
    
    if (createdAtStart || createdAtEnd) {
      filters.createdAt = {};
      if (createdAtStart) filters.createdAt.$gte = new Date(createdAtStart);
      if (createdAtEnd) {
        const endDate = new Date(createdAtEnd);
        endDate.setHours(23, 59, 59, 999);
        filters.createdAt.$lte = endDate;
      }
    }

    // 検索機能を使用（検索クエリがある場合）
    if (q) {
      const result = await productService.searchProducts({
        query: q,
        category,
        isActive,
        limit,
        skip
      });
      
      return NextResponse.json({
        products: result.products,
        total: result.total
      });
    }
    
    // 通常のフィルタリング（検索クエリがない場合）
    const result = await productService.getProductsWithFilters({
      filters,
      sortBy,
      sortOrder,
      limit,
      skip
    });

    return NextResponse.json({
      products: result.products,
      total: result.total
    });
});

// 商品新規作成
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    
    // 必須フィールドの検証
    validateRequired(body, ['productName', 'productCode', 'category', 'unit']);

    // 数値フィールドの検証
    if (!body.unitPrice || body.unitPrice <= 0) {
      throw new ApiErrorResponse('単価は0より大きい値を入力してください', 400, 'INVALID_UNIT_PRICE');
    }
    body.unitPrice = validateAmount(body.unitPrice);

    if (typeof body.taxRate !== 'number' || body.taxRate < 0 || body.taxRate > 1) {
      throw new ApiErrorResponse('税率は0から1の間の数値である必要があります（例: 0.10 = 10%）', 400, 'INVALID_TAX_RATE');
    }

    if (body.stockQuantity !== undefined) {
      body.stockQuantity = validateAmount(body.stockQuantity);
    }

    const productData = {
      productName: body.productName,
      productCode: body.productCode,
      productNameKana: body.productNameKana || '',
      description: body.description || '',
      unitPrice: body.unitPrice,
      taxRate: body.taxRate,
      category: body.category,
      stockQuantity: body.stockQuantity || 0,
      unit: body.unit,
      isActive: body.isActive !== undefined ? body.isActive : true,
      notes: body.notes || '',
      tags: body.tags || []
    };

    try {
      const product = await productService.createProduct(productData);
      return NextResponse.json(product);
    } catch (error) {
      if (error instanceof Error && error.message === '商品コードが重複しています') {
        throw new ApiErrorResponse(error.message, 409, 'DUPLICATE_PRODUCT_CODE');
      }
      throw error;
    }
});