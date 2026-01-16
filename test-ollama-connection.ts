/**
 * Ollama接続テストスクリプト
 */

import { OllamaClient } from './lib/ollama-client';

async function testOllamaConnection() {
  console.log('🔍 Ollama接続テスト開始...\n');

  try {
    // クライアント作成
    const client = new OllamaClient();
    console.log('✅ Ollamaクライアント作成成功');
    console.log('設定:', client.getConfig());
    console.log('');

    // 利用可能性確認
    console.log('🔍 Ollama利用可能性確認中...');
    const isAvailable = await client.checkAvailability();

    if (!isAvailable) {
      console.error('❌ Ollamaが利用できません');
      console.error('Ollamaが起動しているか確認してください: http://localhost:11434');
      process.exit(1);
    }

    console.log('✅ Ollama利用可能\n');

    // シンプルなテスト
    console.log('🔍 簡単なプロンプトテスト...');
    const response = await client.complete('こんにちは！あなたは誰ですか？', {
      temperature: 0,
      num_predict: 100
    });

    console.log('✅ レスポンス受信:');
    console.log(response);
    console.log('');

    // OCR用のJSON抽出テスト
    console.log('🔍 JSON抽出テスト...');
    const jsonPrompt = `以下のテキストから会社名と金額を抽出してJSONで返してください。

テキスト:
合同会社アソウタイセイプリンティング
請求書
合計金額: 5,500円

以下の形式で返してください:
\`\`\`json
{
  "companyName": "会社名",
  "totalAmount": 金額
}
\`\`\``;

    const jsonResponse = await client.complete(jsonPrompt, {
      temperature: 0,
      num_predict: 200
    });

    console.log('✅ JSONレスポンス:');
    console.log(jsonResponse);
    console.log('');

    // JSON抽出
    const jsonMatch = jsonResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[1]);
      console.log('✅ JSON抽出成功:');
      console.log(extracted);
    } else {
      console.log('⚠️  JSON形式が見つかりませんでした');
    }

    console.log('\n✅ すべてのテストが成功しました！');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

testOllamaConnection();
