-- サンプルデータ投入SQL
-- freeeの取引先データを参考にした実際のデータ構造

-- 会社情報の投入
INSERT INTO companies (id, name, name_kana, tax_number, invoice_registration_number, fiscal_year_start, settings, address, contact_info)
VALUES 
(
  '11111111-1111-1111-1111-111111111111'::uuid, 
  'トニーチュー・スタジオ',
  'トニーチュー・スタジオ',
  '1234567890123',
  'T1234567890123',
  4,
  '{"timezone": "Asia/Tokyo", "currency": "JPY", "language": "ja"}'::jsonb,
  '{"postal_code": "123-4567", "prefecture": "東京都", "city": "渋谷区", "address": "渋谷1-1-1"}'::jsonb,
  '{"phone": "03-1234-5678", "email": "info@tonychustudio.com"}'::jsonb
);

-- 勘定科目の投入（標準的な日本の会計科目）
INSERT INTO accounts (company_id, code, name, name_kana, account_type, balance) VALUES
-- 資産の部
('11111111-1111-1111-1111-111111111111'::uuid, '101', '現金', 'ゲンキン', 'asset', 500000),
('11111111-1111-1111-1111-111111111111'::uuid, '102', '普通預金', 'フツウヨキン', 'asset', 3000000),
('11111111-1111-1111-1111-111111111111'::uuid, '103', '売掛金', 'ウリカケキン', 'asset', 1200000),
('11111111-1111-1111-1111-111111111111'::uuid, '104', '未収入金', 'ミシュウニュウキン', 'asset', 150000),
('11111111-1111-1111-1111-111111111111'::uuid, '151', 'カメラ機材', 'カメラキザイ', 'asset', 800000),
('11111111-1111-1111-1111-111111111111'::uuid, '152', 'パソコン', 'パソコン', 'asset', 300000),
('11111111-1111-1111-1111-111111111111'::uuid, '153', 'ソフトウェア', 'ソフトウェア', 'asset', 200000),

-- 負債の部
('11111111-1111-1111-1111-111111111111'::uuid, '201', '買掛金', 'カイカケキン', 'liability', 400000),
('11111111-1111-1111-1111-111111111111'::uuid, '202', '未払金', 'ミバライキン', 'liability', 200000),
('11111111-1111-1111-1111-111111111111'::uuid, '203', '預り金', 'アズカリキン', 'liability', 50000),

-- 資本の部
('11111111-1111-1111-1111-111111111111'::uuid, '301', '資本金', 'シホンキン', 'equity', 1000000),
('11111111-1111-1111-1111-111111111111'::uuid, '302', '繰越利益剰余金', 'クリコシリエキジョウヨキン', 'equity', 2500000),

-- 収益の部
('11111111-1111-1111-1111-111111111111'::uuid, '401', '撮影売上', 'サツエイウリアゲ', 'revenue', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '402', 'Webデザイン売上', 'ウェブデザインウリアゲ', 'revenue', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '403', 'システム開発売上', 'システムカイハツウリアゲ', 'revenue', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '404', 'コンサルティング売上', 'コンサルティングウリアゲ', 'revenue', 0),

-- 費用の部
('11111111-1111-1111-1111-111111111111'::uuid, '501', '外注費', 'ガイチュウヒ', 'expense', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '502', '交通費', 'コウツウヒ', 'expense', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '503', '通信費', 'ツウシンヒ', 'expense', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '504', '消耗品費', 'ショウモウヒンヒ', 'expense', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '505', '家賃', 'ヤチン', 'expense', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '506', '水道光熱費', 'スイドウコウネツヒ', 'expense', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '507', '接待交際費', 'セッタイコウサイヒ', 'expense', 0),
('11111111-1111-1111-1111-111111111111'::uuid, '508', '広告宣伝費', 'コウコクセンデンヒ', 'expense', 0);

-- 顧客マスタ（取引先）
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  name_kana TEXT,
  type VARCHAR(50) DEFAULT 'corporate',
  tax_number TEXT,
  postal_code VARCHAR(8),
  prefecture TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  person_in_charge TEXT,
  payment_terms INTEGER DEFAULT 30,
  credit_limit DECIMAL(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, customer_code)
);

