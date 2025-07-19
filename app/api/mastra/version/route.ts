import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIntegration, MastraVersion } from '@/services/github-integration';

import { logger } from '@/lib/logger';
// バージョンの保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { version, changes, agents, workflows, config } = body;

    if (!version || !changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: 'Version and changes are required' },
        { status: 400 }
      );
    }

    const versionData: MastraVersion = {
      version,
      timestamp: new Date().toISOString(),
      changes,
      agents: agents || [],
      workflows: workflows || [],
      config: config || {}
    };

    const github = getGitHubIntegration();
    const result = await github.saveVersion(versionData);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Version save error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save version',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 最新バージョンの取得
export async function GET() {
  try {
    const github = getGitHubIntegration();
    const version = await github.getLatestVersion();

    if (!version) {
      return NextResponse.json({
        version: '0.0.0',
        message: 'No version found'
      });
    }

    return NextResponse.json(version);
  } catch (error) {
    logger.error('Get version error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get version',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}