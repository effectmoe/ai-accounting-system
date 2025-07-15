// OCRテーブルにgdrive_file_idカラムを追加する
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTable() {
  try {
    // ocr_resultsをアーカイブ機能対応のために更新
    console.log('OCRテーブルを更新します...');
    
    // gdrive_file_idを別のフィールド（file_urlなど）に保存する
    // 現在のテーブル構造に合わせて実装
    
    // テスト挿入
    const testData = {
      company_id: '11111111-1111-1111-1111-111111111111',
      file_name: 'test-gdrive-integration.jpg',
      vendor_name: 'Google Drive統合テスト',
      receipt_date: '2025-07-07',
      total_amount: 2000,
      tax_amount: 200,
      status: 'completed',
      extracted_text: 'Google Drive統合テスト',
      items: [{ name: 'テスト商品', price: 2000 }],
      file_type: 'image/jpeg',
      file_size: 2048,
      confidence: 0.99,
      file_url: 'gdrive://test-gdrive-file-id-789' // Google Drive IDをfile_urlフィールドに保存
    };
    
    const { data, error } = await supabase
      .from('ocr_results')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.error('テストデータ挿入エラー:', error);
    } else {
      console.log('テストデータ挿入成功:', data);
      
      // データを確認
      const { data: checkData } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('id', data.id)
        .single();
        
      console.log('挿入されたデータ:', checkData);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

updateTable();