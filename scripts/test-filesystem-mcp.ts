#!/usr/bin/env tsx

import { createMCPTool } from '../src/mastra/mcp/mcp-tool-adapter';
import { mcpManager } from '../src/mastra/mcp/mcp-manager';

async function testFilesystemMCP() {
  console.log('📁 Filesystem MCPツールのテスト\n');
  
  try {
    // MCPマネージャーを初期化
    await mcpManager.initialize();
    console.log('✅ MCPマネージャー初期化完了\n');
    
    if (!mcpManager.isServerConnected('filesystem')) {
      console.error('❌ Filesystemサーバーが接続されていません');
      return;
    }
    
    // 1. ディレクトリリスト
    console.log('1️⃣ カレントディレクトリのリスト:');
    const listTool = createMCPTool('filesystem', 'list_directory', 'List directory');
    try {
      const result = await listTool.handler({ path: '.' });
      console.log('✅ 成功:', result);
    } catch (e) {
      console.error('❌ エラー:', e);
    }
    
    // 2. ファイル作成
    console.log('\n2️⃣ テストファイルの作成:');
    const writeTool = createMCPTool('filesystem', 'write_file', 'Write file');
    try {
      const testContent = `# MCPテストファイル
作成日時: ${new Date().toLocaleString('ja-JP')}
このファイルはMCPツールのテストで作成されました。`;
      
      await writeTool.handler({
        path: 'test-mcp-file.md',
        content: testContent
      });
      console.log('✅ ファイル作成成功');
    } catch (e) {
      console.error('❌ エラー:', e);
    }
    
    // 3. ファイル読み込み
    console.log('\n3️⃣ ファイルの読み込み:');
    const readTool = createMCPTool('filesystem', 'read_file', 'Read file');
    try {
      const content = await readTool.handler({ path: 'test-mcp-file.md' });
      console.log('✅ 読み込み成功:');
      console.log(content);
    } catch (e) {
      console.error('❌ エラー:', e);
    }
    
    // 4. ディレクトリ作成
    console.log('\n4️⃣ ディレクトリの作成:');
    const createDirTool = createMCPTool('filesystem', 'create_directory', 'Create directory');
    try {
      await createDirTool.handler({ path: 'test-mcp-dir' });
      console.log('✅ ディレクトリ作成成功');
    } catch (e) {
      console.error('❌ エラー:', e);
    }
    
    // 5. ファイル移動
    console.log('\n5️⃣ ファイルの移動:');
    const moveTool = createMCPTool('filesystem', 'move_file', 'Move file');
    try {
      await moveTool.handler({
        source: 'test-mcp-file.md',
        destination: 'test-mcp-dir/test-mcp-file.md'
      });
      console.log('✅ ファイル移動成功');
    } catch (e) {
      console.error('❌ エラー:', e);
    }
    
    // 6. 領収書整理ツールのテスト
    console.log('\n6️⃣ 領収書整理ツールのテスト:');
    const { organizeReceiptsTool } = require('../src/mastra/agents/tools/mcp-accounting-tools');
    
    // テスト用ディレクトリとファイルを作成
    console.log('テスト用の領収書ファイルを作成中...');
    const testReceipts = [
      'receipt_2025-01-15_store1.pdf',
      'receipt_2025-01-20_store2.pdf',
      'receipt_2025-02-05_store3.pdf',
      'receipt_2025-02-10_store4.pdf',
    ];
    
    await createDirTool.handler({ path: 'test-receipts' });
    
    for (const receipt of testReceipts) {
      await writeTool.handler({
        path: `test-receipts/${receipt}`,
        content: `Mock receipt file: ${receipt}`
      });
    }
    
    // 整理実行
    try {
      const result = await organizeReceiptsTool.handler({
        source_directory: 'test-receipts',
        target_directory: 'test-receipts-organized'
      });
      console.log('✅ 領収書整理成功:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('❌ エラー:', e);
    }
    
  } catch (error) {
    console.error('❌ 致命的エラー:', error);
  } finally {
    console.log('\n🧹 クリーンアップ...');
    await mcpManager.shutdown();
    console.log('✅ 完了');
  }
}

// メイン実行
if (require.main === module) {
  testFilesystemMCP()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}