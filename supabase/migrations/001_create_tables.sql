-- トランザクションテーブル
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  vendor TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- 日本円（整数で保存）
  tax_amount INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC(4,2) NOT NULL DEFAULT 0.10,
  debit_account TEXT NOT NULL,
  credit_account TEXT NOT NULL,
  receipt_url TEXT,
  ocr_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- トランザクション明細テーブル
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER,
  amount INTEGER NOT NULL
);

-- インデックス
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE
  ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) を有効化
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成（ユーザーは自分のデータのみアクセス可能）
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid()::text = user_id);

-- transaction_itemsは対応するtransactionのuser_idで制御
CREATE POLICY "Users can view own transaction items" ON transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own transaction items" ON transaction_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own transaction items" ON transaction_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own transaction items" ON transaction_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.user_id = auth.uid()::text
    )
  );