-- 勘定科目マスターテーブル
CREATE TABLE IF NOT EXISTS account_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_code VARCHAR(10),
  level INTEGER NOT NULL,
  description TEXT,
  keywords TEXT[], -- AIが判定する際のキーワード
  examples TEXT[], -- 使用例
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 勘定科目推論履歴テーブル
CREATE TABLE IF NOT EXISTS account_inferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  inferred_account_code VARCHAR(10) NOT NULL REFERENCES account_categories(code),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT NOT NULL, -- AIの推論理由
  alternative_accounts JSONB, -- 他の候補 [{code, score, reason}]
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_account_code VARCHAR(10) REFERENCES account_categories(code),
  confirmed_by UUID,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_account_categories_code ON account_categories(code);
CREATE INDEX idx_account_categories_type ON account_categories(category_type);
CREATE INDEX idx_account_inferences_document ON account_inferences(document_id);
CREATE INDEX idx_account_inferences_confirmed ON account_inferences(is_confirmed);

-- 基本的な勘定科目マスターデータ
INSERT INTO account_categories (code, name, category_type, level, keywords, examples) VALUES
-- 資産
('1110', '現金', 'asset', 2, ARRAY['現金', 'キャッシュ', 'cash'], ARRAY['レジ現金', '小口現金']),
('1120', '普通預金', 'asset', 2, ARRAY['預金', '銀行', 'bank'], ARRAY['三菱UFJ銀行', 'みずほ銀行']),
('1210', '売掛金', 'asset', 2, ARRAY['売掛', '掛売', '請求'], ARRAY['〇〇商事への請求']),
('1310', '商品', 'asset', 2, ARRAY['商品', '在庫', '棚卸'], ARRAY['在庫商品']),

-- 負債
('2110', '買掛金', 'liability', 2, ARRAY['買掛', '仕入', '掛買'], ARRAY['仕入先への支払い']),
('2210', '未払金', 'liability', 2, ARRAY['未払', '経費', '支払予定'], ARRAY['クレジットカード未払い']),

-- 収益
('4110', '売上高', 'revenue', 2, ARRAY['売上', '販売', '収入'], ARRAY['商品売上', 'サービス売上']),
('4210', '受取利息', 'revenue', 2, ARRAY['利息', '利子', '金利'], ARRAY['預金利息']),

-- 費用（経費）
('5110', '仕入高', 'expense', 2, ARRAY['仕入', '商品仕入', '原価'], ARRAY['商品仕入れ']),
('5210', '給料手当', 'expense', 2, ARRAY['給与', '給料', '賃金', '人件費'], ARRAY['従業員給与']),
('5220', '法定福利費', 'expense', 2, ARRAY['社会保険', '厚生年金', '健康保険'], ARRAY['社会保険料']),
('5310', '旅費交通費', 'expense', 2, ARRAY['交通費', '電車', 'タクシー', '出張'], ARRAY['電車代', 'タクシー代']),
('5320', '接待交際費', 'expense', 2, ARRAY['接待', '飲食', '会食', 'ゴルフ'], ARRAY['取引先との会食']),
('5330', '会議費', 'expense', 2, ARRAY['会議', 'ミーティング', '打ち合わせ'], ARRAY['会議室利用料']),
('5410', '消耗品費', 'expense', 2, ARRAY['消耗品', '事務用品', '文具'], ARRAY['ボールペン', 'コピー用紙']),
('5420', '事務用品費', 'expense', 2, ARRAY['文房具', 'オフィス用品'], ARRAY['ノート', 'ファイル']),
('5510', '水道光熱費', 'expense', 2, ARRAY['電気', 'ガス', '水道', '光熱費'], ARRAY['電気代', 'ガス代']),
('5520', '通信費', 'expense', 2, ARRAY['電話', 'インターネット', '携帯', '通信'], ARRAY['携帯電話料金']),
('5530', '賃借料', 'expense', 2, ARRAY['家賃', '賃料', 'オフィス', '事務所'], ARRAY['事務所家賃']),
('5540', '保険料', 'expense', 2, ARRAY['保険', '損害保険', '生命保険'], ARRAY['火災保険料']),
('5610', '広告宣伝費', 'expense', 2, ARRAY['広告', '宣伝', 'PR', 'マーケティング'], ARRAY['Web広告費']),
('5710', '支払手数料', 'expense', 2, ARRAY['手数料', '振込手数料', '決済手数料'], ARRAY['銀行振込手数料']),
('5810', '租税公課', 'expense', 2, ARRAY['税金', '印紙', '自動車税'], ARRAY['印紙代', '固定資産税']),
('5910', '雑費', 'expense', 2, ARRAY['その他', '雑費', '少額'], ARRAY['その他経費']);

-- documentsテーブルに勘定科目を追加
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS account_code VARCHAR(10) REFERENCES account_categories(code),
ADD COLUMN IF NOT EXISTS account_inference_id UUID REFERENCES account_inferences(id);