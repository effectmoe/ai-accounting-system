-- Step 2: Create indexes and verify tables
-- Execute this AFTER step 1 is successful

-- Create indexes for performance
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