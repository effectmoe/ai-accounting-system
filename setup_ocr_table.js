const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase接続情報
const supabaseUrl = 'https://cjqwqvvxqvlufrvnmqtx.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcXdxdnZ4cXZsdWZydm5tcXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE0MjEyMSwiZXhwIjoyMDUxNzE4MTIxfQ.9sPzTD7c7a7n65K0rwZ3Vgc8Rx2xlwZ0j0F7J-4gKGs';

// Supabaseクライアントの作成
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createOcrTable() {
  try {
    // SQLファイルを読み込む
    const sql = fs.readFileSync('./create_ocr_table.sql', 'utf8');
    
    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // exec_sql関数が存在しない場合は、個別にSQLを実行
      console.log('exec_sql function not found, executing SQL statements individually...');
      
      // SQLを個別のステートメントに分割
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.from('_sql').insert({
            query: statement.trim() + ';'
          });
          
          if (stmtError) {
            console.error('Error executing statement:', stmtError);
          }
        }
      }
    }
    
    // テーブルが作成されたか確認
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'ocr_results');
    
    if (tableError) {
      console.error('Error checking table:', tableError);
    } else if (tables && tables.length > 0) {
      console.log('✅ Table "ocr_results" created successfully!');
    } else {
      console.log('⚠️ Table creation may have failed. Checking with direct query...');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// 実行
createOcrTable();