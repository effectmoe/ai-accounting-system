import { NextRequest, NextResponse } from 'next/server';
import { Mastra, Agent } from '@mastra/core';
import { getDatabase } from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

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
  handler: async (params: any) => {
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

// 会計エージェントを作成
const accountingAgent = new Agent({
  name: 'real-accounting-agent',
  description: '日本の会計処理を行うAIエージェント',
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat',
  },
  instructions: 'あなたは日本の会計専門AIです。ユーザーの要求に応じて適切なツールを使用してください。',
  tools: [calculateTaxTool]
});

// Mastraインスタンスを作成
const mastra = new Mastra({
  name: 'accounting-automation-real',
  agents: {
    accountingAgent
  },
  telemetry: {
    enabled: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    console.log('🎯 本物のMastraエージェント実行:', message);
    
    // エージェントを実行
    const result = await accountingAgent.execute({
      prompt: message,
      model: {
        provider: 'deepseek',
        name: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY
      }
    });
    
    console.log('✅ エージェント実行結果:', result);
    
    // DeepSeek APIを直接呼び出す
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
        tools: [{
          type: 'function',
          function: {
            name: 'calculate_tax',
            description: '日本の消費税を計算します',
            parameters: calculateTaxTool.parameters
          }
        }],
        tool_choice: 'auto'
      })
    });
    
    const data = await response.json();
    
    // ツール呼び出しがある場合は実行
    if (data.choices[0].message.tool_calls) {
      const toolCall = data.choices[0].message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      const toolResult = await calculateTaxTool.handler(args);
      
      return NextResponse.json({
        success: true,
        response: `${args.amount}円の売上に対する消費税は${toolResult.tax_amount}円です。税込総額は${toolResult.total_amount}円となります。`,
        toolCalls: [{
          tool: 'calculate_tax',
          arguments: args,
          result: toolResult
        }]
      });
    }
    
    return NextResponse.json({
      success: true,
      response: data.choices[0].message.content,
      toolCalls: []
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