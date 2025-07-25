"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const refactor_agent_1 = require("../../../src/agents/refactor-agent");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    try {
        const { code, refactorType = 'basic' } = await request.json();
        if (!code) {
            return server_1.NextResponse.json({ error: 'コードが指定されていません' }, { status: 400 });
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
        logger_1.logger.debug('RefactorAgent テスト開始...');
        logger_1.logger.debug('リファクタリングタイプ:', refactorType);
        // RefactorAgentを実行
        const result = await refactor_agent_1.refactorAgent.execute({
            filePath: 'test.ts', // テスト用の仮想ファイルパス
            refactorType,
            preserveComments: true,
            createBackup: false,
            code: testCode, // コードを直接渡す
        });
        logger_1.logger.debug('RefactorAgent 実行結果:', result);
        return server_1.NextResponse.json({
            success: result.success,
            result: result,
        });
    }
    catch (error) {
        logger_1.logger.error('RefactorAgent エラー:', error);
        return server_1.NextResponse.json({
            error: 'リファクタリング中にエラーが発生しました',
            details: error.message
        }, { status: 500 });
    }
}
async function GET() {
    return server_1.NextResponse.json({
        message: 'RefactorAgent Test API',
        usage: 'POST /api/test-refactor with { code: "your code", refactorType: "basic" | "advanced" | "performance" | "maintainability" }',
        example: {
            code: 'function add(a, b) { return a + b; }',
            refactorType: 'basic'
        }
    });
}
