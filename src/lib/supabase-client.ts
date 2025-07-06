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
  const configured = !!(supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== DUMMY_URL && 
    supabaseAnonKey !== DUMMY_KEY);
  
  // デバッグ用ログ（本番環境では削除）
  if (typeof window !== 'undefined') {
    console.log('Supabase Config Check:', {
      configured,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlNotDummy: supabaseUrl !== DUMMY_URL,
      keyNotDummy: supabaseAnonKey !== DUMMY_KEY
    });
  }
  
  return configured;
};

// データベーステーブルの型定義
export interface Transaction {
  id?: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
  date: string;
  vendor: string;
  description: string;
  amount: number;
  tax_amount: number;
  tax_rate: number;
  debit_account: string;
  credit_account: string;
  receipt_url?: string;
  ocr_text?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface TransactionItem {
  id?: string;
  transaction_id: string;
  name: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
}

// トランザクション関連の操作
export const transactionService = {
  // トランザクションを作成
  async create(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabaseが設定されていません');
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`トランザクションの作成に失敗しました: ${error.message}`);
    }

    return data;
  },

  // トランザクション明細を作成
  async createItems(items: TransactionItem[]): Promise<TransactionItem[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabaseが設定されていません');
    }

    const { data, error } = await supabase
      .from('transaction_items')
      .insert(items)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`明細の作成に失敗しました: ${error.message}`);
    }

    return data;
  },

  // トランザクションを取得
  async getById(id: string): Promise<Transaction | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    return data;
  },

  // ユーザーのトランザクション一覧を取得
  async listByUser(userId: string, limit = 50): Promise<Transaction[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return data || [];
  },

  // トランザクションを更新
  async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabaseが設定されていません');
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`トランザクションの更新に失敗しました: ${error.message}`);
    }

    return data;
  }
};

// レポート関連の操作
export const reportService = {
  // 月次サマリーを取得
  async getMonthlySummary(userId: string, year: number, month: number) {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('transactions')
      .select('debit_account, amount, tax_amount')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    // 勘定科目別に集計
    const summary = (data || []).reduce((acc, transaction) => {
      const account = transaction.debit_account;
      if (!acc[account]) {
        acc[account] = {
          count: 0,
          amount: 0,
          taxAmount: 0
        };
      }
      acc[account].count += 1;
      acc[account].amount += transaction.amount;
      acc[account].taxAmount += transaction.tax_amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number; taxAmount: number }>);

    return summary;
  },

  // 税務レポート用データを取得
  async getTaxReport(userId: string, startDate: string, endDate: string) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return data || [];
  }
};

// ファイルアップロード関連の操作
export const storageService = {
  // レシート画像をアップロード
  async uploadReceipt(file: File, userId: string): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabaseが設定されていません');
    }

    const fileName = `${userId}/${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase
      .storage
      .from('receipts')
      .upload(fileName, file);

    if (error) {
      console.error('Storage error:', error);
      throw new Error(`ファイルのアップロードに失敗しました: ${error.message}`);
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase
      .storage
      .from('receipts')
      .getPublicUrl(fileName);

    return publicUrl;
  }
};