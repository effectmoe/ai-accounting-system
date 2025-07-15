-- ========================
-- マイグレーション検証スクリプト
-- ========================

-- 1. ocr_results テーブルの構造を確認
SELECT 
    '=== Table Structure ===' as section;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'ocr_results'
ORDER BY 
    ordinal_position;

-- 2. 新しく追加されたカラムのコメントを確認
SELECT 
    '=== Column Comments ===' as section;

SELECT 
    column_name,
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

-- 3. テーブルの統計情報
SELECT 
    '=== Table Statistics ===' as section;

SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_rows,
    last_vacuum,
    last_analyze
FROM 
    pg_stat_user_tables
WHERE 
    tablename = 'ocr_results';