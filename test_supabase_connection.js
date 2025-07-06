const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const supabaseUrl = 'https://cjqwqvvxqvlufrvnmqtx.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcXdxdnZ4cXZsdWZydm5tcXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE0MjEyMSwiZXhwIjoyMDUxNzE4MTIxfQ.9sPzTD7c7a7n65K0rwZ3Vgc8Rx2xlwZ0j0F7J-4gKGs';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    
    // Supabaseクライアントの作成
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false
      }
    });
    
    // 1. テーブル一覧を取得
    console.log('\n1. Fetching table list...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      
      // 代替方法: 直接テーブルにアクセス
      console.log('\n2. Trying direct table access...');
      const { data, error, count } = await supabase
        .from('ocr_results')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Table access error:', error);
        
        if (error.message.includes('does not exist')) {
          console.log('\n❌ Table "ocr_results" does not exist.');
          console.log('\n📝 Please create the table using the following SQL in Supabase Dashboard:');
          console.log('\nGo to: ' + supabaseUrl + '/project/default/sql/new');
          console.log('\nThen paste and execute the SQL from create_ocr_table.sql file');
        }
      } else {
        console.log('✅ Table exists! Row count:', count);
      }
    } else {
      console.log('✅ Connected successfully!');
      console.log('Tables in public schema:', tables?.map(t => t.table_name).join(', '));
      
      const ocrTableExists = tables?.some(t => t.table_name === 'ocr_results');
      if (ocrTableExists) {
        console.log('\n✅ Table "ocr_results" exists!');
      } else {
        console.log('\n❌ Table "ocr_results" does not exist.');
        console.log('\n📝 Creating table now...');
        
        // テーブル作成を試みる
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ocr_results (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            file_id TEXT NOT NULL UNIQUE,
            file_name TEXT NOT NULL,
            ocr_text TEXT NOT NULL,
            document_type TEXT,
            vendor TEXT,
            date DATE,
            amount DECIMAL(10, 2),
            tax_amount DECIMAL(10, 2),
            user_id UUID,
            status TEXT DEFAULT 'completed'
          );
        `;
        
        // Supabase では直接SQLを実行できないため、Dashboard経由での実行を案内
        console.log('\nPlease execute the SQL from create_ocr_table.sql in Supabase Dashboard');
        console.log('URL: ' + supabaseUrl + '/project/default/sql/new');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// 実行
testConnection();