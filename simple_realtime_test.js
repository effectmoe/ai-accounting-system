const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';

console.log('🚀 シンプルなリアルタイムテストを開始...\n');

// Supabaseクライアントの作成
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// リアルタイムチャンネルの設定
console.log('📡 リアルタイムチャンネルを設定中...');
const channel = supabase.channel('test-channel');

// 購読の設定
channel
  .on(
    'postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'ocr_results' 
    },
    (payload) => {
      console.log('\n🔔 リアルタイムイベントを受信！');
      console.log('イベントタイプ:', payload.eventType);
      console.log('データ:', payload);
      console.log('-'.repeat(60));
    }
  )
  .subscribe((status) => {
    console.log('📡 チャンネル状態:', status);
    
    if (status === 'SUBSCRIBED') {
      console.log('✅ リアルタイム監視を開始しました！\n');
      console.log('テストするには別のターミナルで以下を実行:');
      console.log('node test_ocr_realtime.js --insert\n');
      console.log('Ctrl+C で終了します。\n');
    }
  });

// エラーハンドリング
channel.on('error', (error) => {
  console.error('❌ エラー:', error);
});

// 接続状態の監視
setInterval(() => {
  const state = channel.state;
  if (state !== 'joined') {
    console.log(`⚠️  チャンネル状態: ${state}`);
  }
}, 5000);

// 終了処理
process.on('SIGINT', () => {
  console.log('\n\n🔌 接続を切断中...');
  supabase.removeChannel(channel);
  process.exit(0);
});