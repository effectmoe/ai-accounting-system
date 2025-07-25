"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const product_service_1 = require("@/services/product.service");
const productService = new product_service_1.ProductService();
// 商品詳細取得
async function GET(request, { params }) {
    try {
        const product = await productService.getProduct(params.id);
        if (!product) {
            return server_1.NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
        }
        return server_1.NextResponse.json(product);
    }
    catch (error) {
        console.error('商品取得エラー:', error);
        return server_1.NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
    }
}
// 商品更新
async function PUT(request, { params }) {
    try {
        const body = await request.json();
        // 数値フィールドの検証
        if (body.unitPrice !== undefined && (typeof body.unitPrice !== 'number' || body.unitPrice < 0)) {
            return server_1.NextResponse.json({ error: '単価は0以上の数値である必要があります' }, { status: 400 });
        }
        if (body.taxRate !== undefined && (typeof body.taxRate !== 'number' || body.taxRate < 0 || body.taxRate > 1)) {
            return server_1.NextResponse.json({ error: '税率は0から1の間の数値である必要があります' }, { status: 400 });
        }
        if (body.stockQuantity !== undefined && (typeof body.stockQuantity !== 'number' || body.stockQuantity < 0)) {
            return server_1.NextResponse.json({ error: '在庫数は0以上の数値である必要があります' }, { status: 400 });
        }
        const updateData = {};
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
            return server_1.NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
        }
        return server_1.NextResponse.json(product);
    }
    catch (error) {
        console.error('商品更新エラー:', error);
        if (error instanceof Error && error.message === '商品コードが重複しています') {
            return server_1.NextResponse.json({ error: error.message }, { status: 409 });
        }
        return server_1.NextResponse.json({ error: '商品の更新に失敗しました' }, { status: 500 });
    }
}
// 商品削除
async function DELETE(request, { params }) {
    try {
        const success = await productService.deleteProduct(params.id);
        if (!success) {
            return server_1.NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
        }
        return server_1.NextResponse.json({ message: '商品が削除されました' });
    }
    catch (error) {
        console.error('商品削除エラー:', error);
        return server_1.NextResponse.json({ error: '商品の削除に失敗しました' }, { status: 500 });
    }
}
