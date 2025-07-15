-- AAM Accounting System Database Setup
-- Execute this SQL in Supabase Dashboard SQL Editor
-- URL: https://app.supabase.com/project/clqpfmroqcnvyxdzadln/sql/new

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_kana VARCHAR(255),
  tax_number VARCHAR(50),
  invoice_registration_number VARCHAR(50),
  fiscal_year_start INTEGER DEFAULT 4,
  address JSONB,
  contact_info JSONB,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert demo company
INSERT INTO companies (id, name, name_kana, tax_number, fiscal_year_start)
VALUES ('11111111-1111-1111-1111-111111111111', 'デモ会社', 'デモガイシャ', '1234567890123', 4)
ON CONFLICT (id) DO NOTHING;

-- 3. Create partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  kana_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  fax VARCHAR(100),
  address TEXT,
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Japan',
  is_customer BOOLEAN DEFAULT true,
  is_supplier BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_account_type VARCHAR(20),
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(100),
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('estimate', 'invoice', 'delivery_note', 'receipt')),
  document_number VARCHAR(50) NOT NULL,
  issue_date DATE NOT NULL,
  
  -- Partner information
  partner_id UUID REFERENCES partners(id),
  partner_name VARCHAR(255) NOT NULL,
  partner_address TEXT,
  partner_phone VARCHAR(100),
  partner_email VARCHAR(255),
  partner_postal_code VARCHAR(20),
  partner_registration_number VARCHAR(50),
  
  -- Document details
  project_name VARCHAR(255),
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  
  -- Optional fields
  valid_until DATE,
  due_date DATE,
  payment_method VARCHAR(50),
  payment_terms TEXT,
  notes TEXT,
  
  -- Bank information (for invoices)
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  bank_account_type VARCHAR(20),
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(100),
  
  -- Delivery information (for delivery notes)
  delivery_date DATE,
  delivery_location TEXT,
  
  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'paid', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  UNIQUE(company_id, document_number)
);

-- 5. Create document_items table
CREATE TABLE IF NOT EXISTS document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.10,
  amount DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_issue_date ON documents(issue_date);
CREATE INDEX IF NOT EXISTS idx_documents_partner_id ON documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_items_document_id ON document_items(document_id);

-- Verify tables were created
SELECT 'companies' as table_name, count(*) as record_count FROM companies
UNION ALL
SELECT 'partners' as table_name, count(*) as record_count FROM partners
UNION ALL
SELECT 'documents' as table_name, count(*) as record_count FROM documents
UNION ALL
SELECT 'document_items' as table_name, count(*) as record_count FROM document_items;