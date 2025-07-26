import { NextRequest, NextResponse } from 'next/server';
import { calculateTaxTool, createJournalEntryTool, generateFinancialReportTool } from '@/src/mastra/tools/accounting-tools';
import { searchCustomersTool } from '@/src/mastra/tools/customer-tools';

export const dynamic = 'force-dynamic';

// 利用可能なツールのマッピング
const AVAILABLE_TOOLS = {
  // 会計ツール
  'calculate_tax': calculateTaxTool,
  'create_journal_entry': createJournalEntryTool,
  'generate_financial_report': generateFinancialReportTool,
  
  // 顧客ツール
  'search_customers': searchCustomersTool,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, tool, params } = body;
    
    console.log('🤖 Mastraエージェント実行リクエスト:');
    console.log('- エージェント:', agent);
    console.log('- ツール:', tool);
    console.log('- パラメータ:', JSON.stringify(params, null, 2));
    
    // ツールの存在確認
    const selectedTool = AVAILABLE_TOOLS[tool];
    if (!selectedTool) {
      return NextResponse.json({
        success: false,
        error: `ツール '${tool}' が見つかりません`,
        availableTools: Object.keys(AVAILABLE_TOOLS)
      }, { status: 400 });
    }
    
    // ツールを実行
    const result = await selectedTool.handler(params);
    
    console.log('✅ 実行成功');
    
    return NextResponse.json({
      success: true,
      agent,
      tool,
      result
    });
    
  } catch (error) {
    console.error('❌ Mastraエージェント実行エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET: 利用可能なツール一覧
export async function GET() {
  return NextResponse.json({
    agents: [
      {
        name: 'accounting',
        description: '会計処理エージェント',
        tools: ['calculate_tax', 'create_journal_entry', 'generate_financial_report']
      },
      {
        name: 'customer',
        description: '顧客管理エージェント',
        tools: ['search_customers']
      }
    ],
    totalTools: Object.keys(AVAILABLE_TOOLS).length
  });
}