import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';

const productService = new ProductService();

// 商品一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive') === 'true' ? true : 
                     searchParams.get('isActive') === 'false' ? false : undefined;
    const category = searchParams.get('category') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined;
    const sortBy = searchParams.get('sortBy') as 'productName' | 'productCode' | 'category' | 'createdAt' || undefined;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || undefined;
    const q = searchParams.get('q'); // 検索クエリ

    // 検索クエリがある場合は検索機能を使用
    if (q) {
      const products = await productService.searchProducts(q);
      return NextResponse.json(products);
    }

    // 通常の一覧取得
    const products = await productService.getProducts({
      isActive,
      category,
      limit,
      skip,
      sortBy,
      sortOrder
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('商品一覧取得エラー:', error);
    return NextResponse.json(
      { error: '商品一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 商品新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 必須フィールドの検証
    if (!body.productName || !body.productCode || !body.category || !body.unit) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // 数値フィールドの検証
    if (typeof body.unitPrice !== 'number' || body.unitPrice < 0) {
      return NextResponse.json(
        { error: '単価は0以上の数値である必要があります' },
        { status: 400 }
      );
    }

    if (typeof body.taxRate !== 'number' || body.taxRate < 0 || body.taxRate > 1) {
      return NextResponse.json(
        { error: '税率は0から1の間の数値である必要があります' },
        { status: 400 }
      );
    }

    if (typeof body.stockQuantity !== 'number' || body.stockQuantity < 0) {
      return NextResponse.json(
        { error: '在庫数は0以上の数値である必要があります' },
        { status: 400 }
      );
    }

    const productData = {
      productName: body.productName,
      productCode: body.productCode,
      description: body.description || '',
      unitPrice: body.unitPrice,
      taxRate: body.taxRate,
      category: body.category,
      stockQuantity: body.stockQuantity,
      unit: body.unit,
      isActive: body.isActive !== undefined ? body.isActive : true,
      notes: body.notes || '',
      tags: body.tags || []
    };

    const product = await productService.createProduct(productData);
    return NextResponse.json(product);
  } catch (error) {
    console.error('商品作成エラー:', error);
    
    if (error instanceof Error && error.message === '商品コードが重複しています') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: '商品の作成に失敗しました' },
      { status: 500 }
    );
  }
}