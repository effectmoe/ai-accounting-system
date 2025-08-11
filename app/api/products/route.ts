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
    
    // 詳細なリクエストログを追加
    console.log('=== 商品作成API ===');
    console.log('[API] Request method:', request.method);
    console.log('[API] Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('[API] Raw body received:', JSON.stringify(body, null, 2));
    console.log('[API] Body keys:', Object.keys(body));
    
    // 各フィールドの詳細確認
    Object.keys(body).forEach(key => {
        console.log(`[API] ${key}: ${JSON.stringify(body[key])} (type: ${typeof body[key]})`);
    });
    
    // 必須フィールドの検証前に確認
    const requiredFields = ['productName', 'productCode', 'category', 'unit'];
    console.log('[API] Checking required fields:', requiredFields);
    requiredFields.forEach(field => {
        const value = body[field];
        const exists = value !== undefined && value !== null && value !== '';
        console.log(`[API] Required field "${field}": ${exists ? 'OK' : 'MISSING'} (value: ${JSON.stringify(value)})`);
    });
    
    validateRequired(body, ['productName', 'productCode', 'category', 'unit']);

    // 数値フィールドの検証
    console.log('[API] Received body:', body);
    console.log('[API] unitPrice:', body.unitPrice, 'type:', typeof body.unitPrice);
    
    // unitPriceが文字列の場合も考慮
    const unitPrice = typeof body.unitPrice === 'string' ? parseFloat(body.unitPrice) : body.unitPrice;
    
    if (!unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
      console.error('[API] Invalid unitPrice:', body.unitPrice, '-> parsed:', unitPrice);
      throw new ApiErrorResponse('単価は0より大きい値を入力してください', 400, 'INVALID_UNIT_PRICE');
    }
    body.unitPrice = unitPrice;

    // 税率の検証（-1は内税、0は非課税/税込価格、0.08は8%、0.10は10%）
    console.log('[API] taxRate validation - value:', body.taxRate, 'type:', typeof body.taxRate);
    
    if (typeof body.taxRate !== 'number') {
      console.error('[API] taxRate is not a number:', body.taxRate);
      throw new ApiErrorResponse('税率は数値である必要があります', 400, 'INVALID_TAX_RATE_TYPE');
    }
    
    // 許可される税率値: -1（内税）、0（非課税）、0.08（軽減税率）、0.10（標準税率）
    const allowedTaxRates = [-1, 0, 0.08, 0.10];
    if (!allowedTaxRates.includes(body.taxRate)) {
      console.error('[API] Invalid taxRate value:', body.taxRate, 'allowed:', allowedTaxRates);
      throw new ApiErrorResponse(`税率は次の値のいずれかである必要があります: ${allowedTaxRates.join(', ')}`, 400, 'INVALID_TAX_RATE_VALUE');
    }

    if (body.stockQuantity !== undefined) {
      const stockQuantity = typeof body.stockQuantity === 'string' ? parseFloat(body.stockQuantity) : body.stockQuantity;
      body.stockQuantity = isNaN(stockQuantity) ? 0 : stockQuantity;
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

    console.log('[API] Final productData:', JSON.stringify(productData, null, 2));
    
    try {
      console.log('[API] Calling productService.createProduct...');
      const product = await productService.createProduct(productData);
      console.log('[API] Product created successfully:', product);
      return NextResponse.json(product);
    } catch (error) {
      console.error('[API] Error in createProduct:', error);
      if (error instanceof Error) {
        console.error('[API] Error message:', error.message);
        console.error('[API] Error stack:', error.stack);
        if (error.message === '商品コードが重複しています') {
          throw new ApiErrorResponse(error.message, 409, 'DUPLICATE_PRODUCT_CODE');
        }
      }
      throw error;
    }
});