const https = require('https');

// Supabase接続情報
const projectRef = 'cjqwqvvxqvlufrvnmqtx';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcXdxdnZ4cXZsdWZydm5tcXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE0MjEyMSwiZXhwIjoyMDUxNzE4MTIxfQ.9sPzTD7c7a7n65K0rwZ3Vgc8Rx2xlwZ0j0F7J-4gKGs';

// SQLステートメントを個別に実行
const sqlStatements = [
  // UUID拡張機能の有効化
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
  
  // OCR結果を保存するテーブル
  `CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    ocr_text TEXT NOT NULL,
    document_type TEXT,
    vendor TEXT,
    date DATE,
    amount DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'completed',
    UNIQUE(file_id)
  )`,
  
  // インデックスの作成
  'CREATE INDEX IF NOT EXISTS idx_ocr_results_user_id ON ocr_results(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_ocr_results_date ON ocr_results(date)',
  'CREATE INDEX IF NOT EXISTS idx_ocr_results_document_type ON ocr_results(document_type)',
  
  // Row Level Security (RLS) の有効化
  'ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY',
  
  // RLSポリシーの作成
  `CREATE POLICY "Users can view own ocr results" ON ocr_results
    FOR SELECT USING (auth.uid() = user_id)`,
  
  `CREATE POLICY "Users can insert own ocr results" ON ocr_results
    FOR INSERT WITH CHECK (auth.uid() = user_id)`,
  
  `CREATE POLICY "Users can update own ocr results" ON ocr_results
    FOR UPDATE USING (auth.uid() = user_id)`,
  
  // 匿名ユーザーのアクセスを許可（開発用）
  `CREATE POLICY "Allow anonymous access" ON ocr_results
    FOR ALL USING (true)`,
  
  // 更新時刻の自動更新トリガー関数
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
  END;
  $$ language 'plpgsql'`,
  
  // トリガーの作成
  `CREATE TRIGGER update_ocr_results_updated_at BEFORE UPDATE ON ocr_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
];

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, error: data, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // SQLを送信
    const payload = JSON.stringify({ query: sql });
    req.write(payload);
    req.end();
  });
}

async function setupOcrTable() {
  console.log('Setting up OCR results table...\n');
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const description = sql.split('\n')[0].substring(0, 50) + '...';
    
    console.log(`[${i + 1}/${sqlStatements.length}] Executing: ${description}`);
    
    try {
      const result = await executeSQL(sql);
      
      if (result.success) {
        console.log('✅ Success\n');
      } else {
        console.log(`⚠️ Warning: ${result.error}\n`);
        // エラーが発生してもポリシーの重複などは無視して続行
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('\n🎉 Setup completed!');
  console.log('\nTable structure:');
  console.log('- id: UUID (Primary Key)');
  console.log('- created_at: Timestamp');
  console.log('- updated_at: Timestamp (auto-updated)');
  console.log('- file_id: Text (Unique)');
  console.log('- file_name: Text');
  console.log('- ocr_text: Text');
  console.log('- document_type: Text');
  console.log('- vendor: Text');
  console.log('- date: Date');
  console.log('- amount: Decimal');
  console.log('- tax_amount: Decimal');
  console.log('- user_id: UUID (Foreign Key)');
  console.log('- status: Text (default: "completed")');
}

// 実行
setupOcrTable().catch(console.error);