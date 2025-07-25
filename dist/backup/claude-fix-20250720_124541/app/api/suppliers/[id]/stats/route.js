"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supplier_service_1 = require("@/services/supplier.service");
const logger_1 = require("@/lib/logger");
// GET: 仕入先統計情報取得
async function GET(request, { params }) {
    try {
        const stats = await supplier_service_1.SupplierService.getSupplierStats(params.id);
        return server_1.NextResponse.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error fetching supplier stats:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch supplier stats' }, { status: 500 });
    }
}
