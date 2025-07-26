#!/usr/bin/env tsx

import { mastra } from '../src/mastra';
import { logger } from '../lib/logger';

async function refactorMCPCode() {
  console.log('🔧 MCP統合コードのリファクタリングを開始します...\n');
  
  const filesToRefactor = [
    '/src/mastra/mcp/mcp-manager.ts',
    '/src/mastra/mcp/mcp-client.ts',
    '/src/mastra/mcp/mcp-servers.ts',
    '/src/mastra/mcp/mcp-tool-adapter.ts',
    '/src/mastra/agents/tools/mcp-accounting-tools.ts',
    '/src/mastra/agents/tools/mcp-tax-tools.ts',
  ];
  
  const refactoringGuidelines = `
以下のリファクタリング基準に従って、MCPコードを改善してください：

1. **型安全性の向上**
   - any型を具体的な型定義に置き換える
   - インターフェースとタイプを明確に定義する
   - エラー処理の型を明確にする

2. **コードの整理**
   - 重複コードを削除し、共通関数に抽出する
   - 長いメソッドを小さな関数に分割する
   - 適切な名前付けを行う

3. **エラーハンドリングの改善**
   - try-catchブロックを適切に配置する
   - エラーメッセージを明確にする
   - カスタムエラークラスを使用する

4. **パフォーマンスの最適化**
   - 不要な処理を削除する
   - 非同期処理を適切に実装する
   - リソースの適切な管理（接続の開放など）

5. **保守性の向上**
   - 適切なコメントを追加する（日本語）
   - 設定の外部化
   - テスタビリティの向上

6. **MCPサーバー固有の改善**
   - 各MCPサーバーの特性を考慮した最適化
   - ツール名の一貫性確保
   - 環境変数の適切な管理
  `;
  
  try {
    // リファクタリングエージェントを使用
    const result = await mastra.agents.refactorAgent.execute({
      prompt: `
以下のMCP統合コードをリファクタリングしてください。

対象ファイル:
${filesToRefactor.map(f => `- ${f}`).join('\n')}

リファクタリング基準:
${refactoringGuidelines}

各ファイルごとに以下を実行してください：
1. 現在のコードを読み込む
2. 問題点を特定する
3. リファクタリング案を作成する
4. コードを改善する
5. 変更内容を説明する

特に注意すべき点：
- any型の使用を避ける
- エラーハンドリングを強化する
- 日本語コメントで説明を充実させる
- MCP固有の最適化を行う
      `,
    });
    
    console.log('✅ リファクタリング完了');
    console.log('結果:', result);
    
    return result;
  } catch (error) {
    logger.error('リファクタリングエラー:', error);
    throw error;
  }
}

// メイン実行
if (require.main === module) {
  refactorMCPCode()
    .then(() => {
      console.log('\n✅ リファクタリング処理が完了しました');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}