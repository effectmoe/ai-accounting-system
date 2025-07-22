import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      MONGODB_URI_exists: !!process.env.MONGODB_URI,
      MONGODB_URI_length: process.env.MONGODB_URI?.length || 0,
      USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
      NEXT_PUBLIC_USE_AZURE_MONGODB: process.env.NEXT_PUBLIC_USE_AZURE_MONGODB,
    },
    headers: Object.fromEntries(request.headers.entries()),
    url: request.url,
    nextUrl: {
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries())
    }
  };

  // Security: only return detailed info in development
  if (process.env.NODE_ENV === 'development') {
    debug.environment.MONGODB_URI_preview = process.env.MONGODB_URI 
      ? `${process.env.MONGODB_URI.substring(0, 20)}...${process.env.MONGODB_URI.substring(process.env.MONGODB_URI.length - 10)}`
      : 'undefined';
  }

  return NextResponse.json(debug);
}

export const runtime = 'nodejs';