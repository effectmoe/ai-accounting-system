import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    MONGODB_URI: process.env.MONGODB_URI ? 
      process.env.MONGODB_URI.replace(/:[^:@]+@/, ':***@') : 
      'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString()
  });
}