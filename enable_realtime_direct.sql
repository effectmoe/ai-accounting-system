-- Supabase Realtime直接有効化スクリプト
-- ReplicationタブがComing Soonの場合の代替方法

-- 1. 現在の権限を確認
SELECT 
  'Current Permissions' as check_type,
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'ocr_results'
  AND grantee IN ('anon', 'authenticated', 'supabase_realtime_admin')
ORDER BY grantee, privilege_type;

-- 2. 必要な権限を付与
GRANT SELECT ON public.ocr_results TO anon;
GRANT SELECT ON public.ocr_results TO authenticated;
GRANT ALL ON public.ocr_results TO supabase_realtime_admin;

-- 3. RLSを無効化（テスト用）
ALTER TABLE public.ocr_results DISABLE ROW LEVEL SECURITY;

-- 4. REPLICA IDENTITYを設定
ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- 5. 手動でパブリケーションを確認/作成
DO $$
BEGIN
  -- パブリケーションが存在しない場合は作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    RAISE NOTICE 'Created publication: supabase_realtime';
  ELSE
    RAISE NOTICE 'Publication already exists: supabase_realtime';
  END IF;
END$$;

-- 6. テーブルをパブリケーションに追加
DO $$
BEGIN
  -- 既に追加されているかチェック
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'ocr_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;
    RAISE NOTICE 'Added ocr_results to publication';
  ELSE
    RAISE NOTICE 'ocr_results already in publication';
  END IF;
END$$;

-- 7. 最終確認
SELECT 
  'Final Check' as status,
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'ocr_results';

-- 8. Realtime関連の設定確認
SELECT 
  'Realtime Config' as check_type,
  name,
  setting
FROM pg_settings 
WHERE name LIKE '%wal%' 
   OR name LIKE '%logical%'
ORDER BY name;