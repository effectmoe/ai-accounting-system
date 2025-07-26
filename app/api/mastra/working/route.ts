import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 税金計算関数
async function calculateTax(amount: number, taxRate: number = 0.1) {
  const tax = amount * taxRate;
  return {
    success: true,
    taxable_amount: amount,
    tax_rate: taxRate,
    tax_amount: tax,
    total_amount: amount + tax,
    calculation_date: new Date().toISOString()
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    console.log('🎯 税計算API実行:', message);
    
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
            content: 'あなたは日本の会計専門AIです。ユーザーが金額を言及したら、calculate_taxツールを使用してください。'
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
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number', description: '税抜き金額' },
                tax_rate: { type: 'number', description: '税率（デフォルト0.1）' }
              },
              required: ['amount']
            }
          }
        }],
        tool_choice: 'auto',
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    // ツール呼び出しがある場合は実行
    if (data.choices[0].message.tool_calls) {
      const toolCall = data.choices[0].message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log('🔧 ツール実行:', toolCall.function.name, args);
      
      const toolResult = await calculateTax(args.amount, args.tax_rate);
      
      // 結果を含めて再度DeepSeekに送信
      const finalResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
              content: 'あなたは日本の会計専門AIです。'
            },
            {
              role: 'user',
              content: message
            },
            data.choices[0].message,
            {
              role: 'tool',
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id
            }
          ],
          temperature: 0.1
        })
      });
      
      const finalData = await finalResponse.json();
      
      return NextResponse.json({
        success: true,
        response: finalData.choices[0].message.content,
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
    provider: 'deepseek',
    tools: ['calculate_tax'],
    description: 'DeepSeekを使用した税計算API'
  });
}