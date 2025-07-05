# Supabase マイグレーション実行ガイド

## 🎯 データベースセットアップ手順

### 方法1: Supabase ダッシュボードから直接実行（推奨）

最も簡単な方法は、Supabaseのダッシュボードから直接SQLを実行することです。

#### ステップ1: SQL Editorを開く
1. https://supabase.com/dashboard/project/clqpfmroqcnvyxdzadln にアクセス
2. 左メニューから「SQL Editor」をクリック

#### ステップ2: 初期スキーマを作成
「New query」をクリックして、以下のSQLを実行：

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For Japanese text search

-- Custom types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled', 'reconciled');
CREATE TYPE document_type AS ENUM ('invoice', 'receipt', 'bill', 'statement', 'report');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject');

-- Base tables
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_kana TEXT,
  tax_number TEXT UNIQUE,
  invoice_registration_number TEXT UNIQUE,
  fiscal_year_start INTEGER CHECK (fiscal_year_start BETWEEN 1 AND 12),
  address JSONB,
  contact_info JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  name_kana TEXT,
  account_type VARCHAR(50) NOT NULL,
  parent_account_id UUID REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  balance DECIMAL(15,2) DEFAULT 0,
  currency CHAR(3) DEFAULT 'JPY',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transaction_number VARCHAR(50) UNIQUE,
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'pending',
  transaction_date DATE NOT NULL,
  description TEXT,
  reference_number TEXT,
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(4,2),
  tax_amount DECIMAL(15,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_amounts CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  transaction_id UUID REFERENCES transactions(id),
  customer_id UUID,
  issue_date DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  invoice_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  reference_id UUID,
  reference_table TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  ocr_data JSONB,
  ocr_confidence DECIMAL(3,2),
  metadata JSONB,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  user_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_company_date ON transactions(company_id, transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status != 'completed';
CREATE INDEX idx_transaction_lines_account ON transaction_lines(account_id);
CREATE INDEX idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX idx_documents_reference ON documents(reference_id, reference_table);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Japanese text search indexes
CREATE INDEX idx_companies_name_trgm ON companies USING gin(name gin_trgm_ops);
CREATE INDEX idx_accounts_name_trgm ON accounts USING gin(name gin_trgm_ops);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

「Run」ボタンをクリックして実行。

#### ステップ3: サンプルデータの投入（オプション）
開発用にサンプルデータを投入する場合は、新しいクエリで以下を実行：

```sql
-- supabase/seed.sql の内容をコピーして実行
```

#### ステップ4: RLS（Row Level Security）の設定
セキュリティのため、以下のRLSを設定：

```sql
-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 開発中は一時的に全アクセスを許可（本番では適切なポリシーを設定）
CREATE POLICY "Allow all for development" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON transaction_lines FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON audit_logs FOR ALL USING (true);
```

### 方法2: Supabase CLIを使用（上級者向け）

CLIを使用する場合は、まずアクセストークンを設定：

```bash
# 1. Supabaseにログイン
supabase login

# 2. プロジェクトをリンク
supabase link --project-ref clqpfmroqcnvyxdzadln

# 3. マイグレーションを実行
supabase db push
```

### 確認方法

#### データベースの確認
1. Supabaseダッシュボードで「Table Editor」を開く
2. 以下のテーブルが作成されていることを確認：
   - companies
   - accounts
   - transactions
   - transaction_lines
   - invoices
   - documents
   - audit_logs

#### 接続テスト
```bash
npm run test:supabase
```

成功すると「companiesテーブルが存在します」と表示されます。

## トラブルシューティング

### エラー: permission denied for schema public
→ Supabaseダッシュボードから直接SQLを実行してください

### エラー: type "transaction_type" already exists
→ 既に型が作成されています。DROP TYPE IF EXISTS を使用するか、スキップしてください

### エラー: relation "companies" already exists
→ 既にテーブルが作成されています。必要に応じて DROP TABLE CASCADE を使用してください

## 次のステップ

1. **TypeScript型の生成**
   ```bash
   npm run generate:types
   ```

2. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

3. **アプリケーションの確認**
   - http://localhost:3000 にアクセス
   - データベース接続が正常に動作することを確認