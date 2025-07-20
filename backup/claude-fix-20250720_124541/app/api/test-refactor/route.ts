import { NextResponse } from 'next/server';
import { refactorAgent } from '../../../src/agents/refactor-agent';

import { logger } from '@/lib/logger';
export async function POST(request: Request) {
  try {
    const { code, refactorType = 'basic' } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'コードが指定されていません' },
        { status: 400 }
      );
    }

    // テスト用のサンプルコード
    const testCode = code || `
function processData(d) {
  let a = d.items;
  let b = [];
  
  for (let i = 0; i < a.length; i++) {
    let x = a[i];
    if (x.status === 'active') {
      b.push(x);
    }
  }
  
  return b;
}`;

    logger.debug('RefactorAgent テスト開始...');
    logger.debug('リファクタリングタイプ:', refactorType);

    // RefactorAgentを実行
    const result = await refactorAgent.execute({
      filePath: 'test.ts', // テスト用の仮想ファイルパス
      refactorType,
      preserveComments: true,
      createBackup: false,
      code: testCode, // コードを直接渡す
    } as any);

    logger.debug('RefactorAgent 実行結果:', result);

    return NextResponse.json({
      success: result.success,
      result: result,
    });

  } catch (error) {
    logger.error('RefactorAgent エラー:', error);
    return NextResponse.json(
      { 
        error: 'リファクタリング中にエラーが発生しました',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'RefactorAgent Test API',
    usage: 'POST /api/test-refactor with { code: "your code", refactorType: "basic" | "advanced" | "performance" | "maintainability" }',
    example: {
      code: 'function add(a, b) { return a + b; }',
      refactorType: 'basic'
    }
  });
}