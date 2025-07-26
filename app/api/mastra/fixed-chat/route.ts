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

// 仕訳作成関数
async function createJournalEntry(params: any) {
  return {
    id: `JE-${Date.now()}`,
    ...params,
    createdAt: new Date().toISOString()
  };
}

// 顧客検索関数
async function searchCustomer(query: string) {
  return {
    results: [],
    query,
    timestamp: new Date().toISOString()
  };
}

// 所得税計算関数
async function calculateIncomeTax(income: number) {
  let tax = 0;
  if (income > 1950000) {
    tax = income * 0.05;
  }
  if (income > 3300000) {
    tax = income * 0.1 - 97500;
  }
  if (income > 6950000) {
    tax = income * 0.2 - 427500;
  }
  return {
    income,
    tax: Math.floor(tax),
    afterTax: income - Math.floor(tax)
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, agent = 'accountingAgent' } = await request.json();
    
    console.log('🤖 Fixed Mastraエージェントチャット:');
    console.log('- エージェント:', agent);
    console.log('- メッセージ:', message);
    
    // DeepSeek APIを使用して処理
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
            content: getSystemPrompt(agent)
          },
          {
            role: 'user',
            content: message
          }
        ],
        tools: getToolsForAgent(agent),
        tool_choice: 'auto',
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // ツール呼び出しがある場合は実行
    if (data.choices[0].message.tool_calls) {
      const toolCall = data.choices[0].message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log('🔧 ツール実行:', toolCall.function.name, args);
      
      let toolResult;
      switch (toolCall.function.name) {
        case 'calculate_tax':
          toolResult = await calculateTax(args.amount, args.tax_rate);
          break;
        case 'create_journal_entry':
          toolResult = await createJournalEntry(args);
          break;
        case 'search_customer':
          toolResult = await searchCustomer(args.query);
          break;
        case 'calculate_income_tax':
          toolResult = await calculateIncomeTax(args.income);
          break;
        default:
          throw new Error(`Unknown tool: ${toolCall.function.name}`);
      }
      
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
              content: getSystemPrompt(agent)
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
        agent,
        response: finalData.choices[0].message.content,
        toolCalls: [{
          tool: toolCall.function.name,
          arguments: args,
          result: toolResult
        }]
      });
    }
    
    return NextResponse.json({
      success: true,
      agent,
      response: data.choices[0].message.content,
      toolCalls: []
    });
    
  } catch (error) {
    console.error('❌ Fixed Mastraチャットエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getSystemPrompt(agent: string) {
  const prompts: Record<string, string> = {
    accountingAgent: 'あなたは日本の会計処理専門のAIエージェントです。消費税計算、仕訳作成、財務レポート生成を行います。',
    customerAgent: '顧客情報の管理、検索、分析を行うエージェントです。',
    japanTaxAgent: '日本の税制に関する計算とアドバイスを行うエージェントです。'
  };
  
  return prompts[agent] || prompts.accountingAgent;
}

function getToolsForAgent(agent: string) {
  const tools: Record<string, any[]> = {
    accountingAgent: [
      {
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
      },
      {
        type: 'function',
        function: {
          name: 'create_journal_entry',
          description: '仕訳を作成します',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: '日付' },
              description: { type: 'string', description: '摘要' },
              debit: {
                type: 'object',
                properties: {
                  account: { type: 'string', description: '借方勘定科目' },
                  amount: { type: 'number', description: '借方金額' }
                }
              },
              credit: {
                type: 'object',
                properties: {
                  account: { type: 'string', description: '貸方勘定科目' },
                  amount: { type: 'number', description: '貸方金額' }
                }
              }
            },
            required: ['date', 'description', 'debit', 'credit']
          }
        }
      }
    ],
    customerAgent: [
      {
        type: 'function',
        function: {
          name: 'search_customer',
          description: '顧客を検索します',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: '検索クエリ' }
            },
            required: ['query']
          }
        }
      }
    ],
    japanTaxAgent: [
      {
        type: 'function',
        function: {
          name: 'calculate_income_tax',
          description: '所得税を計算します',
          parameters: {
            type: 'object',
            properties: {
              income: { type: 'number', description: '年収' }
            },
            required: ['income']
          }
        }
      }
    ]
  };
  
  return tools[agent] || tools.accountingAgent;
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/mastra/fixed-chat',
    availableAgents: ['accountingAgent', 'customerAgent', 'japanTaxAgent'],
    description: '修正版Mastraチャットエンドポイント'
  });
}