#!/usr/bin/env tsx
"use strict";
/**
 * MongoDB Atlas Vector Search機能確認スクリプト
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMongoDBVectorCapabilities = checkMongoDBVectorCapabilities;
const mongodb_1 = require("mongodb");
async function checkMongoDBVectorCapabilities() {
    console.log('🔍 MongoDB Atlas Vector Search機能確認開始');
    const connectionString = process.env.MONGODB_URI ||
        'mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster';
    const client = new mongodb_1.MongoClient(connectionString);
    try {
        await client.connect();
        console.log('✅ MongoDB接続成功');
        const db = client.db('accounting');
        const admin = db.admin();
        // サーバー情報を取得
        console.log('\n📊 サーバー情報:');
        const serverStatus = await admin.serverStatus();
        console.log(`MongoDB バージョン: ${serverStatus.version}`);
        // Atlas Searchサポート確認
        console.log('\n🔎 Atlas Search機能確認:');
        try {
            // Atlas Searchの使用可能性をテスト
            const collections = await db.listCollections().toArray();
            console.log(`データベース内コレクション数: ${collections.length}`);
            // コレクション一覧表示
            collections.forEach(col => {
                console.log(`  - ${col.name}`);
            });
            // Vector Search Indexの確認（Knowledge関連コレクション）
            console.log('\n🧭 Vector Search Index確認:');
            const knowledgeCollections = ['knowledge_articles', 'faq_articles', 'knowledge_embeddings'];
            for (const collectionName of knowledgeCollections) {
                try {
                    const collection = db.collection(collectionName);
                    const indexes = await collection.indexes();
                    console.log(`\n📋 ${collectionName} コレクションのインデックス:`);
                    indexes.forEach((index, i) => {
                        console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
                        if (index.type === 'vector' || index.indexType === 'vectorSearch') {
                            console.log(`    ✅ Vector Searchインデックス発見!`);
                        }
                    });
                    // Vector Search用のサンプルクエリテスト
                    if (collectionName === 'knowledge_articles') {
                        console.log(`\n🧪 ${collectionName} のVector Search テスト:`);
                        // サンプルドキュメント数を確認
                        const docCount = await collection.countDocuments();
                        console.log(`  ドキュメント数: ${docCount}`);
                        if (docCount > 0) {
                            // サンプルドキュメントを取得
                            const sampleDoc = await collection.findOne();
                            console.log('  サンプルドキュメント構造:');
                            console.log('  ', Object.keys(sampleDoc || {}));
                            // embeddings フィールドの確認
                            if (sampleDoc?.embeddings) {
                                console.log('  ✅ embeddings フィールド存在');
                                console.log(`  ベクトル次元数: ${sampleDoc.embeddings.length}`);
                            }
                            else {
                                console.log('  ⚠️ embeddings フィールド未設定');
                            }
                        }
                    }
                }
                catch (error) {
                    console.log(`  ❌ ${collectionName} アクセスエラー: ${error}`);
                }
            }
            // Atlas Vector Search機能のテスト
            console.log('\n🎯 Vector Search 実行テスト:');
            try {
                const knowledgeCollection = db.collection('knowledge_articles');
                // Vector Searchクエリのテスト（実際のベクトルがあれば）
                const vectorSearchPipeline = [
                    {
                        $vectorSearch: {
                            index: "vector_index",
                            path: "embeddings",
                            queryVector: new Array(384).fill(0.1), // サンプルベクトル
                            numCandidates: 100,
                            limit: 5
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            content: 1,
                            score: { $meta: "vectorSearchScore" }
                        }
                    }
                ];
                console.log('  Vector Searchクエリ実行中...');
                const vectorResults = await knowledgeCollection.aggregate(vectorSearchPipeline).toArray();
                if (vectorResults.length > 0) {
                    console.log('  ✅ Vector Search動作確認済み');
                    console.log(`  結果数: ${vectorResults.length}`);
                }
                else {
                    console.log('  ⚠️ Vector Search結果なし（インデックス未設定またはデータなし）');
                }
            }
            catch (vectorError) {
                console.log('  ❌ Vector Search未対応またはインデックス未設定');
                console.log(`  エラー詳細: ${vectorError}`);
            }
            // Text Search機能の確認
            console.log('\n📝 Text Search機能確認:');
            try {
                const faqCollection = db.collection('faq_articles');
                const textSearchResult = await faqCollection.aggregate([
                    {
                        $search: {
                            index: "default",
                            text: {
                                query: "税務",
                                path: ["question", "answer"]
                            }
                        }
                    },
                    { $limit: 3 },
                    {
                        $project: {
                            question: 1,
                            score: { $meta: "searchScore" }
                        }
                    }
                ]).toArray();
                if (textSearchResult.length > 0) {
                    console.log('  ✅ Atlas Text Search動作確認済み');
                    console.log(`  検索結果数: ${textSearchResult.length}`);
                }
                else {
                    console.log('  ⚠️ Text Search結果なし');
                }
            }
            catch (textError) {
                console.log('  ❌ Atlas Text Search未設定');
                console.log(`  エラー詳細: ${textError}`);
            }
        }
        catch (error) {
            console.error('❌ Atlas機能確認エラー:', error);
        }
        // 推奨設定の表示
        console.log('\n💡 Vector Search設定推奨事項:');
        console.log('1. Atlas Searchインデックス作成:');
        console.log('   - コレクション: knowledge_articles');
        console.log('   - フィールド: embeddings (type: vector)');
        console.log('   - 次元数: 384 (Sentence Transformers用) または 1536 (OpenAI用)');
        console.log('   - 類似度: cosine または euclidean');
        console.log('\n2. 必要な環境変数:');
        console.log('   - OPENAI_API_KEY (embeddings生成用)');
        console.log('   - または Hugging Face Transformers使用');
    }
    catch (error) {
        console.error('❌ MongoDB接続エラー:', error);
    }
    finally {
        await client.close();
    }
}
// スクリプト直接実行時
if (require.main === module) {
    checkMongoDBVectorCapabilities().catch(console.error);
}
