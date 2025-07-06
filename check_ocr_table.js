const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const supabaseUrl = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

// Service Roleクライアントを作成（テーブル構造の確認用）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOcrTable() {
  console.log('🔍 Checking OCR results table...');
  console.log(`URL: ${supabaseUrl}\n`);

  try {
    // テーブルからデータを取得しようとする（テーブルが存在するか確認）
    const { data, error, count } = await supabase
      .from('ocr_results')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table "ocr_results" does not exist');
        console.log('\nError details:', error.message);
        console.log('\n💡 To create the table, run the migration file:');
        console.log('   supabase/migrations/20250106_create_ocr_results.sql');
      } else {
        console.log('⚠️ Error accessing table:', error.message);
        console.log('Error code:', error.code);
      }
    } else {
      console.log('✅ Table "ocr_results" exists!');
      console.log(`📊 Total records: ${count || 0}`);
      
      // テーブル構造を確認するためのサンプルクエリ
      const { data: sample, error: sampleError } = await supabase
        .from('ocr_results')
        .select('*')
        .limit(1);
      
      if (!sampleError && sample) {
        console.log('\n📋 Table columns:');
        if (sample.length > 0) {
          Object.keys(sample[0]).forEach(key => {
            console.log(`- ${key}`);
          });
        } else {
          // 空のテーブルの場合、スキーマ情報を取得
          console.log('(Table is empty, showing expected columns from migration)');
          console.log('- id');
          console.log('- created_at');
          console.log('- updated_at');
          console.log('- file_id');
          console.log('- file_name');
          console.log('- ocr_text');
          console.log('- document_type');
          console.log('- vendor');
          console.log('- date');
          console.log('- amount');
          console.log('- tax_amount');
          console.log('- user_id');
          console.log('- status');
        }
        
        // amountカラムの存在を明示的に確認
        console.log('\n🔍 Checking for "amount" column...');
        const { data: testAmount, error: amountError } = await supabase
          .from('ocr_results')
          .select('amount')
          .limit(1);
        
        if (!amountError) {
          console.log('✅ "amount" column exists and is accessible');
        } else {
          console.log('❌ "amount" column is not accessible:', amountError.message);
        }
      }
    }

    // テストデータの挿入を試みる（開発環境のみ）
    console.log('\n🧪 Testing table write access...');
    const testData = {
      file_id: `test_${Date.now()}`,
      file_name: 'test_receipt.pdf',
      ocr_text: 'This is a test OCR result',
      document_type: 'receipt',
      vendor: 'Test Vendor',
      date: new Date().toISOString().split('T')[0],
      amount: 1000.50,
      tax_amount: 100.05,
      status: 'completed'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('ocr_results')
      .insert([testData])
      .select();

    if (insertError) {
      console.log('❌ Write test failed:', insertError.message);
      if (insertError.code === '42501') {
        console.log('   (This might be due to RLS policies)');
      }
    } else {
      console.log('✅ Write test successful!');
      console.log('   Created test record with ID:', insertData[0].id);
      
      // テストデータを削除
      const { error: deleteError } = await supabase
        .from('ocr_results')
        .delete()
        .eq('id', insertData[0].id);
      
      if (!deleteError) {
        console.log('   Test record cleaned up');
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

// 実行
checkOcrTable().catch(console.error);