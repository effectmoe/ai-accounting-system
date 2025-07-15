#!/usr/bin/env tsx

/**
 * AI Cascade Test Script
 * AIカスケード機能の動作確認
 */

import 'dotenv/config';
import { LLMCascadeManager } from '../lib/llm-cascade-manager';

async function testAICascade() {
  console.log('🧪 Testing AI Cascade System...\n');

  const aiManager = new LLMCascadeManager();

  // 簡単なテキスト生成テスト
  console.log('💬 Testing text generation...');
  
  try {
    const response = await aiManager.generateText(
      'こんにちは。簡単に自己紹介してください。',
      'あなたは親切なアシスタントです。簡潔に答えてください。'
    );

    console.log('✅ Response received:');
    console.log(response);
    console.log('\n');

    // LLM Request形式でのテスト
    console.log('📝 Testing with LLM Request format...');
    const llmResponse = await aiManager.generateResponse({
      messages: [
        {
          role: 'system',
          content: 'あなたは会計の専門家です。',
        },
        {
          role: 'user',
          content: '売上高と売上原価の違いを簡単に説明してください。',
        },
      ],
      temperature: 0.7,
      maxTokens: 200,
    });

    console.log('✅ LLM Response:');
    console.log('Provider:', llmResponse.provider);
    console.log('Success:', llmResponse.success);
    console.log('Content:', llmResponse.content);
    console.log('Usage:', llmResponse.usage);
    
  } catch (error) {
    console.error('❌ Error during AI response generation:', error);
  }

  console.log('\n✅ AI Cascade test completed!');
}

// メイン実行
testAICascade().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});