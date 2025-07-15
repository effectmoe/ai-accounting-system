// OCRテーブルに必要なカラムを追加するスクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOcrTable() {
  try {
    // まず現在のテーブル構造を確認
    const { data: existingData, error: selectError } = await supabase
      .from('ocr_results')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('テーブル確認エラー:', selectError);
    } else {
      console.log('現在のテーブル構造（サンプル）:', existingData);
    }
    
    // カラムを追加するSQL（Supabase SQLエディタで実行）
    console.log('\n以下のSQLをSupabase SQLエディタで実行してください:\n');
    console.log(`
-- gdrive_file_idカラムを追加
ALTER TABLE ocr_results 
ADD COLUMN IF NOT EXISTS gdrive_file_id TEXT;

-- extracted_dataカラムを追加（JSONB型）
ALTER TABLE ocr_results 
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}';

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_ocr_results_gdrive_file_id 
ON ocr_results(gdrive_file_id);

-- テーブル構造を確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ocr_results' 
ORDER BY ordinal_position;
    `);
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

updateOcrTable();