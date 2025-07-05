-- Documents (見積書・請求書・納品書・領収書) table
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
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, document_number)
);

-- Document items (明細) table
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

-- Journal entries (仕訳) table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_number VARCHAR(50),
  description TEXT NOT NULL,
  
  -- Reference to source document
  source_document_id UUID REFERENCES documents(id),
  source_type VARCHAR(20) CHECK (source_type IN ('manual', 'ocr', 'import', 'document')),
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Journal entry lines (仕訳明細) table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL,
  
  -- Account information
  account_id UUID NOT NULL REFERENCES accounts(id),
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  
  -- Amounts
  debit_amount DECIMAL(15, 2) DEFAULT 0,
  credit_amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Tax information
  tax_rate DECIMAL(5, 4),
  tax_amount DECIMAL(15, 2),
  is_tax_included BOOLEAN DEFAULT true,
  
  -- Optional references
  partner_id UUID REFERENCES partners(id),
  department_id UUID REFERENCES departments(id),
  memo_tag_id UUID REFERENCES memo_tags(id),
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_amounts CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (debit_amount = 0 AND credit_amount > 0)
  )
);

-- OCR results (OCR結果) table
CREATE TABLE IF NOT EXISTS ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  file_url TEXT,
  
  -- OCR results
  extracted_text TEXT,
  confidence DECIMAL(3, 2),
  vendor_name VARCHAR(255),
  receipt_date DATE,
  total_amount DECIMAL(15, 2),
  tax_amount DECIMAL(15, 2),
  
  -- Parsed items (JSON)
  items JSONB,
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Generated journal entry
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Metadata
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_issue_date ON documents(issue_date);
CREATE INDEX idx_documents_partner_id ON documents(partner_id);
CREATE INDEX idx_documents_status ON documents(status);

CREATE INDEX idx_document_items_document_id ON document_items(document_id);

CREATE INDEX idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);

CREATE INDEX idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

CREATE INDEX idx_ocr_results_company_id ON ocr_results(company_id);
CREATE INDEX idx_ocr_results_status ON ocr_results(status);

-- RLS Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Companies can view own documents" ON documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can create documents" ON documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update own documents" ON documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Companies can manage document items" ON document_items
  FOR ALL
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE company_id IN (
        SELECT company_id FROM company_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Companies can manage journal entries" ON journal_entries
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can manage journal entry lines" ON journal_entry_lines
  FOR ALL
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries 
      WHERE company_id IN (
        SELECT company_id FROM company_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Companies can manage OCR results" ON ocr_results
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );