// Mastraエージェントシステムをローカルで起動
import { mastra } from './src/mastra';

async function startMastra() {
  console.log('🚀 Mastraエージェントシステムを起動中...\n');
  
  try {
    const port = 4111;
    
    // Mastraサーバーを起動
    const server = mastra.startServer({
      port,
      isDev: true
    });
    
    console.log('✅ Mastraが正常に起動しました！\n');
    console.log('📍 APIエンドポイント: http://localhost:' + port + '/api');
    console.log('🎮 Playground: http://localhost:' + port + '/playground');
    console.log('📚 ドキュメント: http://localhost:' + port + '/docs\n');
    
    console.log('利用可能なエージェント（11個）:');
    console.log('1. 会計処理エージェント - 仕訳作成、請求書処理');
    console.log('2. 顧客管理エージェント - 顧客情報管理');
    console.log('3. データベースエージェント - MongoDB操作');
    console.log('4. デプロイメントエージェント - システム展開');
    console.log('5. 日本税制エージェント - 消費税・所得税計算');
    console.log('6. OCRエージェント - 文書読み取り');
    console.log('7. 問題解決エージェント - エラー対応');
    console.log('8. 商品管理エージェント - 在庫・商品管理');
    console.log('9. リファクタリングエージェント - コード改善');
    console.log('10. UIエージェント - ユーザーインターフェース');
    console.log('11. 建設業会計エージェント - 建設業特化機能\n');
    
    console.log('💡 使い方:');
    console.log('1. Playgroundにアクセスしてエージェントをテスト');
    console.log('2. APIエンドポイントから直接呼び出し');
    console.log('3. Next.jsアプリ（npm run dev）から統合利用\n');
    
    console.log('🛑 終了するには Ctrl+C を押してください');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 起動
startMastra().catch(console.error);