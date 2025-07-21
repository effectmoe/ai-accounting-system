import { DatabaseService, Collections } from '../lib/mongodb-client';
import { MongoClient } from 'mongodb';

async function checkCategories() {
  const db = DatabaseService.getInstance();
  const companyId = '11111111-1111-1111-1111-111111111111';
  
  try {
    console.log('=== 勘定科目の状態を確認 ===');
    
    // 最新の10件のドキュメントを取得
    const documents = await db.find(Collections.DOCUMENTS, 
      { companyId }, 
      { 
        limit: 10, 
        sort: { createdAt: -1 } 
      }
    );
    
    console.log(`\n最新の${documents.length}件のドキュメント:\n`);
    
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.documentNumber} (${doc.partnerName})`);
      console.log(`   作成日時: ${doc.createdAt}`);
      console.log(`   勘定科目: ${doc.category || '❌ 未設定'}`);
      console.log(`   AI推測: ${doc.aiPrediction ? '✅ あり' : '❌ なし'}`);
      
      if (doc.aiPrediction) {
        console.log(`   - カテゴリ: ${doc.aiPrediction.category}`);
        console.log(`   - 信頼度: ${Math.round(doc.aiPrediction.confidence * 100)}%`);
        console.log(`   - 推測日時: ${doc.aiPrediction.predictedAt}`);
      }
      console.log('');
    });
    
    // 統計情報
    const totalDocs = await db.count(Collections.DOCUMENTS, { companyId });
    const categorizedDocs = await db.count(Collections.DOCUMENTS, { 
      companyId, 
      category: { $exists: true, $ne: null } 
    });
    const aiPredictedDocs = await db.count(Collections.DOCUMENTS, { 
      companyId, 
      aiPrediction: { $exists: true } 
    });
    
    console.log('\n=== 統計情報 ===');
    console.log(`総ドキュメント数: ${totalDocs}`);
    console.log(`勘定科目設定済み: ${categorizedDocs} (${Math.round(categorizedDocs / totalDocs * 100)}%)`);
    console.log(`AI推測実行済み: ${aiPredictedDocs} (${Math.round(aiPredictedDocs / totalDocs * 100)}%)`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await DatabaseService.close();
  }
}

checkCategories();