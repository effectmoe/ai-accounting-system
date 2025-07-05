-- Seed data for Mastra Accounting Automation
-- This file contains sample data for development and testing

-- Insert test company
INSERT INTO companies (id, name, name_kana, tax_number, invoice_registration_number, fiscal_year_start, settings)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '株式会社サンプル商事', 'カブシキガイシャサンプルショウジ', '1234567890123', 'T1234567890123', 4, 
   '{"timezone": "Asia/Tokyo", "currency": "JPY", "language": "ja"}'::jsonb),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'テスト工業株式会社', 'テストコウギョウカブシキガイシャ', '9876543210987', 'T9876543210987', 4,
   '{"timezone": "Asia/Tokyo", "currency": "JPY", "language": "ja"}'::jsonb);

-- Insert chart of accounts
INSERT INTO accounts (company_id, code, name, name_kana, account_type, balance)
VALUES
  -- Assets (資産)
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '1110', '現金', 'ゲンキン', 'asset', 1000000),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '1120', '普通預金', 'フツウヨキン', 'asset', 5000000),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '1130', '売掛金', 'ウリカケキン', 'asset', 2000000),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '1140', '商品', 'ショウヒン', 'asset', 3000000),
  
  -- Liabilities (負債)
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '2110', '買掛金', 'カイカケキン', 'liability', 1500000),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '2120', '未払金', 'ミバライキン', 'liability', 500000),
  
  -- Equity (資本)
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '3110', '資本金', 'シホンキン', 'equity', 10000000),
  
  -- Revenue (収益)
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '4110', '売上高', 'ウリアゲダカ', 'revenue', 0),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '4120', '受取利息', 'ウケトリリソク', 'revenue', 0),
  
  -- Expenses (費用)
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '5110', '仕入高', 'シイレダカ', 'expense', 0),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '5210', '給料手当', 'キュウリョウテアテ', 'expense', 0),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '5220', '地代家賃', 'チダイヤチン', 'expense', 0),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '5230', '水道光熱費', 'スイドウコウネツヒ', 'expense', 0),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '5240', '通信費', 'ツウシンヒ', 'expense', 0),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '5250', '消耗品費', 'ショウモウヒンヒ', 'expense', 0),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, '5260', '交通費', 'コウツウヒ', 'expense', 0);

-- Insert sample transactions
INSERT INTO transactions (id, company_id, transaction_number, type, status, transaction_date, description)
VALUES
  ('660e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'TXN-2024-001', 'income', 'completed', '2024-01-15', '商品売上 - A社'),
  ('660e8400-e29b-41d4-a716-446655440002'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'TXN-2024-002', 'expense', 'completed', '2024-01-20', '事務用品購入'),
  ('660e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'TXN-2024-003', 'expense', 'completed', '2024-01-25', '1月分家賃支払い');

-- Insert transaction lines
INSERT INTO transaction_lines (transaction_id, account_id, debit_amount, credit_amount, description)
VALUES
  -- Transaction 1: 売上 (現金 100,000円の売上)
  ('660e8400-e29b-41d4-a716-446655440001'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '1110'), 
   110000, 0, '現金売上'),
  ('660e8400-e29b-41d4-a716-446655440001'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '4110'), 
   0, 100000, '商品売上高'),
  ('660e8400-e29b-41d4-a716-446655440001'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '2120'), 
   0, 10000, '消費税(10%)'),
   
  -- Transaction 2: 消耗品費 (普通預金から 5,500円支払い)
  ('660e8400-e29b-41d4-a716-446655440002'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '5250'), 
   5000, 0, '事務用品'),
  ('660e8400-e29b-41d4-a716-446655440002'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '2120'), 
   500, 0, '仮払消費税'),
  ('660e8400-e29b-41d4-a716-446655440002'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '1120'), 
   0, 5500, '普通預金支払い'),
   
  -- Transaction 3: 家賃 (普通預金から 110,000円支払い)
  ('660e8400-e29b-41d4-a716-446655440003'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '5220'), 
   100000, 0, '1月分事務所家賃'),
  ('660e8400-e29b-41d4-a716-446655440003'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '2120'), 
   10000, 0, '仮払消費税'),
  ('660e8400-e29b-41d4-a716-446655440003'::uuid, 
   (SELECT id FROM accounts WHERE company_id = '550e8400-e29b-41d4-a716-446655440001'::uuid AND code = '1120'), 
   0, 110000, '普通預金支払い');

-- Insert sample invoices
INSERT INTO invoices (company_id, invoice_number, transaction_id, issue_date, due_date, subtotal, tax_amount, total_amount, status)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'INV-2024-001', '660e8400-e29b-41d4-a716-446655440001'::uuid, 
   '2024-01-15', '2024-02-15', 100000, 10000, 110000, 'paid');

-- Create sample users for RLS testing (Note: In production, users would be created through Supabase Auth)
-- This is just for reference and won't actually create auth users
INSERT INTO company_users (company_id, user_id, role, permissions)
SELECT 
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '770e8400-e29b-41d4-a716-446655440001'::uuid,
  'admin',
  '{"all": true}'::jsonb
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'company_users'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date_range 
  ON transactions(company_id, transaction_date) 
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_accounts_active 
  ON accounts(company_id, is_active) 
  WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE companies IS '会社マスタテーブル - マルチテナント対応';
COMMENT ON TABLE accounts IS '勘定科目マスタ - 会社ごとの勘定科目体系';
COMMENT ON TABLE transactions IS '取引ヘッダー - 仕訳伝票の基本情報';
COMMENT ON TABLE transaction_lines IS '取引明細 - 借方貸方の詳細';
COMMENT ON TABLE invoices IS '請求書管理 - 適格請求書対応';

-- Verify data integrity
DO $$
DECLARE
  debit_total DECIMAL;
  credit_total DECIMAL;
BEGIN
  -- Check if debits equal credits for all transactions
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO debit_total, credit_total
  FROM transaction_lines;
  
  IF debit_total != credit_total THEN
    RAISE EXCEPTION 'Data integrity error: Total debits (%) do not equal total credits (%)', 
      debit_total, credit_total;
  END IF;
  
  RAISE NOTICE 'Seed data created successfully. Debits = Credits = %', debit_total;
END $$;