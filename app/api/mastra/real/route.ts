import { NextRequest, NextResponse } from 'next/server';
import { Mastra } from '@mastra/core';
import { createOpenAICompatible } from '@mastra/core';

export const dynamic = 'force-dynamic';

// DeepSeekプロバイダーを設定
const deepseekProvider = createOpenAICompatible({
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
  models: {
    'deepseek-chat': {
      id: 'deepseek-chat',
      contextWindow: 32768,
      maxCompletionTokens: 4096,
    }
  }
});

// 税金計算ツール
const calculateTaxTool = {
  name: 'calculate_tax',
  description: '日本の消費税を計算します',
  parameters: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: '税抜き金額' },
      tax_rate: { type: 'number', description: '税率（デフォルト0.1）' }
    },
    required: ['amount']
  },
  execute: async (params: any) => {
    const amount = params.amount;
    const rate = params.tax_rate || 0.1;
    const tax = amount * rate;
    
    return {
      success: true,
      taxable_amount: amount,
      tax_rate: rate,
      tax_amount: tax,
      total_amount: amount + tax,
      calculation_date: new Date().toISOString()
    };
  }
};

// Mastraインスタンスを作成
const mastra = new Mastra({
  name: 'accounting-automation-real',
  providers: {
    deepseek: deepseekProvider
  },
  tools: {
    calculate_tax: calculateTaxTool
  },
  telemetry: {
    enabled: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    console.log('🎯 本物のMastra実行:', message);
    
    // Mastraで直接実行
    const result = await mastra.run({
      model: {
        provider: 'deepseek',
        name: 'deepseek-chat'
      },
      messages: [
        {
          role: 'system',
          content: 'あなたは日本の会計専門AIです。ユーザーの要求に応じて適切なツールを使用してください。'
        },
        {
          role: 'user',
          content: message
        }
      ],
      tools: ['calculate_tax'],
      toolChoice: 'auto'
    });
    
    console.log('✅ Mastra実行結果:', result);
    
    return NextResponse.json({
      success: true,
      response: result.text,
      toolCalls: result.toolCalls || []
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    framework: '@mastra/core',
    provider: 'deepseek',
    tools: ['calculate_tax']
  });
}