// ===== テスト関数 =====
// GASエディタにこれらの関数を追加して実行

// 1. API設定確認
function checkApiSettings() {
  console.log('=== API設定確認 ===');
  
  // Drive API v2の確認
  try {
    const testList = Drive.Files.list({ maxResults: 1 });
    console.log('✅ Drive API v2: 正常');
  } catch (e) {
    console.error('❌ Drive API v2: 未設定', e.message);
  }
  
  // フォルダーIDの確認
  console.log('📁 監視フォルダID:', FOLDER_ID);
  console.log('📁 アーカイブフォルダID:', ARCHIVE_FOLDER_ID);
  
  // Supabase設定の確認
  console.log('🔗 Supabase URL:', SUPABASE_URL ? '設定済み' : '未設定');
  console.log('🔑 Supabase Key:', SUPABASE_ANON_KEY ? '設定済み' : '未設定');
}

// 2. 手動OCR実行テスト
function manualOcrTest() {
  console.log('=== 手動OCRテスト開始 ===');
  
  // 最新ファイルを1つ処理
  const results = checkAndProcessRecentFiles();
  
  if (results.length > 0) {
    console.log('✅ OCR処理成功:', results[0]);
  } else {
    console.log('⚠️ 処理対象のファイルがありません');
    console.log('指定フォルダにPDFをアップロードしてください');
  }
}

// 3. Supabase接続テスト
function testSupabaseConnection() {
  console.log('=== Supabase接続テスト ===');
  
  const testData = {
    company_id: '11111111-1111-1111-1111-111111111111',
    file_name: 'test_connection_' + new Date().getTime() + '.pdf',
    file_size: 1024,
    file_type: 'application/pdf',
    file_url: 'https://example.com/test.pdf',
    extracted_text: 'テスト接続確認',
    confidence: 0.99,
    vendor_name: 'テスト店舗',
    receipt_date: new Date().toISOString().split('T')[0],
    total_amount: 1000,
    tax_amount: 100,
    status: 'completed'
  };
  
  const result = saveToSupabase(testData);
  
  if (result.success) {
    console.log('✅ Supabase接続成功');
    console.log('保存されたID:', result.data.id);
  } else {
    console.error('❌ Supabase接続失敗:', result.error);
  }
}

// 4. 最新ファイルの確認
function checkRecentFiles() {
  console.log('=== 最新ファイル確認 ===');
  
  const files = Drive.Files.list({
    q: `'${FOLDER_ID}' in parents and mimeType = 'application/pdf' and trashed = false`,
    orderBy: 'createdDate desc',
    maxResults: 5
  });
  
  if (files.items.length === 0) {
    console.log('⚠️ PDFファイルが見つかりません');
    return;
  }
  
  console.log(`📄 ${files.items.length}個のPDFファイルが見つかりました:`);
  files.items.forEach((file, index) => {
    console.log(`${index + 1}. ${file.title} (${new Date(file.createdDate).toLocaleString('ja-JP')})`);
  });
}