-- Add missing columns for freee import compatibility

-- Add display_name and meta_data to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS tax_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS meta_data JSONB;

-- Update display_name with existing name where null
UPDATE accounts 
SET display_name = name 
WHERE display_name IS NULL;

-- Add columns to customers table if missing
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS partner_name TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS segment1 TEXT,
ADD COLUMN IF NOT EXISTS segment2 TEXT,
ADD COLUMN IF NOT EXISTS segment3 TEXT;

-- Add missing columns to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS document_url TEXT;