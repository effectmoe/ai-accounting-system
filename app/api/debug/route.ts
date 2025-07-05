import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase-client';

export async function GET() {
  const config = {
    supabaseConfigured: isSupabaseConfigured(),
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json(config);
}