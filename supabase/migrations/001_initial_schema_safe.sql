-- Mastra Accounting System Initial Schema (Safe Version)
-- 既存のオブジェクトを安全に削除してから再作成します

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing objects safely
DO $$ 
BEGIN
    -- Drop indexes if they exist
    DROP INDEX IF EXISTS idx_transactions_company_date CASCADE;
    DROP INDEX IF EXISTS idx_transactions_status CASCADE;
    DROP INDEX IF EXISTS idx_documents_company_date CASCADE;
    DROP INDEX IF EXISTS idx_audit_logs_record CASCADE;
    DROP INDEX IF EXISTS idx_journal_entries_date CASCADE;
    DROP INDEX IF EXISTS idx_companies_name_trgm CASCADE;
    DROP INDEX IF EXISTS idx_accounts_name_trgm CASCADE;
    
    -- Drop tables if they exist (in correct order)
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS journal_entry_lines CASCADE;
    DROP TABLE IF EXISTS journal_entries CASCADE;
    DROP TABLE IF EXISTS documents CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS companies CASCADE;
    
    -- Drop types if they exist
    DROP TYPE IF EXISTS transaction_type CASCADE;
    DROP TYPE IF EXISTS transaction_status CASCADE;
    DROP TYPE IF EXISTS document_type CASCADE;
    DROP TYPE IF EXISTS audit_action CASCADE;
    
    -- Drop function if exists
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
END $$;

-- Create custom types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled', 'reconciled');
CREATE TYPE document_type AS ENUM ('invoice', 'receipt', 'bill', 'statement', 'report');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject');

-- Create base tables
CREATE TABLE companies (
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

CREATE TABLE accounts (
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

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transaction_number VARCHAR(50) UNIQUE,
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'pending',
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_number VARCHAR(50),
  type document_type NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  issue_date DATE,
  due_date DATE,
  partner_name TEXT,
  partner_info JSONB DEFAULT '{}',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  file_url TEXT,
  ocr_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, document_number)
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_number VARCHAR(50),
  entry_date DATE NOT NULL,
  description TEXT,
  source_type VARCHAR(50),
  source_id UUID,
  status VARCHAR(50) DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, entry_number)
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  tax_rate DECIMAL(5,4),
  tax_amount DECIMAL(15,2),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT check_debit_credit CHECK (
    (debit_amount = 0 AND credit_amount > 0) OR 
    (debit_amount > 0 AND credit_amount = 0)
  ),
  UNIQUE(journal_entry_id, line_number)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  user_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transactions_company_date ON transactions(company_id, transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status != 'completed';
CREATE INDEX idx_documents_company_date ON documents(company_id, issue_date DESC);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(company_id, entry_date DESC);
CREATE INDEX idx_companies_name_trgm ON companies USING gin(name gin_trgm_ops);
CREATE INDEX idx_accounts_name_trgm ON accounts USING gin(name gin_trgm_ops);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON companies
    FOR ALL USING (true);
    
CREATE POLICY "Enable all access for authenticated users" ON accounts
    FOR ALL USING (true);
    
CREATE POLICY "Enable all access for authenticated users" ON transactions
    FOR ALL USING (true);
    
CREATE POLICY "Enable all access for authenticated users" ON documents
    FOR ALL USING (true);
    
CREATE POLICY "Enable all access for authenticated users" ON journal_entries
    FOR ALL USING (true);
    
CREATE POLICY "Enable all access for authenticated users" ON journal_entry_lines
    FOR ALL USING (true);
    
CREATE POLICY "Enable read access for all users" ON audit_logs
    FOR SELECT USING (true);

-- Insert sample data
INSERT INTO companies (id, name, name_kana, tax_number, fiscal_year_start)
VALUES ('11111111-1111-1111-1111-111111111111', 'サンプル株式会社', 'サンプルカブシキガイシャ', '1234567890123', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert sample accounts
INSERT INTO accounts (company_id, code, name, name_kana, account_type) VALUES
('11111111-1111-1111-1111-111111111111', '1110', '現金', 'ゲンキン', 'asset'),
('11111111-1111-1111-1111-111111111111', '1140', '普通預金', 'フツウヨキン', 'asset'),
('11111111-1111-1111-1111-111111111111', '4110', '売上高', 'ウリアゲダカ', 'revenue'),
('11111111-1111-1111-1111-111111111111', '5110', '仕入高', 'シイレダカ', 'expense')
ON CONFLICT (company_id, code) DO NOTHING;