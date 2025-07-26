import { NextRequest, NextResponse } from 'next/server';
import { getMastra, registerAgentTools } from '@/src/mastra/server-only';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// エージェントツールの登録（初回のみ）
let toolsRegistered = false;
async function ensureToolsRegistered() {
  if (!toolsRegistered) {
    await registerAgentTools();
    toolsRegistered = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureToolsRegistered();
    
    const { demo_type, params } = await request.json();
    
    logger.info('🎯 MCP Tools Demo:', { demo_type, params });
    
    let result: any = null;
    
    switch (demo_type) {
      case 'organize_receipts':
        // 会計エージェントで領収書整理
        const { mastra } = await getMastra();
        const accountingAgent = mastra.agents.accountingAgent;
        result = await accountingAgent.execute({
          prompt: `organize_receipts ツールを使用して、領収書ファイルを整理してください。
          パラメータ: ${JSON.stringify(params)}`,
        });
        break;
        
      case 'search_tax_info':
        // 会計エージェントで税制情報検索
        const { mastra: mastra2 } = await getMastra();
        const accountingAgent2 = mastra2.agents.accountingAgent;
        result = await accountingAgent2.execute({
          prompt: `search_and_save_tax_info ツールを使用して、税制情報を検索してください。
          パラメータ: ${JSON.stringify(params)}`,
        });
        break;
        
      case 'research_tax_law':
        // 税務エージェントで税法調査
        const { mastra: mastra3 } = await getMastra();
        const taxAgent = mastra3.agents.japanTaxAgent;
        result = await taxAgent.execute({
          prompt: `research_tax_law ツールを使用して、税法について調査してください。
          パラメータ: ${JSON.stringify(params)}`,
        });
        break;
        
      case 'scrape_tax_info':
        // 税務エージェントでe-Tax情報取得
        const { mastra: mastra4 } = await getMastra();
        const taxAgent2 = mastra4.agents.japanTaxAgent;
        result = await taxAgent2.execute({
          prompt: `scrape_etax_info ツールを使用して、e-Taxから情報を取得してください。
          パラメータ: ${JSON.stringify(params)}`,
        });
        break;
        
      case 'list_mcp_tools':
        // 利用可能なMCPツールをリスト
        const { mastra: mastra5 } = await getMastra();
        const agents = ['accountingAgent', 'japanTaxAgent', 'customerAgent'];
        const toolsList: Record<string, any[]> = {};
        
        for (const agentName of agents) {
          const agent = mastra5.agents[agentName];
          if (agent && agent.tools) {
            toolsList[agentName] = agent.tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description,
              isMCPTool: tool.name.includes('_'),
            }));
          }
        }
        
        result = {
          success: true,
          available_tools: toolsList,
          mcp_tools_count: Object.values(toolsList)
            .flat()
            .filter(t => t.isMCPTool).length,
        };
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown demo type: ${demo_type}`,
          available_demos: [
            'organize_receipts',
            'search_tax_info',
            'research_tax_law',
            'scrape_tax_info',
            'list_mcp_tools',
          ],
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      demo_type,
      result,
    });
    
  } catch (error) {
    logger.error('MCP Tools Demo error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/mastra/demo/mcp-tools',
    description: 'MCP Tools demonstration endpoint',
    available_demos: [
      {
        demo_type: 'organize_receipts',
        description: '領収書ファイルを年月別に自動整理',
        required_params: {
          source_directory: 'string - 領収書ファイルのソースディレクトリ',
          target_directory: 'string (optional) - 整理先ディレクトリ',
        },
      },
      {
        demo_type: 'search_tax_info',
        description: '税制情報を検索してレポート作成',
        required_params: {
          topic: 'string - 検索トピック（例：インボイス制度）',
          save_directory: 'string (optional) - レポート保存先',
        },
      },
      {
        demo_type: 'research_tax_law',
        description: '税法の詳細調査',
        required_params: {
          tax_topic: 'string - 調査する税法トピック',
          specific_questions: 'string[] (optional) - 具体的な質問',
          include_examples: 'boolean (optional) - 実例を含めるか',
        },
      },
      {
        demo_type: 'scrape_tax_info',
        description: 'e-Taxから情報取得',
        required_params: {
          info_type: 'string - tax_rates | filing_deadlines | tax_forms | announcements',
          save_screenshot: 'boolean (optional) - スクリーンショット保存',
        },
      },
      {
        demo_type: 'list_mcp_tools',
        description: '利用可能なMCPツールをリスト',
        required_params: {},
      },
    ],
    example_curl: `curl -X POST http://localhost:3000/api/mastra/demo/mcp-tools \\
  -H "Content-Type: application/json" \\
  -d '{
    "demo_type": "organize_receipts",
    "params": {
      "source_directory": "/path/to/receipts",
      "target_directory": "/path/to/organized"
    }
  }'`,
  });
}