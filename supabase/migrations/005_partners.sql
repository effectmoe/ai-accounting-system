-- Partners (取引先) table
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
  country VARCHAR(100) DEFAULT '日本',
  is_customer BOOLEAN DEFAULT false,
  is_supplier BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  bank_name VARCHAR(255),
  bank_branch VARCHAR(255),
  bank_account_type VARCHAR(50),
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(255),
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id, code)
);

-- Indexes
CREATE INDEX idx_partners_company_id ON partners(company_id);
CREATE INDEX idx_partners_name ON partners(name);
CREATE INDEX idx_partners_is_customer ON partners(is_customer);
CREATE INDEX idx_partners_is_supplier ON partners(is_supplier);

-- RLS Policies
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Partners policies
CREATE POLICY "Companies can view own partners" ON partners
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can create partners" ON partners
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update own partners" ON partners
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can delete own partners" ON partners
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );