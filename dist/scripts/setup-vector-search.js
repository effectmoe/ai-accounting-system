#!/usr/bin/env tsx
"use strict";
/**
 * MongoDB Vector Search セットアップスクリプト
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupVectorSearch = setupVectorSearch;
const mongodb_1 = require("mongodb");
async function setupVectorSearch() {
    console.log('🚀 MongoDB Vector Search セットアップ開始');
    const connectionString = process.env.MONGODB_URI ||
        'mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster';
    const client = new mongodb_1.MongoClient(connectionString);
    try {
        await client.connect();
        console.log('✅ MongoDB Atlas接続成功');
        const db = client.db('accounting');
        // 既存のナレッジ関連コレクションを確認
        console.log('\n📋 既存のナレッジ関連コレクション確認:');
        const knowledgeCollections = ['knowledgeArticles', 'faq_articles'];
        for (const collectionName of knowledgeCollections) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            console.log(`  ${collectionName}: ${count} ドキュメント`);
            if (count > 0) {
                const sample = await collection.findOne();
                console.log(`    構造: [${Object.keys(sample || {}).join(', ')}]`);
                // embeddings フィールドの確認
                if (sample?.embeddings) {
                    console.log(`    ✅ embeddings フィールド存在 (次元数: ${sample.embeddings.length})`);
                }
                else {
                    console.log(`    ⚠️ embeddings フィールド未設定`);
                }
            }
        }
        // Vector Search用のembeddingsフィールドを追加する設定
        console.log('\n🎯 Vector Search 設定推奨事項:');
        console.log('');
        console.log('1. 【MongoDB Atlas Web UI での設定】');
        console.log('   https://cloud.mongodb.com/ にアクセス');
        console.log('   → accounting-cluster を選択');
        console.log('   → Search タブを選択');
        console.log('   → Create Search Index を選択');
        console.log('');
        console.log('2. 【Vector Search Index 設定】');
        console.log('   Database: accounting');
        console.log('   Collection: faq_articles');
        console.log('   Index名: vector_index');
        console.log('');
        console.log('   JSON設定:');
        console.log(`   {
     "fields": [
       {
         "type": "vector",
         "path": "embeddings",
         "numDimensions": 384,
         "similarity": "cosine"
       }
     ]
   }`);
        // embeddings生成用のサンプルスクリプト提示
        console.log('\n🤖 Embeddings生成の実装が必要:');
        console.log('');
        console.log('必要なパッケージ:');
        console.log('  npm install @tensorflow/tfjs @tensorflow-models/universal-sentence-encoder');
        console.log('  または');
        console.log('  npm install openai  # OpenAI embeddings使用の場合');
        console.log('');
        // NLWeb環境変数の設定
        console.log('📝 NLWeb環境変数設定:');
        console.log('');
        console.log('推奨するNLWeb設定:');
        console.log('  NLWEB_MCP_ENDPOINT=https://api.anthropic.com/v1  # Claude APIを使用');
        console.log('  NLWEB_MCP_KEY=your_anthropic_api_key');
        console.log('  または');
        console.log('  NLWEB_MCP_ENDPOINT=https://api.deepseek.com/v1  # DeepSeek APIを使用');
        console.log('  NLWEB_MCP_KEY=your_deepseek_api_key');
        console.log('');
        console.log('💡 次のステップ:');
        console.log('1. Vector Search Index を MongoDB Atlas で作成');
        console.log('2. Embeddings生成機能を実装');
        console.log('3. NLWeb環境変数を設定');
        console.log('4. Vector検索APIエンドポイントを実装');
    }
    catch (error) {
        console.error('❌ セットアップエラー:', error);
    }
    finally {
        await client.close();
    }
}
// 現在のVercel環境変数を確認
async function checkCurrentEnvVars() {
    console.log('\n🔍 現在の環境変数確認:');
    const envVars = [
        'MONGODB_URI',
        'DEEPSEEK_API_KEY',
        'NLWEB_MCP_ENDPOINT',
        'NLWEB_MCP_KEY',
        'OPENAI_API_KEY'
    ];
    envVars.forEach(envVar => {
        const value = process.env[envVar];
        if (value) {
            console.log(`  ✅ ${envVar}: ${value.substring(0, 20)}...`);
        }
        else {
            console.log(`  ❌ ${envVar}: 未設定`);
        }
    });
}
// スクリプト実行
if (require.main === module) {
    setupVectorSearch()
        .then(() => checkCurrentEnvVars())
        .catch(console.error);
}
