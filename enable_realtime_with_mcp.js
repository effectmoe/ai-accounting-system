const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

// Supabaseクライアントの作成
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function enableRealtimeForOcrResults() {
  console.log('='.repeat(60));
  console.log('🚀 OCR Resultsテーブルのリアルタイム機能を有効化します');
  console.log('='.repeat(60) + '\n');

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

    // 2. SQL実行用のスクリプトを生成
    console.log('2️⃣ リアルタイム有効化のためのSQLスクリプトを生成中...\n');

    const sqlScript = `
-- ===============================================
-- OCR Results テーブルのリアルタイム設定
-- ===============================================

-- 1. Replica Identityを設定（リアルタイムに必須）
ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- 2. リアルタイムパブリケーションに追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;

-- 3. 設定が正しく適用されたか確認
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'ocr_results' 
  AND pubname = 'supabase_realtime';

-- 4. テーブルのReplica Identity設定を確認
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
`;

    console.log('📋 以下のSQLをSupabaseのSQL Editorで実行してください：');
    console.log('='.repeat(60));
    console.log(sqlScript);
    console.log('='.repeat(60) + '\n');

    // 3. Supabaseダッシュボードでの手動設定手順
    console.log('3️⃣ Supabaseダッシュボードでの手動設定手順：\n');
    console.log('1. Supabaseダッシュボードにログイン');
    console.log(`   URL: https://app.supabase.com/project/clqpfmroqcnvyxdzadln\n`);
    
    console.log('2. 「SQL Editor」タブに移動');
    console.log('   - 上記のSQLスクリプトをコピー＆ペースト');
    console.log('   - 「Run」ボタンをクリックして実行\n');
    
    console.log('3. 「Database」→「Replication」タブに移動');
    console.log('   - 「supabase_realtime」パブリケーションを確認');
    console.log('   - 「Source」セクションで「ocr_results」テーブルがチェックされていることを確認');
    console.log('   - チェックされていない場合は、チェックボックスをオンにして保存\n');

    // 4. テスト用のリアルタイムリスナー実装例
    console.log('4️⃣ リアルタイムリスナーの実装例：\n');
    
    const listenerExample = `
// OCR結果のリアルタイム監視を開始
const startRealtimeListener = () => {
  const channel = supabase
    .channel('ocr-results-channel')
    .on(
      'postgres_changes',
      {
        event: '*', // 'INSERT', 'UPDATE', 'DELETE' を個別に指定も可能
        schema: 'public',
        table: 'ocr_results'
      },
      (payload) => {
        console.log('🔔 リアルタイム更新:', payload);
        
        switch(payload.eventType) {
          case 'INSERT':
            console.log('📄 新規OCR結果が追加されました:');
            console.log('  - ファイル名:', payload.new.file_name);
            console.log('  - 金額:', payload.new.total_amount);
            console.log('  - ステータス:', payload.new.status);
            break;
            
          case 'UPDATE':
            console.log('✏️ OCR結果が更新されました:');
            console.log('  - ID:', payload.new.id);
            console.log('  - 変更前:', payload.old);
            console.log('  - 変更後:', payload.new);
            break;
            
          case 'DELETE':
            console.log('🗑️ OCR結果が削除されました:');
            console.log('  - ID:', payload.old.id);
            break;
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ リアルタイム監視を開始しました');
      } else {
        console.log('📡 接続状態:', status);
      }
    });

  // クリーンアップ用の関数を返す
  return () => {
    supabase.removeChannel(channel);
    console.log('🔌 リアルタイム監視を停止しました');
  };
};

// 使用例
const stopListener = startRealtimeListener();

// 監視を停止する場合
// stopListener();
`;

    console.log('```javascript');
    console.log(listenerExample);
    console.log('```\n');

    // 5. 動作テスト用のコード
    console.log('5️⃣ 動作テスト用のコード：\n');
    
    const testCode = `
// テストデータを挿入してリアルタイム通知を確認
const testRealtime = async () => {
  // リスナーを開始
  const stopListener = startRealtimeListener();
  
  // 少し待機（接続確立のため）
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // テストデータを挿入
  const testData = {
    file_name: 'realtime_test_' + new Date().toISOString() + '.pdf',
    file_size: 1024,
    file_type: 'application/pdf',
    file_url: 'https://example.com/test.pdf',
    extracted_text: 'リアルタイムテスト\\n金額: 5,000円',
    confidence: 0.95,
    vendor_name: 'テスト店舗',
    receipt_date: new Date().toISOString().split('T')[0],
    total_amount: 5000,
    tax_amount: 500,
    status: 'completed',
    company_id: null // 必要に応じて実際のcompany_idを設定
  };
  
  console.log('📤 テストデータを挿入中...');
  const { data, error } = await supabase
    .from('ocr_results')
    .insert([testData])
    .select();
  
  if (error) {
    console.error('❌ エラー:', error);
  } else {
    console.log('✅ テストデータが挿入されました:', data);
  }
  
  // 5秒後に監視を停止
  setTimeout(() => {
    stopListener();
  }, 5000);
};

// テスト実行
testRealtime();
`;

    console.log('```javascript');
    console.log(testCode);
    console.log('```\n');

    // 6. 注意事項
    console.log('⚠️ 注意事項：\n');
    console.log('1. Service Roleキーを使用しているため、本番環境では適切な権限管理が必要です');
    console.log('2. リアルタイム接続は同時接続数に制限があります（Supabaseプランによる）');
    console.log('3. 大量のデータ変更がある場合は、パフォーマンスに注意してください');
    console.log('4. ネットワーク切断時の再接続処理を実装することを推奨します\n');

    // 7. 次のステップ
    console.log('🎯 次のステップ：\n');
    console.log('1. 上記のSQLをSupabase SQL Editorで実行');
    console.log('2. Replicationタブで設定を確認');
    console.log('3. リアルタイムリスナーをアプリケーションに実装');
    console.log('4. テストコードで動作確認');
    console.log('5. 本番環境への適用前に、開発環境で十分にテスト\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

// メイン実行
console.log('🤖 Mastra AI会計システム - OCR Resultsリアルタイム有効化ツール');
console.log('📅 実行日時:', new Date().toLocaleString('ja-JP'));
console.log('');

enableRealtimeForOcrResults();