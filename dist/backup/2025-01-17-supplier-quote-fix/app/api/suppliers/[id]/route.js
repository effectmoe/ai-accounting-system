"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supplier_service_1 = require("@/services/supplier.service");
// GET: 仕入先詳細取得
async function GET(request, { params }) {
    try {
        const supplier = await supplier_service_1.SupplierService.getSupplierById(params.id);
        return server_1.NextResponse.json(supplier);
    }
    catch (error) {
        console.error('Error fetching supplier:', error);
        if (error.message === 'Supplier not found') {
            return server_1.NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
    }
}
// PUT: 仕入先更新
async function PUT(request, { params }) {
    try {
        const data = await request.json();
        // _idフィールドを除外
        const { _id, id, ...updateData } = data;
        const supplier = await supplier_service_1.SupplierService.updateSupplier(params.id, updateData);
        return server_1.NextResponse.json(supplier);
    }
    catch (error) {
        console.error('Error updating supplier:', error);
        if (error.message === 'Supplier not found') {
            return server_1.NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }
        if (error.message === 'Supplier code already exists') {
            return server_1.NextResponse.json({ error: 'Supplier code already exists' }, { status: 409 });
        }
        return server_1.NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
    }
}
// DELETE: 仕入先削除
async function DELETE(request, { params }) {
    try {
        const result = await supplier_service_1.SupplierService.deleteSupplier(params.id);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error('Error deleting supplier:', error);
        if (error.message === 'Supplier not found') {
            return server_1.NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
    }
}
