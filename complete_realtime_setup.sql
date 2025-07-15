-- ===============================================
-- OCR Results テーブルの完全なリアルタイム設定
-- 実行日: 2025-07-06
-- 
-- このスクリプトをSupabase SQL Editorで実行してください
-- 各ステップの結果を確認しながら進めてください
-- ===============================================

-- ステップ1: 現在の設定を確認
-- ===============================================
SELECT '=== ステップ1: 現在の設定確認 ===' AS step;

-- RLS設定を確認
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'ocr_results';

-- 現在のポリシーを確認
SELECT 
  'Current Policies' as info,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'ocr_results';

-- パブリケーション設定を確認
SELECT 
  'Publication Status' as info,
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'ocr_results';

-- ステップ2: RLSを一時的に無効化（テスト用）
-- ===============================================
SELECT '=== ステップ2: RLSを無効化 ===' AS step;

ALTER TABLE public.ocr_results DISABLE ROW LEVEL SECURITY;

-- ステップ3: REPLICA IDENTITYを設定
-- ===============================================
SELECT '=== ステップ3: REPLICA IDENTITY設定 ===' AS step;

ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- 設定確認
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

-- ステップ4: パブリケーションに追加
-- ===============================================
SELECT '=== ステップ4: パブリケーション設定 ===' AS step;

-- 既存のパブリケーションから一旦削除（エラーが出ても問題なし）
ALTER PUBLICATION supabase_realtime DROP TABLE public.ocr_results;

-- パブリケーションに追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;

-- 設定確認
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'ocr_results' 
  AND pubname = 'supabase_realtime';

-- ステップ5: 権限の確認と設定
-- ===============================================
SELECT '=== ステップ5: 権限設定 ===' AS step;

-- anonとauthenticatedロールの権限を確認
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'ocr_results'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 必要に応じて権限を付与
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_results TO authenticated;

-- ステップ6: 最終確認
-- ===============================================
SELECT '=== ステップ6: 最終確認 ===' AS step;

-- 全ての設定が正しいか確認
SELECT 
  'Final Check' as status,
  (SELECT COUNT(*) FROM pg_publication_tables WHERE tablename = 'ocr_results' AND pubname = 'supabase_realtime') as in_publication,
  (SELECT CASE relreplident WHEN 'f' THEN 'FULL' ELSE 'NOT FULL' END FROM pg_class WHERE relname = 'ocr_results') as replica_identity,
  (SELECT rowsecurity::text FROM pg_tables WHERE tablename = 'ocr_results' AND schemaname = 'public') as rls_enabled;

-- ===============================================
-- 設定完了後の注意事項
-- ===============================================
-- 1. この設定でリアルタイムが動作することを確認してください
-- 2. 動作確認後、本番環境では適切なRLSポリシーを設定してください
-- 3. RLSを再度有効にする場合：
--    ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
--    その後、適切なポリシーを作成してください
-- ===============================================