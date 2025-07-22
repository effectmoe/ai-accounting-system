import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('===== Test Journals API Start =====');
    
    // Step 1: Test MongoDB connection
    logger.info('Step 1: Testing MongoDB connection...');
    const testConnection = await db.count('journals', {});
    logger.info(`MongoDB connection successful. Journals count: ${testConnection}`);
    
    // Step 2: Try to fetch a few journals
    logger.info('Step 2: Fetching sample journals...');
    const sampleJournals = await db.find('journals', {}, { limit: 3 });
    logger.info(`Found ${sampleJournals.length} sample journals`);
    
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
    
    logger.info('===== Test Journals API Success =====');
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('===== Test Journals API Error =====');
    logger.error('Error:', error);
    
    return NextResponse.json({
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

export const runtime = 'nodejs';