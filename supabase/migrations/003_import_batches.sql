-- Import batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed'))
);

-- Import jobs table
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_file_type CHECK (file_type IN ('accounts', 'partners', 'transactions')),
  CONSTRAINT valid_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_import_batches_company_id ON import_batches(company_id);
CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_created_at ON import_batches(created_at DESC);
CREATE INDEX idx_import_jobs_batch_id ON import_jobs(batch_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);

-- RLS Policies
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Companies can view their own import batches
CREATE POLICY "Companies can view own import batches" ON import_batches
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Companies can create import batches
CREATE POLICY "Companies can create import batches" ON import_batches
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

-- Companies can view their own import jobs
CREATE POLICY "Companies can view own import jobs" ON import_jobs
  FOR SELECT
  USING (
    batch_id IN (
      SELECT id FROM import_batches 
      WHERE company_id IN (
        SELECT company_id FROM company_users 
        WHERE user_id = auth.uid()
      )
    )
  );