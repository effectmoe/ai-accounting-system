import { NextRequest, NextResponse } from 'next/server';
import packageJson from '@/package.json';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      version: {
        application: packageJson.version || '1.0.1',
        mastra: '0.10.0',
        nextjs: packageJson.dependencies.next,
        nodejs: process.version
      },
      framework: {
        name: 'Mastra',
        version: '0.10.0',
        stable: true,
        beta: false
      },
      deployment: {
        platform: 'Vercel',
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'https://accounting-automation.vercel.app'
      },
      agents: {
        count: 11,
        list: [
          'accountingAgent',
          'customerAgent',
          'databaseAgent',
          'deploymentAgent',
          'japanTaxAgent',
          'ocrAgent',
          'problemSolvingAgent',
          'productAgent',
          'refactorAgent',
          'uiAgent',
          'constructionAgent'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get version',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}