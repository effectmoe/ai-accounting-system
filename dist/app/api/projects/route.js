"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const filter = {};
        if (status)
            filter.status = status;
        const projects = await mongodb_client_1.db.findMany('projects', filter, {
            limit,
            sort: { updatedAt: -1 }
        });
        return server_1.NextResponse.json({ projects });
    }
    catch (error) {
        logger_1.logger.error('Projects API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { name, clientName, contractAmount, startDate, endDate } = body;
        // プロジェクトコード自動生成
        const projectCount = await mongodb_client_1.db.count('projects', {});
        const projectCode = `P${String(projectCount + 1).padStart(4, '0')}`;
        const project = {
            projectCode,
            name,
            client: {
                name: clientName,
                contact: '',
                address: ''
            },
            contract: {
                amount: contractAmount,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
                retentionRate: 10
            },
            costs: {
                materials: 0,
                labor: 0,
                subcontract: 0,
                other: 0
            },
            status: 'estimate',
            progressPercentage: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const savedProject = await mongodb_client_1.db.create('projects', project);
        return server_1.NextResponse.json({ project: savedProject });
    }
    catch (error) {
        logger_1.logger.error('Create project error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
