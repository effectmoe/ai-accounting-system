import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';

import { logger } from '@/lib/logger';
const productService = new ProductService();

// 商品詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await productService.getProduct(params.id);
    
    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    logger.error('商品取得エラー:', error);
    return NextResponse.json(
      { error: '商品の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 商品更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // 数値フィールドの検証
    if (body.unitPrice !== undefined) {
      const unitPrice = typeof body.unitPrice === 'string' ? parseFloat(body.unitPrice) : body.unitPrice;
      if (isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { error: '単価は0以上の数値である必要があります' },
          { status: 400 }
        );
      }
      body.unitPrice = unitPrice;
    }

    // 税率の検証（-1は内税、0は非課税/税込価格、0.08は8%、0.10は10%）
    if (body.taxRate !== undefined) {
      if (typeof body.taxRate !== 'number' || (body.taxRate !== -1 && body.taxRate !== 0 && (body.taxRate < 0 || body.taxRate > 1))) {
        return NextResponse.json(
          { error: '税率は0から1の間の数値、または-1（内税）である必要があります' },
        { status: 400 }
      );
    }

    if (body.stockQuantity !== undefined) {
      const stockQuantity = typeof body.stockQuantity === 'string' ? parseFloat(body.stockQuantity) : body.stockQuantity;
      if (isNaN(stockQuantity) || stockQuantity < 0) {
        return NextResponse.json(
          { error: '在庫数は0以上の数値である必要があります' },
          { status: 400 }
        );
      }
      body.stockQuantity = stockQuantity;
    }

    const updateData: any = {};
    
    // 更新するフィールドのみを抽出
    const allowedFields = [
      'productName', 'productCode', 'description', 'unitPrice', 'taxRate',
      'category', 'stockQuantity', 'unit', 'isActive', 'notes', 'tags'
    ];
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const product = await productService.updateProduct(params.id, updateData);
    
    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    logger.error('商品更新エラー:', error);
    
    if (error instanceof Error && error.message === '商品コードが重複しています') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: '商品の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 商品削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await productService.deleteProduct(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '商品が削除されました' });
  } catch (error) {
    logger.error('商品削除エラー:', error);
    return NextResponse.json(
      { error: '商品の削除に失敗しました' },
      { status: 500 }
    );
  }
}