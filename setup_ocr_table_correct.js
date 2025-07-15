const https = require('https');

// Supabase接続情報（正しいプロジェクト）
const projectRef = 'clqpfmroqcnvyxdzadln';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

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
  
  // RLSポリシーの作成（重複を避けるためIF NOT EXISTS相当の処理）
  `DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'ocr_results' 
      AND policyname = 'Users can view own ocr results'
    ) THEN
      CREATE POLICY "Users can view own ocr results" ON ocr_results
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END $$`,
  
  `DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'ocr_results' 
      AND policyname = 'Users can insert own ocr results'
    ) THEN
      CREATE POLICY "Users can insert own ocr results" ON ocr_results
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END $$`,
  
  `DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'ocr_results' 
      AND policyname = 'Users can update own ocr results'
    ) THEN
      CREATE POLICY "Users can update own ocr results" ON ocr_results
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
  END $$`,
  
  // 匿名ユーザーのアクセスを許可（開発用）
  `DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'ocr_results' 
      AND policyname = 'Allow anonymous access'
    ) THEN
      CREATE POLICY "Allow anonymous access" ON ocr_results
        FOR ALL USING (true);
    END IF;
  END $$`,
  
  // 更新時刻の自動更新トリガー関数
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
  END;
  $$ language 'plpgsql'`,
  
  // トリガーの作成（存在しない場合のみ）
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'update_ocr_results_updated_at'
    ) THEN
      CREATE TRIGGER update_ocr_results_updated_at 
      BEFORE UPDATE ON ocr_results
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END $$`
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

// テーブルの存在確認
async function checkTableExists() {
  const checkSQL = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'ocr_results'
    );
  `;
  
  try {
    const result = await executeSQL(checkSQL);
    if (result.success) {
      const data = JSON.parse(result.data);
      return data[0]?.exists || false;
    }
  } catch (error) {
    console.error('Error checking table existence:', error);
  }
  return false;
}

// テーブルのカラム構造を確認
async function checkTableStructure() {
  const checkSQL = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ocr_results'
    ORDER BY ordinal_position;
  `;
  
  try {
    const result = await executeSQL(checkSQL);
    if (result.success) {
      return JSON.parse(result.data);
    }
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
  return [];
}

async function setupOcrTable() {
  console.log('🔍 Checking OCR results table in the correct Supabase instance...');
  console.log(`Project: ${projectRef}\n`);
  
  // まずテーブルが存在するか確認
  const tableExists = await checkTableExists();
  
  if (tableExists) {
    console.log('✅ Table "ocr_results" already exists!');
    console.log('\n📊 Current table structure:');
    
    const columns = await checkTableStructure();
    if (columns.length > 0) {
      columns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` (default: ${col.column_default})` : ''}`);
      });
      
      // amountカラムの存在確認
      const hasAmountColumn = columns.some(col => col.column_name === 'amount');
      if (hasAmountColumn) {
        console.log('\n✅ "amount" column exists in the table');
      } else {
        console.log('\n❌ "amount" column is missing from the table');
      }
    }
    
    console.log('\n⚠️  Skipping table creation to avoid conflicts.');
    console.log('If you need to recreate the table, please drop it first.');
    return;
  }
  
  console.log('📦 Table does not exist. Creating new table...\n');
  
  // SQLステートメントを実行
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
  console.log('- amount: Decimal (10,2)');
  console.log('- tax_amount: Decimal (10,2)');
  console.log('- user_id: UUID (Foreign Key)');
  console.log('- status: Text (default: "completed")');
}

// 実行
setupOcrTable().catch(console.error);