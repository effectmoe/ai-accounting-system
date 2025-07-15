const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

// Supabaseクライアントの作成
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRealtimeSettings() {
  console.log('='.repeat(60));
  console.log('🔍 Supabase リアルタイム設定チェックツール');
  console.log('='.repeat(60) + '\n');

  try {
    console.log('1️⃣ テーブルの存在確認...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('ocr_results')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ テーブルエラー:', tableError);
      return;
    }
    console.log('✅ ocr_resultsテーブルが存在します\n');

    console.log('2️⃣ リアルタイムパブリケーション設定を確認するSQLを生成...\n');

    const checkSql = `
-- パブリケーションにocr_resultsテーブルが含まれているか確認
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'ocr_results';

-- REPLICA IDENTITY設定を確認
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

-- 全てのパブリケーションを確認
SELECT pubname FROM pg_publication;

-- supabase_realtimeパブリケーションの詳細
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
`;

    console.log('📋 以下のSQLをSupabase SQL Editorで実行して設定を確認してください：');
    console.log('='.repeat(60));
    console.log(checkSql);
    console.log('='.repeat(60) + '\n');

    console.log('3️⃣ リアルタイム接続テスト...\n');

    // テスト用のチャンネルを作成
    let isSubscribed = false;
    let receivedMessage = false;
    
    const testChannel = supabase
      .channel('test-ocr-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ocr_results'
        },
        (payload) => {
          receivedMessage = true;
          console.log('🔔 リアルタイムメッセージを受信しました！');
          console.log('イベント:', payload.eventType);
          console.log('データ:', payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 チャンネル状態:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          console.log('✅ リアルタイムチャンネルに正常に接続しました\n');
        }
      });

    // 接続を待つ
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (!isSubscribed) {
      console.log('⚠️ リアルタイムチャンネルへの接続に失敗しました\n');
    }

    console.log('4️⃣ テストデータの挿入...');
    
    const testData = {
      file_name: `realtime_test_${Date.now()}.pdf`,
      file_size: 1024,
      file_type: 'application/pdf',
      file_url: 'https://example.com/test.pdf',
      extracted_text: 'リアルタイムテスト',
      confidence: 0.95,
      vendor_name: 'テスト店舗',
      receipt_date: new Date().toISOString().split('T')[0],
      total_amount: 1000,
      tax_amount: 100,
      status: 'completed',
      company_id: '11111111-1111-1111-1111-111111111111'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('ocr_results')
      .insert([testData])
      .select();

    if (insertError) {
      console.error('❌ データ挿入エラー:', insertError);
    } else {
      console.log('✅ テストデータが挿入されました');
      console.log('挿入されたデータID:', insertData[0].id);
    }

    // リアルタイムメッセージの受信を待つ
    console.log('\n⏳ リアルタイムメッセージの受信を待機中（5秒間）...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (receivedMessage) {
      console.log('\n✅ リアルタイム機能は正常に動作しています！');
    } else {
      console.log('\n❌ リアルタイムメッセージが受信されませんでした');
      console.log('\n考えられる原因：');
      console.log('1. ocr_resultsテーブルがsupabase_realtimeパブリケーションに含まれていない');
      console.log('2. REPLICA IDENTITYが正しく設定されていない');
      console.log('3. リアルタイム機能が無効になっている');
      console.log('4. ネットワークの問題');
      
      console.log('\n📝 解決方法：');
      console.log('1. Supabase SQL Editorで以下のSQLを実行：');
      console.log('   ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;');
      console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;');
      console.log('\n2. Supabaseダッシュボードで確認：');
      console.log('   - Database → Replication → supabase_realtime');
      console.log('   - ocr_resultsテーブルがチェックされているか確認');
    }

    // クリーンアップ
    supabase.removeChannel(testChannel);
    console.log('\n🔌 テストチャンネルを閉じました');

    // テストデータを削除（オプション）
    if (insertData && insertData[0]) {
      const { error: deleteError } = await supabase
        .from('ocr_results')
        .delete()
        .eq('id', insertData[0].id);
      
      if (!deleteError) {
        console.log('🗑️ テストデータを削除しました');
      }
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// 実行
console.log('🤖 Supabase リアルタイム設定チェックツール');
console.log('📅 実行日時:', new Date().toLocaleString('ja-JP'));
console.log('');

checkRealtimeSettings();