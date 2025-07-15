const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const supabaseUrl = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeOcrTable() {
  console.log('📊 Analyzing existing OCR results table structure...\n');

  try {
    // 1件のデータを取得して構造を確認
    const { data: sample, error } = await supabase
      .from('ocr_results')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    console.log('Current table columns:');
    console.log('====================');
    
    const columns = sample.length > 0 ? Object.keys(sample[0]) : [];
    
    // 期待されるカラムとのマッピング
    const columnMapping = {
      'file_id': 'id (現在は file_id ではなく id を使用)',
      'file_name': '✅ file_name (存在)',
      'ocr_text': 'extracted_text (ocr_text → extracted_text)',
      'document_type': '❌ document_type (存在しない)',
      'vendor': 'vendor_name (vendor → vendor_name)',
      'date': 'receipt_date (date → receipt_date)',
      'amount': 'total_amount (amount → total_amount)',
      'tax_amount': '✅ tax_amount (存在)',
      'user_id': 'created_by (user_id → created_by)',
      'status': '✅ status (存在)'
    };

    console.log('\n現在のカラム構造:');
    columns.forEach(col => {
      console.log(`  - ${col}`);
    });

    console.log('\n期待されるカラムとのマッピング:');
    console.log('================================');
    Object.entries(columnMapping).forEach(([expected, actual]) => {
      console.log(`${expected.padEnd(15)} → ${actual}`);
    });

    console.log('\n追加のカラム（期待されていないが存在）:');
    console.log('=====================================');
    const additionalColumns = [
      'company_id', 'file_size', 'file_type', 'file_url', 
      'confidence', 'items', 'error_message', 'journal_entry_id', 
      'processed_at', 'created_at'
    ];
    additionalColumns.forEach(col => {
      if (columns.includes(col)) {
        console.log(`  - ${col}`);
      }
    });

    // サンプルデータを表示
    if (sample.length > 0) {
      console.log('\nサンプルデータ:');
      console.log('==============');
      console.log(JSON.stringify(sample[0], null, 2));
    }

    console.log('\n📌 推奨事項:');
    console.log('===========');
    console.log('1. アプリケーションコードを現在のテーブル構造に合わせて修正する');
    console.log('   - amount → total_amount');
    console.log('   - ocr_text → extracted_text');
    console.log('   - vendor → vendor_name');
    console.log('   - date → receipt_date');
    console.log('   - user_id → created_by');
    console.log('   - file_id → id (または新規カラム追加)');
    console.log('\n2. または、必要なカラムを追加するマイグレーションを作成する');
    console.log('   - ALTER TABLE ocr_results ADD COLUMN document_type TEXT;');
    console.log('   - ALTER TABLE ocr_results ADD COLUMN file_id TEXT UNIQUE;');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// 実行
analyzeOcrTable().catch(console.error);