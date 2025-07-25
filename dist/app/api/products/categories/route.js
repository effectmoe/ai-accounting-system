"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const product_service_1 = require("@/services/product.service");
const logger_1 = require("@/lib/logger");
const productService = new product_service_1.ProductService();
// カテゴリ一覧取得
async function GET(request) {
    try {
        const categories = await productService.getCategories();
        return server_1.NextResponse.json(categories);
    }
    catch (error) {
        logger_1.logger.error('カテゴリ一覧取得エラー:', error);
        return server_1.NextResponse.json({ error: 'カテゴリ一覧の取得に失敗しました' }, { status: 500 });
    }
}
