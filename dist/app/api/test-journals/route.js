"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        logger_1.logger.info('===== Test Journals API Start =====');
        // Step 1: Test MongoDB connection
        logger_1.logger.info('Step 1: Testing MongoDB connection...');
        const testConnection = await mongodb_client_1.db.count('journals', {});
        logger_1.logger.info(`MongoDB connection successful. Journals count: ${testConnection}`);
        // Step 2: Try to fetch a few journals
        logger_1.logger.info('Step 2: Fetching sample journals...');
        const sampleJournals = await mongodb_client_1.db.find('journals', {}, { limit: 3 });
        logger_1.logger.info(`Found ${sampleJournals.length} sample journals`);
        // Step 3: Return detailed response
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: !!process.env.VERCEL,
                MONGODB_URI_exists: !!process.env.MONGODB_URI,
                USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB
            },
            data: {
                totalCount: testConnection,
                sampleCount: sampleJournals.length,
                sampleJournals: sampleJournals
            }
        };
        logger_1.logger.info('===== Test Journals API Success =====');
        return server_1.NextResponse.json(response);
    }
    catch (error) {
        logger_1.logger.error('===== Test Journals API Error =====');
        logger_1.logger.error('Error:', error);
        return server_1.NextResponse.json({
            success: false,
            timestamp: new Date().toISOString(),
            error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                type: error?.constructor?.name || 'Unknown',
                stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
            }
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
