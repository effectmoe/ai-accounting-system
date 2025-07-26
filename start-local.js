// ローカルでMastraエージェントを起動するスクリプト
const { createServer } = require('@mastra/core');
const { mastra } = require('./src/mastra/index.ts');

async function startLocalMastra() {
  console.log('🚀 Mastraエージェントシステムを起動中...');
  
  try {
    // Mastraサーバーを起動
    const server = await createServer(mastra, {
      port: 4111,
      isDev: true
    });
    
    console.log('✅ Mastraが起動しました！');
    console.log('📍 API: http://localhost:4111/api');
    console.log('🎭 Playground: http://localhost:4111/playground');
    console.log('\n利用可能なエージェント:');
    console.log('- 会計処理エージェント');
    console.log('- 顧客管理エージェント');
    console.log('- 日本税制対応エージェント');
    console.log('- OCRエージェント');
    console.log('- その他7つのエージェント');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

startLocalMastra();