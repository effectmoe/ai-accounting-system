import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function GET() {
  try {
    // ネットワーク接続テスト
    let networkTest = { success: false, error: '' };
    try {
      const testResponse = await fetch('https://api.deepseek.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
        },
      });
      networkTest = {
        success: testResponse.ok,
        status: testResponse.status,
        statusText: testResponse.statusText,
        headers: Object.fromEntries(testResponse.headers.entries()),
      };
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        networkTest.error = errorText;
      } else {
        const data = await testResponse.json();
        networkTest.data = data;
      }
    } catch (error) {
      networkTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
    let directApiTestResult = { success: false, error: '', data: null };
    
    if (deepseekApiKey) {
      // 直接APIコールテスト
      try {
        const directResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepseekApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: 'Say hello' }],
            max_tokens: 10,
          }),
        });
        
        directApiTestResult = {
          success: directResponse.ok,
          status: directResponse.status,
          statusText: directResponse.statusText,
          data: await directResponse.json(),
        };
      } catch (error) {
        directApiTestResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
      
      // OpenAI SDK経由のテスト
      try {
        const deepseekClient = new OpenAI({
          apiKey: deepseekApiKey,
          baseURL: 'https://api.deepseek.com/v1',
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
          errorDetails: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
            cause: error.cause,
            code: (error as any).code,
            response: (error as any).response?.data,
          } : null,
        };
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envStatus,
      networkTest: networkTest,
      directApiTest: directApiTestResult,
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