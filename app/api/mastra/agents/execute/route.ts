import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';

// This is a NEW endpoint that won't affect existing functionality
// 既存の機能には一切影響を与えない新しいエンドポイント
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentName, operation, data } = body;

    if (!agentName || !operation) {
      return NextResponse.json(
        { error: 'agentName and operation are required' },
        { status: 400 }
      );
    }

    // Get the agent
    const agents = await mastra.getAgents();
    const agent = agents[agentName];

    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentName} not found` },
        { status: 404 }
      );
    }

    // Execute the agent
    const result = await agent.execute({
      operation,
      data
    });

    return NextResponse.json({
      success: true,
      result,
      executedBy: agentName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error executing Mastra agent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute agent',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// List available agents
export async function GET() {
  try {
    const agents = await mastra.getAgents();
    const agentList = Object.keys(agents).map(key => ({
      name: key,
      description: agents[key].description || 'No description available'
    }));

    return NextResponse.json({
      agents: agentList,
      count: agentList.length,
      status: 'ready'
    });

  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list agents',
        details: error.message 
      },
      { status: 500 }
    );
  }
}