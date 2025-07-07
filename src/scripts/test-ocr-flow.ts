#!/usr/bin/env npx tsx

/**
 * OCR Flow Test Script
 * GASのOCR機能とWebアプリの連携をテストするスクリプト
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function testOcrFlow() {
  console.log('🧪 OCRフロー統合テストを開始します...');
  
  // Supabaseクライアントを作成
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase環境変数が設定されていません');
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const companyId = '11111111-1111-1111-1111-111111111111';

  try {
    // 1. Supabase接続確認
    console.log('\n1️⃣ Supabase接続をテスト中...');
    const { data: existingData, error: selectError } = await supabase
      .from('ocr_results')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (selectError) {
      throw new Error(`Supabase接続エラー: ${selectError.message}`);
    }

    console.log('✅ Supabase接続成功');
    console.log(`📊 現在のデータ件数: ${existingData?.length || 0}件`);

    if (existingData && existingData.length > 0) {
      console.log(`📄 最新データ: ${existingData[0].file_name} (${existingData[0].vendor_name})`);
    }

    // 2. テストデータの作成（GAS動作確認用）
    console.log('\n2️⃣ テストデータを作成中...');
    const testData = {
      company_id: companyId,
      file_name: `test_manual_${Date.now()}.pdf`,
      file_size: 2048,
      file_type: 'application/pdf',
      file_url: 'https://drive.google.com/file/test',
      extracted_text: 'テスト領収書\n\n日付: 2025年7月6日\nベンダー: テスト株式会社\n金額: ¥15,000',
      confidence: 0.98,
      vendor_name: 'テスト株式会社',
      receipt_date: '2025-07-06',
      total_amount: 15000,
      tax_amount: 1364,
      status: 'completed'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('ocr_results')
      .insert([testData])
      .select();

    if (insertError) {
      throw new Error(`データ挿入エラー: ${insertError.message}`);
    }

    console.log('✅ テストデータ作成成功');
    console.log(`🆔 作成されたID: ${insertData[0].id}`);

    // 3. Webアプリのポーリング機能をテスト
    console.log('\n3️⃣ Webアプリのポーリング機能をテスト中...');
    console.log('🌐 Web画面を確認してください: http://localhost:3000/documents');
    console.log('📋 「OCR処理済み書類」タブで新しいデータが表示されるか確認');

    // 4. 追加のテストデータ作成（ポーリング確認用）
    console.log('\n4️⃣ 追加テストデータを作成（5秒後）...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const additionalTestData = {
      company_id: companyId,
      file_name: `test_polling_${Date.now()}.pdf`,
      file_size: 1536,
      file_type: 'application/pdf',
      file_url: 'https://drive.google.com/file/test2',
      extracted_text: 'ポーリングテスト領収書\n\n日付: 2025年7月6日\nベンダー: ポーリング商店\n金額: ¥8,500',
      confidence: 0.95,
      vendor_name: 'ポーリング商店',
      receipt_date: '2025-07-06',
      total_amount: 8500,
      tax_amount: 772,
      status: 'completed'
    };

    const { data: additionalData, error: additionalError } = await supabase
      .from('ocr_results')
      .insert([additionalTestData])
      .select();

    if (additionalError) {
      throw new Error(`追加データ挿入エラー: ${additionalError.message}`);
    }

    console.log('✅ 追加テストデータ作成成功');
    console.log(`🆔 作成されたID: ${additionalData[0].id}`);
    console.log('🔄 5秒以内にWebページに新しいトースト通知が表示されるはずです');

    // 5. GAS機能テスト指示
    console.log('\n5️⃣ GAS機能テスト指示');
    console.log('🔗 GASプロジェクト: https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit');
    console.log('\n📝 以下の関数を順番に実行してください:');
    console.log('   1. checkApiSettings() - API設定確認');
    console.log('   2. testSupabaseConnection() - DB接続確認');
    console.log('   3. checkRecentFiles() - ファイル確認');
    console.log('   4. manualOcrTest() - OCR手動テスト');

    // 6. 統合テスト結果の確認
    console.log('\n6️⃣ 統合テスト結果確認');
    const { data: finalData, error: finalError } = await supabase
      .from('ocr_results')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (finalError) {
      throw new Error(`最終確認エラー: ${finalError.message}`);
    }

    console.log(`✅ 総データ件数: ${finalData.length}件`);
    finalData.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.file_name} - ${item.vendor_name} - ¥${item.total_amount?.toLocaleString()}`);
    });

    console.log('\n🎉 OCRフロー統合テスト完了！');
    console.log('\n📊 確認ポイント:');
    console.log('   ✓ Supabaseにデータが正常に保存される');
    console.log('   ✓ Webページの5秒ポーリングが動作する');
    console.log('   ✓ 新しいデータでトースト通知が表示される');
    console.log('   ✓ GASのテスト関数が正常に実行される');

  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
    throw error;
  }
}

// 実際のOCRテスト用ヘルパー
async function checkRealtimeUpdates() {
  console.log('\n🔄 リアルタイム更新のテスト中...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // データベースの変更を監視
  const subscription = supabase
    .channel('ocr_results_changes')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ocr_results' 
      }, 
      (payload) => {
        console.log('🔔 新しいOCRデータを検出:', payload.new);
      }
    )
    .subscribe();

  console.log('👂 データベース変更を監視中... (30秒間)');
  
  setTimeout(() => {
    subscription.unsubscribe();
    console.log('📵 監視を停止しました');
  }, 30000);
}

// スクリプト実行
if (require.main === module) {
  testOcrFlow()
    .then(() => {
      console.log('\n🚀 次のステップ:');
      console.log('1. Web画面でOCR処理済み書類を確認');
      console.log('2. GASでテスト関数を実行');
      console.log('3. 実際のPDFファイルでOCRテスト');
      process.exit(0);
    })
    .catch((error) => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}

export { testOcrFlow, checkRealtimeUpdates };