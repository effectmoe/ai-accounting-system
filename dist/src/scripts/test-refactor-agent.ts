import { refactorAgent } from '../agents/refactor-agent';
import * as fs from 'fs/promises';
import * as path from 'path';

// テスト用のサンプルコードファイルを作成
async function createTestFile(): Promise<string> {
  const testFilePath = path.join(__dirname, 'test-refactor-sample.ts');
  
  const sampleCode = `
// This is a sample file for testing refactoring
function processData(d) {
  let a = d.items;
  let b = [];
  
  for (let i = 0; i < a.length; i++) {
    let x = a[i];
    if (x.status === 'active') {
      if (x.value > 100) {
        if (x.type === 'premium') {
          b.push(x);
        }
      }
    }
  }
  
  // Duplicate code block
  for (let i = 0; i < a.length; i++) {
    let x = a[i];
    if (x.status === 'active') {
      if (x.value > 100) {
        if (x.type === 'premium') {
          console.log(x);
        }
      }
    }
  }
  
  return b;
}

// Long function that should be split
function handleUserRequest(req) {
  // Validation
  if (!req.userId) {
    throw new Error('User ID is required');
  }
  if (!req.action) {
    throw new Error('Action is required');
  }
  
  // Processing
  let result = null;
  if (req.action === 'create') {
    result = { id: Math.random(), status: 'created' };
  } else if (req.action === 'update') {
    result = { id: req.id, status: 'updated' };
  } else if (req.action === 'delete') {
    result = { id: req.id, status: 'deleted' };
  }
  
  // Logging
  console.log('Request processed:', req);
  console.log('Result:', result);
  
  // Notification
  if (result.status === 'created') {
    sendEmail(req.userId, 'Item created');
  } else if (result.status === 'updated') {
    sendEmail(req.userId, 'Item updated');
  } else if (result.status === 'deleted') {
    sendEmail(req.userId, 'Item deleted');
  }
  
  return result;
}

function sendEmail(userId, message) {
  console.log(\`Sending email to \${userId}: \${message}\`);
}
`;

  await fs.writeFile(testFilePath, sampleCode.trim(), 'utf-8');
  return testFilePath;
}

// メインのテスト関数
async function testRefactorAgent() {
  console.log('=== RefactorAgent Test ===\n');
  
  try {
    // テストファイルを作成
    const testFilePath = await createTestFile();
    console.log(`✅ テストファイルを作成しました: ${testFilePath}\n`);
    
    // テストケース1: 基本的なリファクタリング
    console.log('📝 テスト1: 基本的なリファクタリング');
    console.log('- 関数分割、変数名改善、重複除去\n');
    
    const result1 = await refactorAgent.execute({
      filePath: testFilePath,
      refactorType: 'basic',
      preserveComments: true,
      createBackup: true,
    });
    
    if (result1.success) {
      console.log('✅ リファクタリング成功！');
      console.log(`- 複雑度: ${result1.metrics.complexityBefore} → ${result1.metrics.complexityAfter}`);
      console.log(`- 行数: ${result1.metrics.linesOfCodeBefore} → ${result1.metrics.linesOfCodeAfter}`);
      console.log(`- 変更数: ${result1.changes.length}`);
      if (result1.backupPath) {
        console.log(`- バックアップ: ${result1.backupPath}`);
      }
      console.log('\n変更内容のサンプル:');
      result1.changes.slice(0, 3).forEach(change => {
        console.log(`  - ${change.description}`);
      });
    } else {
      console.error('❌ リファクタリング失敗:', result1.error);
    }
    
    console.log('\n---\n');
    
    // テストケース2: パフォーマンス最適化
    console.log('📝 テスト2: パフォーマンス最適化');
    
    // 元のファイルを復元（バックアップから）
    if (result1.backupPath) {
      const backupContent = await fs.readFile(result1.backupPath, 'utf-8');
      await fs.writeFile(testFilePath, backupContent);
    }
    
    const result2 = await refactorAgent.execute({
      filePath: testFilePath,
      refactorType: 'performance',
      preserveComments: false,
      createBackup: true,
      maxComplexity: 10,
    });
    
    if (result2.success) {
      console.log('✅ パフォーマンス最適化成功！');
      console.log(`- 複雑度: ${result2.metrics.complexityBefore} → ${result2.metrics.complexityAfter}`);
      console.log(`- 行数: ${result2.metrics.linesOfCodeBefore} → ${result2.metrics.linesOfCodeAfter}`);
    } else {
      console.error('❌ パフォーマンス最適化失敗:', result2.error);
    }
    
    console.log('\n---\n');
    
    // テストケース3: エラーケース（存在しないファイル）
    console.log('📝 テスト3: エラーケース（存在しないファイル）');
    
    const result3 = await refactorAgent.execute({
      filePath: '/path/to/nonexistent/file.ts',
      refactorType: 'basic',
      preserveComments: true,
      createBackup: false,
    });
    
    if (!result3.success) {
      console.log('✅ エラーが正しく処理されました:', result3.error);
    } else {
      console.error('❌ エラーが検出されませんでした');
    }
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  }
}

// テストを実行
if (require.main === module) {
  testRefactorAgent().catch(console.error);
}

export { testRefactorAgent };