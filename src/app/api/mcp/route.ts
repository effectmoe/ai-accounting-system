import { NextRequest, NextResponse } from 'next/server';
import { initializeMCPServers } from '@/lib/mcp-config';
import { MCPService } from '@/services/mcp-service';

// MCPサーバーの初期化状態
let isInitialized = false;

async function ensureMCPInitialized() {
  if (!isInitialized) {
    await initializeMCPServers();
    isInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureMCPInitialized();
    
    const body = await request.json();
    const { server, action, params } = body;
    
    // サーバーとアクションの検証
    if (!server || !action) {
      return NextResponse.json(
        { error: 'Server and action are required' },
        { status: 400 }
      );
    }
    
    // MCPサービス経由で実行
    let result;
    switch (server) {
      case 'gas':
        if (action in MCPService.gas) {
          result = await (MCPService.gas as any)[action](...Object.values(params || {}));
        } else {
          throw new Error(`Unknown GAS action: ${action}`);
        }
        break;
        
      case 'gdrive':
        if (action in MCPService.gdrive) {
          result = await (MCPService.gdrive as any)[action](...Object.values(params || {}));
        } else {
          throw new Error(`Unknown Google Drive action: ${action}`);
        }
        break;
        
      case 'supabase':
        if (action in MCPService.supabase) {
          result = await (MCPService.supabase as any)[action](...Object.values(params || {}));
        } else {
          throw new Error(`Unknown Supabase action: ${action}`);
        }
        break;
        
      default:
        throw new Error(`Unknown server: ${server}`);
    }
    
    return NextResponse.json({ success: true, result });
    
  } catch (error) {
    console.error('MCP API error:', error);
    return NextResponse.json(
      { 
        error: 'MCP operation failed', 
        detail: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// MCPサーバーの状態確認
export async function GET(request: NextRequest) {
  try {
    await ensureMCPInitialized();
    
    return NextResponse.json({
      status: 'ready',
      servers: {
        gas: 'Google Apps Script MCP',
        gdrive: 'Google Drive MCP',
        supabase: 'Supabase MCP'
      },
      initialized: isInitialized
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}