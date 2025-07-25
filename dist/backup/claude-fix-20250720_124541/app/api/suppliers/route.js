"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supplier_service_1 = require("@/services/supplier.service");
const logger_1 = require("@/lib/logger");
// GET: 仕入先一覧取得
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const params = {
            status: searchParams.get('status'),
            search: searchParams.get('search') || undefined,
            page: searchParams.get('page') ? parseInt(searchParams.get('page')) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 20,
            sortBy: searchParams.get('sortBy') || 'companyName',
            sortOrder: (searchParams.get('sortOrder') || 'asc')
        };
        const result = await supplier_service_1.SupplierService.getSuppliers(params);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error fetching suppliers:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
    }
}
// POST: 仕入先作成
async function POST(request) {
    try {
        const data = await request.json();
        // 必須フィールドのバリデーション
        if (!data.companyName) {
            return server_1.NextResponse.json({ error: 'Company name is required' }, { status: 400 });
        }
        // 仕入先コードが指定されていない場合は自動生成
        if (!data.supplierCode) {
            data.supplierCode = await supplier_service_1.SupplierService.generateSupplierCode();
        }
        const supplier = await supplier_service_1.SupplierService.createSupplier(data);
        return server_1.NextResponse.json(supplier, { status: 201 });
    }
    catch (error) {
        logger_1.logger.error('Error creating supplier:', error);
        if (error.message === 'Supplier code already exists') {
            return server_1.NextResponse.json({ error: 'Supplier code already exists' }, { status: 409 });
        }
        return server_1.NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
    }
}
