import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

import { logger } from '@/lib/logger';
const MONGODB_URI = process.env.MONGODB_URI;

export async function GET(request: NextRequest) {
  logger.debug('=== MongoDB Connection Test ===');
  logger.debug('MONGODB_URI set:', MONGODB_URI ? 'Yes' : 'No');
  logger.debug('MONGODB_URI value:', MONGODB_URI);
  
  if (!MONGODB_URI) {
    return NextResponse.json({ 
      success: false, 
      error: 'MONGODB_URI not set',
      env: process.env.NODE_ENV 
    });
  }

  let client: MongoClient | null = null;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('accounting-automation');
    const collections = await db.listCollections().toArray();
    
    logger.debug('MongoDB connection successful');
    logger.debug('Available collections:', collections.map(c => c.name));
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      collections: collections.map(c => c.name),
      uri: MONGODB_URI.replace(/:([^:@]+)@/, ':***@') // パスワード部分をマスク
    });
    
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      uri: MONGODB_URI.replace(/:([^:@]+)@/, ':***@')
    }, { status: 500 });
    
  } finally {
    if (client) {
      await client.close();
    }
  }
}