import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIntegration, MastraLog } from '@/services/github-integration';

// ログの保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logs } = body;

    if (!Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Logs must be an array' },
        { status: 400 }
      );
    }

    const github = getGitHubIntegration();
    const result = await github.saveLogs(logs);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Log save error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// レポート生成
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    const github = getGitHubIntegration();
    const result = await github.generateReport(
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}