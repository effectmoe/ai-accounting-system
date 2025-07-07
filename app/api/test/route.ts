import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase-singleton';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const gasWebhookUrl = process.env.GAS_WEBHOOK_URL;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      configured: isSupabaseConfigured(),
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'not set',
      keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'not set'
    },
    gas: {
      hasWebhookUrl: !!gasWebhookUrl,
      webhookUrlPrefix: gasWebhookUrl ? gasWebhookUrl.substring(0, 50) + '...' : 'not set'
    }
  });
}