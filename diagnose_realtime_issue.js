const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

// 両方のクライアントを作成（anon keyとservice key）
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseRealtimeIssue() {
  console.log('='.repeat(80));
  console.log('🔍 Supabase リアルタイム診断ツール');
  console.log('='.repeat(80) + '\n');

  const results = {
    tableExists: false,
    anonKeyWorks: false,
    serviceKeyWorks: false,
    realtimeConnection: false,
    insertWorks: false,
    realtimeReceived: false,
    errors: []
  };

  try {
    // 1. テーブルアクセステスト
    console.log('1️⃣ テーブルアクセステスト...');
    
    // Anon keyでテスト
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('ocr_results')
      .select('id')
      .limit(1);
    
    if (anonError) {
      console.log('❌ Anon keyでのアクセスエラー:', anonError.message);
      results.errors.push(`Anon key error: ${anonError.message}`);
    } else {
      console.log('✅ Anon keyでのアクセス成功');
      results.anonKeyWorks = true;
      results.tableExists = true;
    }
    
    // Service keyでテスト
    const { data: serviceData, error: serviceError } = await supabaseService
      .from('ocr_results')
      .select('id')
      .limit(1);
    
    if (serviceError) {
      console.log('❌ Service keyでのアクセスエラー:', serviceError.message);
      results.errors.push(`Service key error: ${serviceError.message}`);
    } else {
      console.log('✅ Service keyでのアクセス成功');
      results.serviceKeyWorks = true;
      results.tableExists = true;
    }
    
    console.log('');

    // 2. リアルタイム接続テスト（複数の方法）
    console.log('2️⃣ リアルタイム接続テスト...\n');
    
    // 方法1: postgres_changesを使用
    console.log('方法1: postgres_changesパターン');
    let method1Connected = false;
    let method1Received = false;
    
    const channel1 = supabaseAnon
      .channel('test-channel-1')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ocr_results'
        },
        (payload) => {
          method1Received = true;
          console.log('✅ 方法1でメッセージ受信:', payload.eventType);
        }
      )
      .subscribe((status) => {
        console.log('📡 方法1 - チャンネル状態:', status);
        if (status === 'SUBSCRIBED') {
          method1Connected = true;
        }
      });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 方法2: 個別イベントを指定
    console.log('\n方法2: 個別イベント指定パターン');
    let method2Connected = false;
    let method2Received = false;
    
    const channel2 = supabaseAnon
      .channel('test-channel-2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ocr_results' },
        (payload) => {
          method2Received = true;
          console.log('✅ 方法2でINSERTメッセージ受信');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ocr_results' },
        (payload) => {
          method2Received = true;
          console.log('✅ 方法2でUPDATEメッセージ受信');
        }
      )
      .subscribe((status) => {
        console.log('📡 方法2 - チャンネル状態:', status);
        if (status === 'SUBSCRIBED') {
          method2Connected = true;
        }
      });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    results.realtimeConnection = method1Connected || method2Connected;
    
    console.log('');

    // 3. データ挿入と通知テスト
    console.log('3️⃣ データ挿入と通知テスト...\n');
    
    const testData = {
      file_name: `diagnosis_test_${Date.now()}.pdf`,
      file_size: 2048,
      file_type: 'application/pdf',
      file_url: 'https://example.com/diagnosis.pdf',
      extracted_text: '診断テストデータ',
      confidence: 0.99,
      vendor_name: '診断テスト店舗',
      receipt_date: new Date().toISOString().split('T')[0],
      total_amount: 9999,
      tax_amount: 999,
      status: 'completed',
      company_id: '11111111-1111-1111-1111-111111111111'
    };
    
    console.log('📤 テストデータを挿入中...');
    const { data: insertedData, error: insertError } = await supabaseAnon
      .from('ocr_results')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.log('❌ データ挿入エラー:', insertError.message);
      results.errors.push(`Insert error: ${insertError.message}`);
    } else {
      console.log('✅ データ挿入成功');
      console.log('挿入されたID:', insertedData[0].id);
      results.insertWorks = true;
    }
    
    // 通知の受信を待つ
    console.log('\n⏳ リアルタイム通知を待機中（5秒）...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    results.realtimeReceived = method1Received || method2Received;
    
    // クリーンアップ
    supabaseAnon.removeChannel(channel1);
    supabaseAnon.removeChannel(channel2);
    
    // テストデータを削除
    if (insertedData && insertedData[0]) {
      await supabaseAnon
        .from('ocr_results')
        .delete()
        .eq('id', insertedData[0].id);
    }
    
    console.log('');

    // 4. 診断結果のまとめ
    console.log('='.repeat(80));
    console.log('📊 診断結果サマリー');
    console.log('='.repeat(80) + '\n');
    
    console.log(`テーブル存在: ${results.tableExists ? '✅' : '❌'}`);
    console.log(`Anon Keyアクセス: ${results.anonKeyWorks ? '✅' : '❌'}`);
    console.log(`Service Keyアクセス: ${results.serviceKeyWorks ? '✅' : '❌'}`);
    console.log(`リアルタイム接続: ${results.realtimeConnection ? '✅' : '❌'}`);
    console.log(`データ挿入: ${results.insertWorks ? '✅' : '❌'}`);
    console.log(`リアルタイム通知受信: ${results.realtimeReceived ? '✅' : '❌'}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ エラー一覧:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    // 問題の診断と解決策
    console.log('\n' + '='.repeat(80));
    console.log('🔧 問題の診断と解決策');
    console.log('='.repeat(80) + '\n');
    
    if (!results.realtimeReceived) {
      console.log('❌ リアルタイム通知が受信されていません\n');
      console.log('考えられる原因と解決策:\n');
      
      console.log('1. リアルタイム設定の問題');
      console.log('   解決策: fix_realtime_ocr.sql をSupabase SQL Editorで実行してください\n');
      
      console.log('2. RLSポリシーの問題');
      console.log('   解決策: 以下のSQLでRLSを一時的に無効化してテスト:');
      console.log('   ALTER TABLE public.ocr_results DISABLE ROW LEVEL SECURITY;\n');
      
      console.log('3. パブリケーション設定の問題');
      console.log('   解決策: Supabaseダッシュボードで確認:');
      console.log('   Database → Replication → supabase_realtime → ocr_resultsがチェックされているか\n');
      
      console.log('4. WebSocket接続の問題');
      console.log('   解決策: ネットワーク設定やファイアウォールを確認\n');
    } else {
      console.log('✅ リアルタイム機能は正常に動作しています！');
    }
    
  } catch (error) {
    console.error('❌ 診断中にエラーが発生しました:', error);
    results.errors.push(`General error: ${error.message}`);
  }
  
  return results;
}

// WebSocketデバッグを有効にして実行
console.log('🤖 Supabase リアルタイム診断ツール');
console.log('📅 実行日時:', new Date().toLocaleString('ja-JP'));
console.log('🔗 URL:', SUPABASE_URL);
console.log('');

diagnoseRealtimeIssue()
  .then(() => {
    console.log('\n✅ 診断完了');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 診断エラー:', err);
    process.exit(1);
  });