-- 取引先データの投入
INSERT INTO customers (company_id, customer_code, name, name_kana, type, postal_code, prefecture, city, address, phone, email, person_in_charge, payment_terms) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 'C001', '株式会社　トレーダー社', 'カブシキガイシャ　トレーダーシャ', 'corporate', '750-1114', '広島県', '呉市', '広島県呉市川尻町大原六丁目４番５０号', '', '', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C002', '株式会社ハリカ', 'カブシキガイシャハリカ', 'corporate', '173-8512', '東京都', '板橋区', '板橋区小豆沢一丁目４７番５号', '03-3579-3113', 's-kodaira@harika.co.jp', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C003', '株式会社　明エンタープライズ', 'カブシキガイシャ　アキエンタープライズ', 'corporate', '530-0015', '大阪府', '大阪市', '大阪市北区西天満4-3-32', '06-4802-8370', 'kakigi@aki-enterprise.co.jp', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C004', '有限会社セルサプライ', 'ユウゲンガイシャセルサプライ', 'corporate', '062-0003', '北海道', '札幌市', '札幌市白石区東札幌三条五丁目５-１８', '011-815-4211', 'm.tsuno@apg-aiplan.com', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C005', '株式会社ユマニテック', 'カブシキガイシャユマニテック', 'corporate', '715-0021', '岡山県', '井原市', '井原市上出部町41', '086-662-0991', 'm.inoue@ymmn.co.jp', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C006', 'クローマ', 'クローマ', 'individual', '', '', '', '', '', '', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C007', 'First Pure LLC', 'ファーストピュア', 'corporate', '', '', '', '', '', 'shop@first-pure.com', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C008', '株式会社ペイプランニングワークス', 'カブシキガイシャペイプランニングワークス', 'corporate', '', '', '', '', '', 'nagazumi@pei.co.jp', '', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C009', '株式会社ハタデコラティブアート', 'カブシキガイシャハタデコラティブアート', 'corporate', '', '', '', '', '', 'info@hataart.com', '畑田 宏幸', 30),
('11111111-1111-1111-1111-111111111111'::uuid, 'C010', '株式会社マーケットボックス', 'カブシキガイシャマーケットボックス', 'corporate', '', '', '', '', '', 'info@marketbox.jp', '', 30);

-- サンプル取引データ
INSERT INTO transactions (id, company_id, transaction_number, type, status, transaction_date, description) VALUES
('22222222-2222-2222-2222-222222222221'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'TXN-2024-001', 'income', 'completed', '2024-06-15', 'ウェディング撮影 - 株式会社ハリカ'),
('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'TXN-2024-002', 'income', 'completed', '2024-06-20', 'Webサイト制作 - 明エンタープライズ'),
('22222222-2222-2222-2222-222222222223'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'TXN-2024-003', 'expense', 'completed', '2024-06-25', '機材購入 - カメラレンズ'),
('22222222-2222-2222-2222-222222222224'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'TXN-2024-004', 'income', 'pending', '2024-07-01', 'システム開発 - マーケットボックス'),
('22222222-2222-2222-2222-222222222225'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'TXN-2024-005', 'expense', 'completed', '2024-07-03', '交通費 - 撮影現地移動');

-- 取引明細データ
INSERT INTO transaction_lines (transaction_id, account_id, debit_amount, credit_amount, tax_rate, tax_amount, description) VALUES
-- 取引1: ウェディング撮影売上 ¥200,000 + 消費税
('22222222-2222-2222-2222-222222222221'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '103'), 
 220000, 0, 0.10, 20000, '売掛金'),
('22222222-2222-2222-2222-222222222221'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '401'), 
 0, 200000, 0.10, 20000, '撮影売上'),
('22222222-2222-2222-2222-222222222221'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '202'), 
 0, 20000, 0.10, 20000, '仮受消費税'),

-- 取引2: Webサイト制作 ¥150,000 + 消費税
('22222222-2222-2222-2222-222222222222'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '103'), 
 165000, 0, 0.10, 15000, '売掛金'),
('22222222-2222-2222-2222-222222222222'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '402'), 
 0, 150000, 0.10, 15000, 'Webデザイン売上'),
