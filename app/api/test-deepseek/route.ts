import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function GET() {
  try {
    // 環境変数の確認
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    
    const envStatus = {
      hasDeepSeekKey: !!deepseekApiKey,
      deepSeekKeyLength: deepseekApiKey?.length || 0,
      deepSeekKeyPrefix: deepseekApiKey ? deepseekApiKey.substring(0, 10) + '...' : 'not set',
      hasOpenAIKey: !!openaiApiKey,
      hasAzureKey: !!azureApiKey,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    };

    // DeepSeek APIをテスト
    let deepseekTestResult = { success: false, error: '', model: '' };
    if (deepseekApiKey) {
      try {
        const deepseekClient = new OpenAI({
          apiKey: deepseekApiKey,
          baseURL: 'https://api.deepseek.com',
        });
        
        // 簡単なテストリクエスト
        const completion = await deepseekClient.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Say hello' }],
          max_tokens: 10,
        });
        
        deepseekTestResult = {
          success: true,
          error: '',
          model: 'deepseek-chat',
          response: completion.choices[0]?.message?.content || 'no response',
        };
      } catch (error) {
        deepseekTestResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          model: 'deepseek-chat',
        };
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envStatus,
      deepseekTest: deepseekTestResult,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}