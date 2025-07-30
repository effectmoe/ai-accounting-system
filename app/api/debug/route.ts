import { NextRequest, NextResponse } from 'next/server';
import { checkConnection } from '@/lib/mongodb-client';
import { mastra } from '@/src/mastra';
import { getAgentTools } from '@/src/lib/mastra-tools-registry';
import { performanceCache } from '@/lib/cache/redis-cache';

export async function GET(request: NextRequest) {
  // 🔥 緊急追加: 本番環境では無効化
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { 
        error: 'Debug endpoint is disabled in production environment',
        timestamp: new Date().toISOString()
      }, 
      { status: 403 }
    );
  }

  const debug = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      // 🔒 セキュリティ改善: URIの存在のみ確認
      MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Not Set',
      MONGODB_DB_NAME: process.env.MONGODB_DB_NAME ? '✅ Set' : '❌ Not Set',
    },
    mongodb: {
      connected: false,
      error: null as string | null,
      details: {} as any,
    },
    mastra: {
      agents: [] as string[],
      tools: {} as Record<string, any>,
    },
    cache: {
      enabled: false,
      connected: false,
      stats: {} as any,
    },
  };

  // MongoDB接続チェック（詳細情報付き）
  try {
    debug.mongodb.connected = await checkConnection();
    if (!debug.mongodb.connected) {
      debug.mongodb.error = 'Connection check returned false';
    }
  } catch (error) {
    debug.mongodb.error = error instanceof Error ? error.message : 'Unknown error';
    debug.mongodb.details = {
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
      code: (error as any)?.code,
    };
  }

  // Mastraエージェントチェック
  try {
    const agents = await mastra.getAgents();
    debug.mastra.agents = Object.keys(agents);
    
    // 各エージェントのツールを取得
    for (const agentName of Object.keys(agents)) {
      debug.mastra.tools[agentName] = getAgentTools(agentName).map(t => t.name);
    }
  } catch (error) {
    debug.mastra.tools = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // キャッシュシステムチェック
  try {
    const cacheStats = await performanceCache.getStats();
    debug.cache = {
      enabled: cacheStats.enabled,
      connected: cacheStats.connected,
      stats: cacheStats.info || {}
    };
  } catch (error) {
    debug.cache.stats = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    debug,
  });
}