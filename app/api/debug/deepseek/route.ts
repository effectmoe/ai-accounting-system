import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // DeepSeek API の設定状態を確認
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const hasKey = !!deepseekKey;
    const keyPrefix = deepseekKey?.substring(0, 10) || 'not set';
    const keyLength = deepseekKey?.length || 0;
    const containsTestKey = deepseekKey?.includes('test-key') || false;
    
    // DeepSeek APIのテスト呼び出し
    let apiTestResult = null;
    let apiTestError = null;
    
    if (hasKey && !containsTestKey) {
      try {
        const testResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'user',
                content: 'Hello, this is a test. Reply with "OK" only.'
              }
            ],
            max_tokens: 10,
            temperature: 0
          })
        });
        
        if (testResponse.ok) {
          const data = await testResponse.json();
          apiTestResult = {
            status: 'success',
            model: data.model,
            hasChoices: !!data.choices,
            responseContent: data.choices?.[0]?.message?.content
          };
        } else {
          const errorText = await testResponse.text();
          apiTestError = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            error: errorText
          };
        }
      } catch (error) {
        apiTestError = {
          type: 'network_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'UnknownError'
        };
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV
      },
      deepseekApiKey: {
        hasKey,
        keyPrefix,
        keyLength,
        containsTestKey,
        isValid: hasKey && !containsTestKey && keyLength > 20
      },
      apiTest: {
        performed: hasKey && !containsTestKey,
        result: apiTestResult,
        error: apiTestError
      },
      otherKeys: {
        hasAzureKey: !!process.env.AZURE_FORM_RECOGNIZER_KEY,
        hasAzureEndpoint: !!process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
        hasMongoUri: !!process.env.MONGODB_URI,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}