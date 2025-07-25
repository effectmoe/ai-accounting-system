#!/usr/bin/env tsx
"use strict";
/**
 * 既存のFAQとナレッジ記事にembeddingsを追加するスクリプト
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEmbeddingsToExistingData = addEmbeddingsToExistingData;
const mongodb_1 = require("mongodb");
const embeddings_1 = require("@/lib/embeddings");
async function addEmbeddingsToExistingData() {
    console.log('🚀 既存データへのEmbeddings追加開始');
    const connectionString = process.env.MONGODB_URI ||
        'mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster';
    const client = new mongodb_1.MongoClient(connectionString);
    try {
        await client.connect();
        console.log('✅ MongoDB Atlas接続成功');
        const db = client.db('accounting');
        const embeddingsService = (0, embeddings_1.getEmbeddingsService)();
        // 1. FAQ記事の処理
        console.log('\n📝 FAQ記事のEmbeddings生成:');
        const faqCollection = db.collection('faq_articles');
        const faqDocs = await faqCollection.find({ embeddings: { $exists: false } }).toArray();
        console.log(`  処理対象: ${faqDocs.length} FAQ記事`);
        for (let i = 0; i < faqDocs.length; i++) {
            const faq = faqDocs[i];
            console.log(`  ${i + 1}/${faqDocs.length}: ${faq.question.substring(0, 50)}...`);
            try {
                const result = await embeddingsService.generateFaqEmbedding(faq.question, faq.answer);
                await faqCollection.updateOne({ _id: faq._id }, {
                    $set: {
                        embeddings: result.embedding,
                        embeddingMetadata: {
                            model: embeddingsService.getModelInfo().model,
                            dimensions: result.embedding.length,
                            tokens: result.tokens,
                            generatedAt: new Date(),
                            source: 'faq_combined'
                        }
                    }
                });
                console.log(`    ✅ 完了 (次元数: ${result.embedding.length}, トークン: ${result.tokens})`);
                // レート制限回避
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                console.error(`    ❌ エラー: ${error}`);
            }
        }
        // 2. ナレッジ記事の処理
        console.log('\n📚 ナレッジ記事のEmbeddings生成:');
        const knowledgeCollection = db.collection('knowledgeArticles');
        const knowledgeDocs = await knowledgeCollection.find({ embeddings: { $exists: false } }).toArray();
        console.log(`  処理対象: ${knowledgeDocs.length} ナレッジ記事`);
        for (let i = 0; i < knowledgeDocs.length; i++) {
            const article = knowledgeDocs[i];
            console.log(`  ${i + 1}/${knowledgeDocs.length}: ${article.title?.substring(0, 50)}...`);
            try {
                // タイトル、要約、内容を組み合わせてembedding生成
                const combinedText = [
                    `タイトル: ${article.title || ''}`,
                    article.excerpt ? `要約: ${article.excerpt}` : '',
                    `内容: ${(article.content || '').substring(0, 2000)}`
                ].filter(Boolean).join('\n');
                const result = await embeddingsService.generateEmbedding(combinedText);
                await knowledgeCollection.updateOne({ _id: article._id }, {
                    $set: {
                        embeddings: result.embedding,
                        embeddingMetadata: {
                            model: embeddingsService.getModelInfo().model,
                            dimensions: result.embedding.length,
                            tokens: result.tokens,
                            generatedAt: new Date(),
                            source: 'knowledge_combined'
                        }
                    }
                });
                console.log(`    ✅ 完了 (次元数: ${result.embedding.length}, トークン: ${result.tokens})`);
                // レート制限回避
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                console.error(`    ❌ エラー: ${error}`);
            }
        }
        // 3. 結果確認
        console.log('\n📊 結果確認:');
        const faqWithEmbeddings = await faqCollection.countDocuments({ embeddings: { $exists: true } });
        const knowledgeWithEmbeddings = await knowledgeCollection.countDocuments({ embeddings: { $exists: true } });
        const totalFaq = await faqCollection.countDocuments();
        const totalKnowledge = await knowledgeCollection.countDocuments();
        console.log(`  FAQ記事: ${faqWithEmbeddings}/${totalFaq} (${Math.round(faqWithEmbeddings / totalFaq * 100)}%)`);
        console.log(`  ナレッジ記事: ${knowledgeWithEmbeddings}/${totalKnowledge} (${Math.round(knowledgeWithEmbeddings / totalKnowledge * 100)}%)`);
        // 4. Vector Search Index作成指示
        if (faqWithEmbeddings > 0 || knowledgeWithEmbeddings > 0) {
            console.log('\n🎯 次のステップ: MongoDB Atlas Vector Search Index作成');
            console.log('');
            console.log('1. https://cloud.mongodb.com/ にアクセス');
            console.log('2. accounting-cluster → Browse Collections → Search Indexes');
            console.log('3. Create Search Index → Atlas Vector Search');
            console.log('');
            console.log('【faq_articles用設定】');
            console.log('Database: accounting');
            console.log('Collection: faq_articles');
            console.log('Index Name: vector_index');
            console.log('Definition:');
            console.log(`{
  "fields": [
    {
      "type": "vector",
      "path": "embeddings", 
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}`);
            console.log('\n【knowledgeArticles用設定】');
            console.log('Database: accounting');
            console.log('Collection: knowledgeArticles');
            console.log('Index Name: vector_index');
            console.log('Definition: 上記と同じ');
            console.log('');
            console.log('⚠️ インデックス作成には数分かかる場合があります');
        }
    }
    catch (error) {
        console.error('❌ Embeddings追加エラー:', error);
    }
    finally {
        await client.close();
    }
}
// スクリプト直接実行
if (require.main === module) {
    // 環境変数の確認
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY environment variable is required');
        process.exit(1);
    }
    addEmbeddingsToExistingData().catch(console.error);
}
