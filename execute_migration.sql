-- ========================
-- OCR結果テーブルに領収書関連のフィールドを追加
-- Migration: 20250107_add_receipt_fields.sql
-- ========================

-- まず ocr_results テーブルが存在するか確認
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ocr_results') THEN
        RAISE NOTICE 'Table ocr_results exists. Proceeding with migration...';
    ELSE
        RAISE EXCEPTION 'Table ocr_results does not exist. Please create the table first.';
    END IF;
END
$$;

-- 新しいカラムを追加
ALTER TABLE ocr_results
ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10, 2) DEFAULT 0,  -- 小計（税抜き）
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0,   -- お預かり金額
ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10, 2) DEFAULT 0,    -- お釣り
ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100),               -- 領収書番号
ADD COLUMN IF NOT EXISTS store_name VARCHAR(255),                   -- 店舗名
ADD COLUMN IF NOT EXISTS store_phone VARCHAR(50),                   -- 店舗電話番号
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),                 -- 会社名
ADD COLUMN IF NOT EXISTS notes TEXT;                                -- 備考

-- 既存のtotal_amountは税込み総合計として使用
-- 既存のtax_amountは消費税額として使用

-- カラムにコメントを追加
COMMENT ON COLUMN ocr_results.subtotal_amount IS '小計（税抜き金額）';
COMMENT ON COLUMN ocr_results.total_amount IS '合計金額（税込み）';
COMMENT ON COLUMN ocr_results.tax_amount IS '消費税額';
COMMENT ON COLUMN ocr_results.payment_amount IS 'お預かり金額';
COMMENT ON COLUMN ocr_results.change_amount IS 'お釣り';
COMMENT ON COLUMN ocr_results.receipt_number IS '領収書番号';
COMMENT ON COLUMN ocr_results.store_name IS '店舗名';
COMMENT ON COLUMN ocr_results.store_phone IS '店舗電話番号';
COMMENT ON COLUMN ocr_results.company_name IS '会社名';
COMMENT ON COLUMN ocr_results.notes IS '備考（その他の情報）';

-- 実行結果を確認
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) as comment
FROM 
    information_schema.columns
WHERE 
    table_name = 'ocr_results'
    AND column_name IN (
        'subtotal_amount', 'payment_amount', 'change_amount', 
        'receipt_number', 'store_name', 'store_phone', 
        'company_name', 'notes', 'total_amount', 'tax_amount'
    )
ORDER BY 
    ordinal_position;