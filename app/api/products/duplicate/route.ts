import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { logger } from '@/lib/logger';
import { 
  withErrorHandler, 
  validateRequired, 
  ApiErrorResponse 
} from '@/lib/unified-error-handler';

const productService = new ProductService();

// 商品複製
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    
    console.log('=== 商品複製API ===');
    console.log('[DUPLICATE API] Request body:', JSON.stringify(body, null, 2));
    
    // 必須フィールドの検証
    validateRequired(body, ['productIds']);
    
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
        throw new ApiErrorResponse('複製する商品のIDが指定されていません', 400, 'INVALID_PRODUCT_IDS');
    }
    
    console.log('[DUPLICATE API] Duplicating products:', body.productIds);
    
    try {
        const duplicatedProducts = [];
        
        for (const productId of body.productIds) {
            console.log(`[DUPLICATE API] Processing product ID: ${productId}`);
            
            // 元商品を取得
            const originalProduct = await productService.getProduct(productId);
            if (!originalProduct) {
                console.warn(`[DUPLICATE API] Product not found: ${productId}`);
                continue;
            }
            
            // 複製用のデータを準備
            const duplicateData = {
                productName: `${originalProduct.productName} (コピー)`,
                productCode: await generateUniqueProductCode(originalProduct.productCode),
                productNameKana: originalProduct.productNameKana || '',
                description: originalProduct.description || '',
                unitPrice: originalProduct.unitPrice,
                taxRate: originalProduct.taxRate,
                category: originalProduct.category,
                stockQuantity: 0, // 複製時は在庫数を0にリセット
                unit: originalProduct.unit,
                isActive: originalProduct.isActive,
                notes: originalProduct.notes ? `${originalProduct.notes} (元商品より複製)` : '元商品より複製',
                tags: [...(originalProduct.tags || [])]
            };
            
            console.log('[DUPLICATE API] Creating duplicate product:', duplicateData);
            
            // 複製商品を作成
            const duplicatedProduct = await productService.createProduct(duplicateData);
            duplicatedProducts.push(duplicatedProduct);
            
            console.log(`[DUPLICATE API] Successfully duplicated product ${productId} -> ${duplicatedProduct._id}`);
        }
        
        console.log('[DUPLICATE API] All products duplicated successfully:', duplicatedProducts.length);
        
        return NextResponse.json({
            success: true,
            duplicatedProducts,
            count: duplicatedProducts.length,
            message: `${duplicatedProducts.length}件の商品を複製しました`
        });
        
    } catch (error) {
        console.error('[DUPLICATE API] Error during duplication:', error);
        if (error instanceof Error) {
            console.error('[DUPLICATE API] Error message:', error.message);
            console.error('[DUPLICATE API] Error stack:', error.stack);
        }
        throw error;
    }
});

// 一意な商品コードを生成する関数（英数字のみ使用）
async function generateUniqueProductCode(originalCode: string): Promise<string> {
    const productService = new ProductService();
    let attempt = 1;
    
    // 元のコードから英数字のみ抽出
    const cleanOriginalCode = originalCode.replace(/[^A-Za-z0-9-]/gi, '') || 'PROD';
    let newCode = `${cleanOriginalCode}-COPY`;
    
    while (attempt <= 10) {
        // 商品コードが既に存在するかチェック
        const existing = await productService.getProductByCode(newCode);
        if (!existing) {
            console.log(`[DUPLICATE API] Generated unique code: ${newCode}`);
            return newCode;
        }
        
        // 既に存在する場合は番号を増やして再試行
        attempt++;
        newCode = `${cleanOriginalCode}-COPY${attempt}`;
    }
    
    // 最後の手段として現在時刻を追加（英数字のみ）
    const timestamp = Date.now().toString().slice(-6);
    newCode = `${cleanOriginalCode}-COPY-${timestamp}`;
    console.log(`[DUPLICATE API] Generated timestamped unique code: ${newCode}`);
    return newCode;
}