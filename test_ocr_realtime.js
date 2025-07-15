const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';

// Supabaseクライアントの作成
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// OCR結果のリアルタイム監視を開始
const startRealtimeListener = () => {
  console.log('🚀 リアルタイムリスナーを起動中...\n');
  
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
        console.log('🔔 リアルタイム更新を検出！');
        console.log('イベントタイプ:', payload.eventType);
        console.log('タイムスタンプ:', new Date(payload.commit_timestamp).toLocaleString('ja-JP'));
        
        switch(payload.eventType) {
          case 'INSERT':
            console.log('📄 新規OCR結果が追加されました:');
            console.log('  - ID:', payload.new.id);
            console.log('  - ファイル名:', payload.new.file_name);
            console.log('  - 店舗名:', payload.new.vendor_name);
            console.log('  - 金額:', payload.new.total_amount ? `¥${payload.new.total_amount.toLocaleString()}` : '未設定');
            console.log('  - ステータス:', payload.new.status);
            break;
            
          case 'UPDATE':
            console.log('✏️ OCR結果が更新されました:');
            console.log('  - ID:', payload.new.id);
            console.log('  - ファイル名:', payload.new.file_name);
            if (payload.old.status !== payload.new.status) {
              console.log('  - ステータス変更:', payload.old.status, '→', payload.new.status);
            }
            if (payload.old.total_amount !== payload.new.total_amount) {
              console.log('  - 金額変更:', 
                payload.old.total_amount ? `¥${payload.old.total_amount.toLocaleString()}` : '未設定',
                '→',
                payload.new.total_amount ? `¥${payload.new.total_amount.toLocaleString()}` : '未設定'
              );
            }
            break;
            
          case 'DELETE':
            console.log('🗑️ OCR結果が削除されました:');
            console.log('  - ID:', payload.old.id);
            console.log('  - ファイル名:', payload.old.file_name);
            break;
        }
        
        console.log('-'.repeat(60) + '\n');
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ リアルタイム監視を開始しました');
        console.log('📡 ocr_resultsテーブルの変更を監視中...\n');
        console.log('テストデータを挿入するには、別のターミナルで以下を実行してください：');
        console.log('node test_ocr_realtime.js --insert\n');
        console.log('Ctrl+C で監視を停止します\n');
        console.log('-'.repeat(60) + '\n');
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

// テストデータを挿入
const insertTestData = async () => {
  const testData = {
    file_name: `test_receipt_${Date.now()}.pdf`,
    file_size: Math.floor(Math.random() * 5000) + 1000,
    file_type: 'application/pdf',
    file_url: `https://example.com/receipts/test_${Date.now()}.pdf`,
    extracted_text: `テストレシート\n日付: ${new Date().toLocaleDateString('ja-JP')}\n金額: ${Math.floor(Math.random() * 10000) + 1000}円`,
    confidence: Math.random() * 0.2 + 0.8, // 0.8-1.0の範囲
    vendor_name: ['テスト店舗A', 'テスト店舗B', 'テスト店舗C'][Math.floor(Math.random() * 3)],
    receipt_date: new Date().toISOString().split('T')[0],
    total_amount: Math.floor(Math.random() * 10000) + 1000,
    tax_amount: Math.floor(Math.random() * 1000) + 100,
    status: 'completed',
    company_id: '11111111-1111-1111-1111-111111111111' // サンプル株式会社のID
  };

  console.log('📤 テストデータを挿入中...');
  console.log('データ:', JSON.stringify(testData, null, 2));
  
  const { data, error } = await supabase
    .from('ocr_results')
    .insert([testData])
    .select();

  if (error) {
    console.error('❌ エラー:', error);
  } else {
    console.log('✅ テストデータが正常に挿入されました！');
    console.log('挿入されたデータ:', data[0]);
  }
};

// 既存データを更新
const updateTestData = async () => {
  // 最新のレコードを取得
  const { data: latestRecord, error: fetchError } = await supabase
    .from('ocr_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !latestRecord) {
    console.error('❌ 更新対象のレコードが見つかりません');
    return;
  }

  console.log('📝 レコードを更新中...');
  console.log('対象ID:', latestRecord.id);

  const updateData = {
    status: latestRecord.status === 'completed' ? 'processing' : 'completed',
    total_amount: latestRecord.total_amount + 1000,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ocr_results')
    .update(updateData)
    .eq('id', latestRecord.id)
    .select();

  if (error) {
    console.error('❌ 更新エラー:', error);
  } else {
    console.log('✅ レコードが正常に更新されました！');
    console.log('更新内容:', updateData);
  }
};

// メイン処理
const main = async () => {
  console.log('='.repeat(60));
  console.log('🤖 OCR Results リアルタイムテストツール');
  console.log('='.repeat(60) + '\n');

  const args = process.argv.slice(2);

  if (args.includes('--insert')) {
    await insertTestData();
  } else if (args.includes('--update')) {
    await updateTestData();
  } else {
    // リアルタイム監視を開始
    const stopListener = startRealtimeListener();

    // プロセス終了時のクリーンアップ
    process.on('SIGINT', () => {
      console.log('\n\n👋 終了処理中...');
      stopListener();
      process.exit(0);
    });
  }
};

// 実行
main().catch(console.error);