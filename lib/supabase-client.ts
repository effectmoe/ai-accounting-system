import { createClient } from '@supabase/supabase-js';

// サーバーサイドとクライアントサイドで使い分ける
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数が設定されていない場合のダミー値
const DUMMY_URL = 'https://dummy.supabase.co';
const DUMMY_KEY = 'dummy-key';

export const supabase = createClient(
  supabaseUrl || DUMMY_URL,
  supabaseAnonKey || DUMMY_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// Supabaseが正しく設定されているかチェック
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== DUMMY_URL && 
    supabaseAnonKey !== DUMMY_KEY);
};