('22222222-2222-2222-2222-222222222222'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '202'), 
 0, 15000, 0.10, 15000, '仮受消費税'),

-- 取引3: 機材購入 ¥80,000 + 消費税
('22222222-2222-2222-2222-222222222223'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '151'), 
 80000, 0, 0.10, 8000, 'カメラレンズ'),
('22222222-2222-2222-2222-222222222223'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '202'), 
 8000, 0, 0.10, 8000, '仮払消費税'),
('22222222-2222-2222-2222-222222222223'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '102'), 
 0, 88000, 0.10, 8000, '普通預金支払い'),

-- 取引4: システム開発（未完了）¥300,000 + 消費税
('22222222-2222-2222-2222-222222222224'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '103'), 
 330000, 0, 0.10, 30000, '売掛金'),
('22222222-2222-2222-2222-222222222224'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '403'), 
 0, 300000, 0.10, 30000, 'システム開発売上'),
('22222222-2222-2222-2222-222222222224'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '202'), 
 0, 30000, 0.10, 30000, '仮受消費税'),

-- 取引5: 交通費 ¥5,000 + 消費税
('22222222-2222-2222-2222-222222222225'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '502'), 
 5000, 0, 0.10, 500, '撮影現地交通費'),
('22222222-2222-2222-2222-222222222225'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '202'), 
 500, 0, 0.10, 500, '仮払消費税'),
('22222222-2222-2222-2222-222222222225'::uuid, 
 (SELECT id FROM accounts WHERE company_id = '11111111-1111-1111-1111-111111111111'::uuid AND code = '101'), 
 0, 5500, 0.10, 500, '現金支払い');

-- 請求書データ
INSERT INTO invoices (company_id, invoice_number, transaction_id, customer_id, issue_date, due_date, subtotal, tax_amount, total_amount, status) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 'INV-2024-001', '22222222-2222-2222-2222-222222222221'::uuid, 
 (SELECT id FROM customers WHERE customer_code = 'C002'), '2024-06-15', '2024-07-15', 200000, 20000, 220000, 'sent'),
('11111111-1111-1111-1111-111111111111'::uuid, 'INV-2024-002', '22222222-2222-2222-2222-222222222222'::uuid, 
 (SELECT id FROM customers WHERE customer_code = 'C003'), '2024-06-20', '2024-07-20', 150000, 15000, 165000, 'paid'),
('11111111-1111-1111-1111-111111111111'::uuid, 'INV-2024-003', '22222222-2222-2222-2222-222222222224'::uuid, 
 (SELECT id FROM customers WHERE customer_code = 'C010'), '2024-07-01', '2024-07-31', 300000, 30000, 330000, 'draft');

-- 商品・サービスマスタ
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_category VARCHAR(50) DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, product_code)
);

-- 商品データの投入
INSERT INTO products (company_id, product_code, name, description, unit_price, tax_category) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 'P001', 'ウェディング撮影', 'ウェディングフォト撮影（基本パッケージ）', 200000, 'standard'),
('11111111-1111-1111-1111-111111111111'::uuid, 'P002', 'Webサイト制作', 'コーポレートサイト制作（5ページまで）', 150000, 'standard'),
('11111111-1111-1111-1111-111111111111'::uuid, 'P003', 'システム開発', 'カスタムシステム開発（月額）', 300000, 'standard'),
('11111111-1111-1111-1111-111111111111'::uuid, 'P004', 'コンサルティング', 'IT戦略コンサルティング（1日）', 100000, 'standard'),
('11111111-1111-1111-1111-111111111111'::uuid, 'P005', '写真撮影（時間制）', '商品撮影・ポートレート撮影', 25000, 'standard');

-- データ整合性チェック
DO $$
DECLARE
  debit_total DECIMAL;
  credit_total DECIMAL;
BEGIN
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO debit_total, credit_total
  FROM transaction_lines;
  
  IF debit_total != credit_total THEN
    RAISE EXCEPTION 'Data integrity error: Total debits (%) do not equal total credits (%)', 
      debit_total, credit_total;
  END IF;
  
  RAISE NOTICE 'Sample data created successfully. Debits = Credits = %', debit_total;
END $$;