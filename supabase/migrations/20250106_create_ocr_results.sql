-- OCR結果を保存するテーブル
CREATE TABLE IF NOT EXISTS ocr_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- ファイル情報
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  
  -- OCR結果
  ocr_text TEXT NOT NULL,
  
  -- 抽出された情報
  document_type TEXT,
  vendor TEXT,
  date DATE,
  amount DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2),
  
  -- メタデータ
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'completed',
  
  -- インデックス用
  UNIQUE(file_id)
);

-- インデックスの作成
CREATE INDEX idx_ocr_results_user_id ON ocr_results(user_id);
CREATE INDEX idx_ocr_results_date ON ocr_results(date);
CREATE INDEX idx_ocr_results_document_type ON ocr_results(document_type);

-- Row Level Security (RLS) の有効化
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Users can view own ocr results" ON ocr_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ocr results" ON ocr_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ocr results" ON ocr_results
  FOR UPDATE USING (auth.uid() = user_id);

-- 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ocr_results_updated_at BEFORE UPDATE ON ocr_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();