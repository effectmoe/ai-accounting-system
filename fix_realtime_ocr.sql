-- ===============================================
-- OCR Results テーブルのリアルタイム機能修正
-- ===============================================
-- 実行日: 2025-07-06
-- 
-- このスクリプトをSupabase SQL Editorで実行してください
-- ===============================================

-- 1. 現在の設定を確認
SELECT '=== 現在のパブリケーション設定 ===' AS status;
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'ocr_results';

-- 2. REPLICA IDENTITY設定を確認
SELECT '=== 現在のREPLICA IDENTITY設定 ===' AS status;
SELECT 
  n.nspname AS schema,
  c.relname AS table,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'ocr_results'
  AND n.nspname = 'public';

-- 3. REPLICA IDENTITYをFULLに設定（リアルタイムに必須）
ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- 4. supabase_realtimeパブリケーションが存在するか確認
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
        RAISE NOTICE 'supabase_realtimeパブリケーションを作成しました';
    ELSE
        RAISE NOTICE 'supabase_realtimeパブリケーションは既に存在します';
    END IF;
END $$;

-- 5. ocr_resultsテーブルをパブリケーションに追加
-- 既に追加されている場合はエラーになるが、それは正常
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;

-- 6. 設定が正しく適用されたか確認
SELECT '=== 更新後のパブリケーション設定 ===' AS status;
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'ocr_results' 
  AND pubname = 'supabase_realtime';

-- 7. 更新後のREPLICA IDENTITY設定を確認
SELECT '=== 更新後のREPLICA IDENTITY設定 ===' AS status;
SELECT 
  n.nspname AS schema,
  c.relname AS table,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'ocr_results'
  AND n.nspname = 'public';

-- 8. 他のテーブルのリアルタイム設定も確認（参考）
SELECT '=== 他のテーブルのリアルタイム設定 ===' AS status;
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- ===============================================
-- 実行後の確認事項：
-- 1. 上記のクエリで以下を確認:
--    - ocr_resultsがsupabase_realtimeに含まれている
--    - replica_identityが'full'になっている
-- 
-- 2. Supabaseダッシュボードでも確認:
--    Database → Replication → supabase_realtime
--    → Source欄でocr_resultsがチェックされている
-- ===============================================