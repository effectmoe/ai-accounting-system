import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabaseクライアントのシングルトンインスタンス
let supabaseInstance: SupabaseClient | null = null;

// 環境変数が設定されていない場合のダミー値
const DUMMY_URL = 'https://dummy.supabase.co';
const DUMMY_KEY = 'dummy-key';

export function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DUMMY_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DUMMY_KEY;
    
    supabaseInstance = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: typeof window !== 'undefined',
          autoRefreshToken: typeof window !== 'undefined',
        }
      }
    );
  }
  
  return supabaseInstance;
}

// Supabaseが正しく設定されているかチェック
export const isSupabaseConfigured = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const configured = !!(supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== DUMMY_URL && 
    supabaseAnonKey !== DUMMY_KEY);
  
  // デバッグ用ログ（本番環境では削除）
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Supabase Config Check:', {
      configured,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    });
  }
  
  return configured;
};

// エクスポート
export const supabase = getSupabaseClient();