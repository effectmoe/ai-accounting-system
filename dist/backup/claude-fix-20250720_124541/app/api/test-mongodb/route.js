"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
const MONGODB_URI = process.env.MONGODB_URI;
async function GET(request) {
    logger_1.logger.debug('=== MongoDB Connection Test ===');
    logger_1.logger.debug('MONGODB_URI set:', MONGODB_URI ? 'Yes' : 'No');
    logger_1.logger.debug('MONGODB_URI value:', MONGODB_URI);
    if (!MONGODB_URI) {
        return server_1.NextResponse.json({
            success: false,
            error: 'MONGODB_URI not set',
            env: process.env.NODE_ENV
        });
    }
    let client = null;
    try {
        client = new mongodb_1.MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('accounting-automation');
        const collections = await db.listCollections().toArray();
        logger_1.logger.debug('MongoDB connection successful');
        logger_1.logger.debug('Available collections:', collections.map(c => c.name));
        return server_1.NextResponse.json({
            success: true,
            message: 'MongoDB connection successful',
            collections: collections.map(c => c.name),
            uri: MONGODB_URI.replace(/:([^:@]+)@/, ':***@') // パスワード部分をマスク
        });
    }
    catch (error) {
        logger_1.logger.error('MongoDB connection error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            uri: MONGODB_URI.replace(/:([^:@]+)@/, ':***@')
        }, { status: 500 });
    }
    finally {
        if (client) {
            await client.close();
        }
    }
}
