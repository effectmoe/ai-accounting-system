"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supplier_service_1 = require("@/services/supplier.service");
const logger_1 = require("@/lib/logger");
// GET: 仕入先詳細取得
async function GET(request, { params }) {
    try {
        logger_1.logger.debug('===== [Supplier API] GET Request Debug START =====');
        logger_1.logger.debug('[1] Requested supplier ID:', params.id);
        const supplier = await supplier_service_1.SupplierService.getSupplierById(params.id);
        logger_1.logger.debug('[2] Retrieved supplier data:', JSON.stringify({
            _id: supplier._id,
            id: supplier.id,
            supplierCode: supplier.supplierCode,
            companyName: supplier.companyName,
            email: supplier.email,
            phone: supplier.phone,
            fax: supplier.fax,
            address1: supplier.address1,
            address2: supplier.address2,
            postalCode: supplier.postalCode,
            prefecture: supplier.prefecture,
            city: supplier.city,
            status: supplier.status,
            notes: supplier.notes
        }, null, 2));
        logger_1.logger.debug('[3] Field existence check:', {
            hasPhone: !!supplier.phone,
            phoneLength: supplier.phone?.length || 0,
            hasFax: !!supplier.fax,
            faxLength: supplier.fax?.length || 0,
            hasAddress1: !!supplier.address1,
            address1Length: supplier.address1?.length || 0,
            hasPostalCode: !!supplier.postalCode
        });
        logger_1.logger.debug('===== [Supplier API] GET Request Debug END =====');
        return server_1.NextResponse.json(supplier);
    }
    catch (error) {
        logger_1.logger.error('Error fetching supplier:', error);
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
        logger_1.logger.error('Error updating supplier:', error);
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
        logger_1.logger.error('Error deleting supplier:', error);
        if (error.message === 'Supplier not found') {
            return server_1.NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
    }
}
