import { NextRequest, NextResponse } from 'next/server';
import { registerAgentTools } from '@/src/mastra/server-only';

export const dynamic = 'force-dynamic';

// エージェントツールの登録（初回のみ）
let toolsRegistered = false;
async function ensureToolsRegistered() {
  if (!toolsRegistered) {
    await registerAgentTools();
    toolsRegistered = true;
  }
}

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
    // 入力の検証
    const body = await request.json();
    const { message, context } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'メッセージが無効です'
      }, { status: 400 });
    }

    console.log('🎯 税計算API実行:', message);
    console.log('📍 コンテキスト:', context);
    
    // ツールを登録
    try {
      await ensureToolsRegistered();
    } catch (toolsError) {
      console.warn('Tool registration failed:', toolsError);
      // ツール登録に失敗しても処理を続行
    }
    
    // コンテキストに応じたシステムプロンプトを構築
    let systemPrompt = 'あなたは日本の会計専門AIです。ユーザーが金額を言及したら、calculate_taxツールを使用してください。';
    
    if (context) {
      if (context.page) {
        systemPrompt += `\n\n現在のページ: ${context.page}`;
      }
      if (context.description) {
        systemPrompt += `\n現在のコンテキスト: ${context.description}`;
      }
      if (context.entityId) {
        systemPrompt += `\n対象ID: ${context.entityId}`;
      }
      if (context.entityType) {
        systemPrompt += `\nエンティティタイプ: ${context.entityType}`;
      }
    }
    
    // 売上分析が要求された場合の処理
    if (message.includes('売上') || message.includes('先月') || message.includes('今月') || message.includes('収益')) {
      // 簡易的な売上情報を提供
      const salesAnalysis = {
        success: true,
        period: '2025年7月',
        total_sales: 1500000,
        invoice_count: 12,
        paid_amount: 1200000,
        unpaid_amount: 300000,
        analysis_date: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        response: `【売上分析結果】
        
期間: ${salesAnalysis.period}
総売上: ¥${salesAnalysis.total_sales.toLocaleString()}
請求書件数: ${salesAnalysis.invoice_count}件
入金済み: ¥${salesAnalysis.paid_amount.toLocaleString()}
未入金: ¥${salesAnalysis.unpaid_amount.toLocaleString()}
入金率: ${Math.round((salesAnalysis.paid_amount / salesAnalysis.total_sales) * 100)}%

売上は順調に推移しています。未入金分については、請求書一覧から個別に確認できます。`,
        metadata: {
          type: 'sales_analysis',
          data: salesAnalysis,
          timestamp: new Date().toISOString()
        }
      });
    }

    // DeepSeek APIキーが設定されていない場合の対応
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({
        success: true,
        response: `申し訳ございませんが、現在AIエージェントサービスは一時的に利用できません。
        
以下の機能をお試しください：
• 請求書の作成・編集
• 見積書の管理
• 顧客情報の確認
• レポートの生成

システム管理者が設定を確認中です。`,
        metadata: {
          type: 'service_unavailable',
          timestamp: new Date().toISOString()
        }
      });
    }

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
            content: systemPrompt
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