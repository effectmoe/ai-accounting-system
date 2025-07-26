import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ツール実装
const tools = {
  // 会計ツール
  calculate_tax: async ({ amount, taxRate = 10 }: { amount: number; taxRate?: number }) => {
    const tax = Math.floor(amount * (taxRate / 100));
    const total = amount + tax;
    return { 
      success: true,
      amount, 
      tax, 
      total, 
      taxRate,
      calculation_date: new Date().toISOString()
    };
  },
  
  create_journal_entry: async (params: {
    date: string;
    description: string;
    debit: { account: string; amount: number };
    credit: { account: string; amount: number };
  }) => {
    return {
      success: true,
      id: `JE-${Date.now()}`,
      ...params,
      createdAt: new Date().toISOString(),
      status: 'created'
    };
  },
  
  generate_financial_report: async (params: {
    startDate: string;
    endDate: string;
    reportType: string;
  }) => {
    return {
      success: true,
      reportId: `FR-${Date.now()}`,
      ...params,
      generatedAt: new Date().toISOString(),
      data: {
        revenue: 5000000,
        expenses: 3000000,
        profit: 2000000,
        taxAmount: 200000
      }
    };
  },
  
  // 顧客ツール
  search_customers: async ({ query }: { query: string }) => {
    return {
      success: true,
      results: [
        { id: 1, name: `顧客A (${query})`, status: 'active' },
        { id: 2, name: `顧客B (${query})`, status: 'active' }
      ],
      query,
      timestamp: new Date().toISOString()
    };
  },
  
  // 税務ツール
  calculate_income_tax: async ({ income }: { income: number }) => {
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
      success: true,
      income,
      tax: Math.floor(tax),
      afterTax: income - Math.floor(tax),
      calculationDate: new Date().toISOString()
    };
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, tool, params } = body;
    
    console.log('🤖 Fixed Mastraエージェント実行:');
    console.log('- エージェント:', agent);
    console.log('- ツール:', tool);
    console.log('- パラメータ:', JSON.stringify(params, null, 2));
    
    // ツールの存在確認
    const toolFunction = tools[tool as keyof typeof tools];
    if (!toolFunction) {
      return NextResponse.json({
        success: false,
        error: `ツール '${tool}' が見つかりません`,
        availableTools: Object.keys(tools)
      }, { status: 400 });
    }
    
    // ツールを実行
    const result = await toolFunction(params);
    
    console.log('✅ 実行成功:', result);
    
    return NextResponse.json({
      success: true,
      agent,
      tool,
      result,
      executedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ エージェント実行エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/mastra/fixed-execute',
    availableTools: Object.keys(tools),
    description: '修正版Mastraエージェント実行エンドポイント'
  });
}