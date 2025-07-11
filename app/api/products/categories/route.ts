import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';

const productService = new ProductService();

// カテゴリ一覧取得
export async function GET(request: NextRequest) {
  try {
    const categories = await productService.getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('カテゴリ一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'カテゴリ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}