"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
// Test endpoint to check supplier fields
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const supplierId = searchParams.get('id');
        const supplierCode = searchParams.get('code');
        let query = {};
        if (supplierId) {
            query._id = new mongodb_1.ObjectId(supplierId);
        }
        else if (supplierCode) {
            query.supplierCode = supplierCode;
        }
        else {
            // Get SUP-00013 by default
            query.supplierCode = 'SUP-00013';
        }
        const supplier = await mongodb_client_1.db.findOne('suppliers', query);
        if (!supplier) {
            return server_1.NextResponse.json({
                error: 'Supplier not found',
                query
            }, { status: 404 });
        }
        // Return detailed field information
        return server_1.NextResponse.json({
            supplier: {
                _id: supplier._id,
                supplierCode: supplier.supplierCode,
                companyName: supplier.companyName,
                email: supplier.email,
                phone: supplier.phone,
                fax: supplier.fax,
                website: supplier.website,
                address1: supplier.address1,
                address2: supplier.address2,
                postalCode: supplier.postalCode,
                status: supplier.status,
                notes: supplier.notes,
                createdAt: supplier.createdAt,
                updatedAt: supplier.updatedAt
            },
            fieldStatus: {
                hasFax: !!supplier.fax,
                hasWebsite: !!supplier.website,
                hasAddress1: !!supplier.address1,
                hasAddress2: !!supplier.address2,
                hasPostalCode: !!supplier.postalCode,
                hasPhone: !!supplier.phone,
                hasEmail: !!supplier.email
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error in GET /api/suppliers/test-fields:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch supplier', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
