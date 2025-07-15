const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

// Supabaseクライアントの作成
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRLSPolicies() {
  console.log('='.repeat(60));
  console.log('🔍 RLSポリシーチェックツール');
  console.log('='.repeat(60) + '\n');

  console.log('📋 以下のSQLをSupabase SQL Editorで実行してください：\n');

  const checkSql = `
-- ===============================================
-- OCR Results テーブルのRLS設定確認
-- ===============================================

-- 1. RLSが有効かどうか確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'ocr_results';

-- 2. 既存のRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'ocr_results';

-- 3. リアルタイムに必要な権限を確認
-- リアルタイムはSELECT権限が必要
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'ocr_results'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- ===============================================
-- リアルタイムを有効にするための推奨設定
-- ===============================================

-- オプション1: RLSを無効化（開発環境でのテスト用）
-- ALTER TABLE public.ocr_results DISABLE ROW LEVEL SECURITY;

-- オプション2: リアルタイム用のRLSポリシーを作成
-- RLSを有効化
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（必要に応じて）
-- DROP POLICY IF EXISTS "Enable read for all users" ON public.ocr_results;
-- DROP POLICY IF EXISTS "Enable insert for all users" ON public.ocr_results;
-- DROP POLICY IF EXISTS "Enable update for all users" ON public.ocr_results;
-- DROP POLICY IF EXISTS "Enable delete for all users" ON public.ocr_results;

-- 全ユーザーに読み取り権限を付与（リアルタイムに必須）
CREATE POLICY "Enable read for all users" ON public.ocr_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 全ユーザーに挿入権限を付与
CREATE POLICY "Enable insert for all users" ON public.ocr_results
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 全ユーザーに更新権限を付与
CREATE POLICY "Enable update for all users" ON public.ocr_results
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 全ユーザーに削除権限を付与
CREATE POLICY "Enable delete for all users" ON public.ocr_results
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ===============================================
-- より安全なRLSポリシー（本番環境向け）
-- ===============================================

-- company_idベースのアクセス制御を使用する場合：
/*
-- 読み取り：自社のデータのみ
CREATE POLICY "Users can view own company data" ON public.ocr_results
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- 挿入：自社のデータのみ
CREATE POLICY "Users can insert own company data" ON public.ocr_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );
*/

-- ===============================================
-- 設定後の確認
-- ===============================================

-- RLSポリシーが正しく作成されたか確認
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'ocr_results';
`;

  console.log(checkSql);
  console.log('\n' + '='.repeat(60));
  console.log('💡 推奨手順:');
  console.log('1. 上記のSQLでRLS設定を確認');
  console.log('2. リアルタイムが動作しない場合は、一時的にRLSを無効化してテスト');
  console.log('3. RLSが原因と判明したら、適切なポリシーを作成');
  console.log('4. 本番環境では必ず適切なRLSポリシーを設定');
  console.log('='.repeat(60));
}

// 実行
checkRLSPolicies();