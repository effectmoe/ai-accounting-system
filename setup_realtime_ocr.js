const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const supabaseUrl = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

// Service Roleクライアント（管理者権限）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRealtimeForOcrResults() {
  console.log('🚀 OCR Resultsテーブルのリアルタイム設定を自動構成します...\n');

  try {
    // 1. テーブルの存在確認
    console.log('1️⃣ テーブルの存在を確認中...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('ocr_results')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ テーブルが見つかりません:', tableError.message);
      return;
    }
    console.log('✅ ocr_resultsテーブルが存在します\n');

    // 2. Replication設定の確認と有効化
    console.log('2️⃣ Replication設定を確認・有効化中...');
    const { data: replicationStatus, error: repError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE tablename = 'ocr_results' 
                AND pubname = 'supabase_realtime'
              ) THEN true
              ELSE false
            END as is_replicated
          FROM pg_tables 
          WHERE tablename = 'ocr_results' 
          AND schemaname = 'public';
        `
      });

    if (repError) {
      console.log('⚠️  Replication状態の確認に失敗しました。SQLクエリを直接実行します...');
      
      // 代替方法：cURLでSQL実行
      const curlCommand = `curl -X POST "${supabaseUrl}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${supabaseServiceKey}" \
        -H "Authorization: Bearer ${supabaseServiceKey}" \
        -H "Content-Type: application/json" \
        -d '{"sql": "ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;"}'`;
      
      console.log('📝 以下のコマンドをターミナルで実行してください：\n');
      console.log(curlCommand + '\n');
    } else {
      console.log('✅ Replication状態:', replicationStatus);
    }

    // 3. パブリケーション設定の確認
    console.log('\n3️⃣ リアルタイムパブリケーション設定を確認中...');
    console.log('📝 Supabaseダッシュボードで以下を確認してください：');
    console.log('   1. Database → Replication に移動');
    console.log('   2. "supabase_realtime" パブリケーションを選択');
    console.log('   3. ocr_resultsテーブルが含まれているか確認');
    console.log('   4. 含まれていない場合は、テーブルを追加\n');

    // 4. RLSポリシーの確認
    console.log('4️⃣ Row Level Security (RLS) ポリシーを確認中...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE tablename = 'ocr_results' 
          AND schemaname = 'public';
        `
      });

    if (!rlsError && rlsStatus) {
      console.log('✅ RLS状態:', rlsStatus);
    } else {
      console.log('⚠️  RLS状態の確認に失敗しました');
    }

    // 5. テスト用のリアルタイムリスナー設定
    console.log('\n5️⃣ リアルタイムリスナーのテストコード：\n');
    console.log(`
// リアルタイムリスナーの実装例
const channel = supabase
  .channel('ocr-results-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE すべてを監視
      schema: 'public',
      table: 'ocr_results'
    },
    (payload) => {
      console.log('リアルタイム変更検出:', payload);
      
      switch(payload.eventType) {
        case 'INSERT':
          console.log('新規OCR結果:', payload.new);
          break;
        case 'UPDATE':
          console.log('OCR結果更新:', payload.new);
          break;
        case 'DELETE':
          console.log('OCR結果削除:', payload.old);
          break;
      }
    }
  )
  .subscribe((status) => {
    console.log('サブスクリプション状態:', status);
  });
`);

    // 6. 手動設定が必要な項目の案内
    console.log('\n📋 手動設定が必要な項目：\n');
    console.log('1. Supabaseダッシュボードにログイン');
    console.log(`   URL: https://app.supabase.com/project/clqpfmroqcnvyxdzadln`);
    console.log('\n2. Database → Replication に移動');
    console.log('   - "supabase_realtime" パブリケーションを選択');
    console.log('   - Source欄で "ocr_results" テーブルを有効化');
    console.log('\n3. SQL Editorで以下を実行：');
    console.log(`
-- Replica Identityを設定（リアルタイムに必要）
ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- パブリケーションに追加（まだ追加されていない場合）
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;
`);

    // 7. 動作確認用のテストデータ挿入
    console.log('\n6️⃣ 動作確認用のテストを実行しますか？');
    console.log('   以下のコードで新しいレコードを挿入してリアルタイム通知をテストできます：\n');
    console.log(`
const testData = {
  file_name: 'realtime_test_' + Date.now() + '.pdf',
  file_size: 2048,
  file_type: 'application/pdf',
  file_url: 'https://example.com/test.pdf',
  extracted_text: 'リアルタイムテスト',
  confidence: 0.99,
  vendor_name: 'テスト店舗',
  receipt_date: new Date().toISOString().split('T')[0],
  total_amount: 5000,
  tax_amount: 500,
  status: 'completed'
};

const { data, error } = await supabase
  .from('ocr_results')
  .insert([testData])
  .select();

console.log('テストデータ挿入結果:', data);
`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  }

  console.log('\n🎯 次のステップ：');
  console.log('1. 上記の手動設定を完了してください');
  console.log('2. リアルタイムリスナーのコードをアプリケーションに実装してください');
  console.log('3. テストデータを挿入して動作を確認してください\n');
}

// カスタムRPC関数の作成（存在しない場合）
async function createExecSqlFunction() {
  console.log('📝 exec_sql関数を作成中...');
  
  const createFunctionSQL = `
-- SQL実行用のヘルパー関数（Service Roleのみ使用可能）
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- セキュリティチェック（Service Roleのみ許可）
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Service role required';
  END IF;
  
  -- SQLを実行して結果を返す
  EXECUTE 'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (' || sql || ') t' INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
`;

  console.log('以下のSQLをSupabaseのSQL Editorで実行してください：\n');
  console.log(createFunctionSQL);
}

// メイン実行
console.log('='.repeat(60));
console.log('🤖 Mastra AI会計システム - リアルタイム自動設定ツール');
console.log('='.repeat(60) + '\n');

setupRealtimeForOcrResults()
  .then(() => {
    console.log('✅ 設定確認が完了しました！');
    console.log('\n💡 ヒント: exec_sql関数が存在しない場合は以下を実行：');
    console.log('node setup_realtime_ocr.js --create-function\n');
  })
  .catch(console.error);

// コマンドライン引数の処理
if (process.argv.includes('--create-function')) {
  createExecSqlFunction();
}