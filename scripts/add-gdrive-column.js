// Supabaseにgdrive_file_idカラムを追加するスクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGdriveColumn() {
  try {
    // SQL実行
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ocr_results 
        ADD COLUMN IF NOT EXISTS gdrive_file_id TEXT;
        
        CREATE INDEX IF NOT EXISTS idx_ocr_results_gdrive_file_id 
        ON ocr_results(gdrive_file_id);
      `
    });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✅ gdrive_file_idカラムを追加しました');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

addGdriveColumn();