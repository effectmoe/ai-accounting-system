"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
const mongodb_1 = require("mongodb");
const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
// POST: アクティビティログを作成
async function POST(request) {
    logger_1.logger.info('Creating new activity log');
    try {
        const body = await request.json();
        const { type, entityType, entityId, userId, description, metadata, severity = 'low' } = body;
        if (!type || !description) {
            logger_1.logger.warn('Missing required fields for activity log');
            return server_1.NextResponse.json({ error: 'Type and description are required' }, { status: 400 });
        }
        const client = await (0, mongodb_client_1.getMongoClient)();
        const db = client.db(DB_NAME);
        // IPアドレスとユーザーエージェントを取得
        const ipAddress = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const activityLog = {
            type: type,
            entityType,
            entityId: entityId ? new mongodb_1.ObjectId(entityId) : undefined,
            userId,
            description,
            metadata,
            ipAddress,
            userAgent,
            severity,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        logger_1.logger.info('Inserting activity log:', {
            type: activityLog.type,
            entityType: activityLog.entityType,
            description: activityLog.description
        });
        const result = await db.collection('activityLogs').insertOne(activityLog);
        logger_1.logger.info('Activity log created successfully', {
            id: result.insertedId.toString(),
            type: activityLog.type
        });
        return server_1.NextResponse.json({
            id: result.insertedId.toString(),
            ...activityLog
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating activity log:', error);
        return server_1.NextResponse.json({ error: 'Failed to create activity log' }, { status: 500 });
    }
}
// GET: アクティビティログを取得
async function GET(request) {
    logger_1.logger.info('Fetching activity logs');
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');
        const type = searchParams.get('type');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const client = await (0, mongodb_client_1.getMongoClient)();
        const db = client.db(DB_NAME);
        // フィルター条件を構築
        const filter = {};
        if (entityType) {
            filter.entityType = entityType;
        }
        if (entityId) {
            filter.entityId = new mongodb_1.ObjectId(entityId);
        }
        if (type) {
            filter.type = type;
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }
        logger_1.logger.info('Activity log filter:', filter);
        // 総数を取得
        const total = await db.collection('activityLogs').countDocuments(filter);
        // アクティビティログを取得
        const activities = await db.collection('activityLogs')
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();
        logger_1.logger.info(`Found ${activities.length} activity logs out of ${total} total`);
        return server_1.NextResponse.json({
            activities: activities.map(activity => ({
                id: activity._id.toString(),
                ...activity,
                _id: undefined
            })),
            total,
            limit,
            offset
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching activity logs:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
    }
}
