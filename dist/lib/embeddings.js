"use strict";
/**
 * Embeddings生成ライブラリ
 * OpenAI embeddings-ada-002モデルを使用してベクトル検索用埋め込みを生成
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingsService = void 0;
exports.getEmbeddingsService = getEmbeddingsService;
exports.addEmbeddingsToDocument = addEmbeddingsToDocument;
exports.addEmbeddingsToFaq = addEmbeddingsToFaq;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("@/lib/logger");
class EmbeddingsService {
    openai;
    model = 'text-embedding-ada-002';
    maxTokensPerRequest = 8191; // OpenAI limit
    constructor(apiKey) {
        this.openai = new openai_1.default({
            apiKey: apiKey || process.env.OPENAI_API_KEY
        });
    }
    /**
     * 単一テキストの埋め込み生成
     */
    async generateEmbedding(text) {
        try {
            // テキストの前処理
            const cleanText = this.preprocessText(text);
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: cleanText,
                encoding_format: 'float'
            });
            return {
                embedding: response.data[0].embedding,
                text: cleanText,
                tokens: response.usage.total_tokens
            };
        }
        catch (error) {
            logger_1.logger.error('Embedding generation error:', error);
            throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * 複数テキストの一括埋め込み生成
     */
    async generateBatchEmbeddings(texts) {
        const startTime = Date.now();
        const results = [];
        let totalTokens = 0;
        try {
            // テキストを前処理
            const cleanTexts = texts.map(text => this.preprocessText(text));
            // バッチサイズを調整（API制限に合わせて）
            const batchSize = 100; // OpenAIの推奨バッチサイズ
            for (let i = 0; i < cleanTexts.length; i += batchSize) {
                const batch = cleanTexts.slice(i, i + batchSize);
                const response = await this.openai.embeddings.create({
                    model: this.model,
                    input: batch,
                    encoding_format: 'float'
                });
                response.data.forEach((embeddingData, index) => {
                    results.push({
                        embedding: embeddingData.embedding,
                        text: batch[index],
                        tokens: response.usage.total_tokens / batch.length // 概算
                    });
                });
                totalTokens += response.usage.total_tokens;
                // レート制限回避のための待機
                if (i + batchSize < cleanTexts.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            return {
                embeddings: results,
                totalTokens,
                processingTime: Date.now() - startTime
            };
        }
        catch (error) {
            logger_1.logger.error('Batch embedding generation error:', error);
            throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * FAQ記事用の埋め込み生成
     */
    async generateFaqEmbedding(question, answer) {
        // 質問と回答を組み合わせてコンテキストを作成
        const combinedText = `質問: ${question}\n回答: ${answer}`;
        return this.generateEmbedding(combinedText);
    }
    /**
     * ナレッジ記事用の埋め込み生成
     */
    async generateKnowledgeEmbedding(title, content, excerpt) {
        // タイトル、要約、内容を組み合わせ
        const combinedText = [
            `タイトル: ${title}`,
            excerpt ? `要約: ${excerpt}` : '',
            `内容: ${content.substring(0, 2000)}` // 内容は最初の2000文字
        ].filter(Boolean).join('\n');
        return this.generateEmbedding(combinedText);
    }
    /**
     * ベクトル類似度計算（コサイン類似度）
     */
    calculateCosineSimilarity(vectorA, vectorB) {
        if (vectorA.length !== vectorB.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    /**
     * テキスト前処理
     */
    preprocessText(text) {
        return text
            .replace(/\s+/g, ' ') // 複数の空白を単一空白に
            .replace(/\n+/g, ' ') // 改行を空白に
            .trim()
            .substring(0, this.maxTokensPerRequest * 4); // 概算でトークン制限を適用
    }
    /**
     * 埋め込みの次元数を取得
     */
    getEmbeddingDimensions() {
        return 1536; // text-embedding-ada-002の次元数
    }
    /**
     * モデル情報を取得
     */
    getModelInfo() {
        return {
            model: this.model,
            dimensions: this.getEmbeddingDimensions(),
            maxTokens: this.maxTokensPerRequest
        };
    }
}
exports.EmbeddingsService = EmbeddingsService;
// シングルトンインスタンス
let embeddingsInstance = null;
function getEmbeddingsService() {
    if (!embeddingsInstance) {
        embeddingsInstance = new EmbeddingsService();
    }
    return embeddingsInstance;
}
// MongoDB Vector Search用のヘルパー関数
async function addEmbeddingsToDocument(document, textField, embeddingField = 'embeddings') {
    const embeddingsService = getEmbeddingsService();
    try {
        const result = await embeddingsService.generateEmbedding(document[textField]);
        return {
            ...document,
            [embeddingField]: result.embedding,
            embeddingMetadata: {
                model: embeddingsService.getModelInfo().model,
                dimensions: result.embedding.length,
                tokens: result.tokens,
                generatedAt: new Date()
            }
        };
    }
    catch (error) {
        logger_1.logger.error(`Failed to add embeddings to document:`, error);
        return document;
    }
}
// FAQ記事専用のヘルパー
async function addEmbeddingsToFaq(faq) {
    const embeddingsService = getEmbeddingsService();
    try {
        const result = await embeddingsService.generateFaqEmbedding(faq.question, faq.answer);
        return {
            ...faq,
            embeddings: result.embedding,
            embeddingMetadata: {
                model: embeddingsService.getModelInfo().model,
                dimensions: result.embedding.length,
                tokens: result.tokens,
                generatedAt: new Date(),
                source: 'faq_combined'
            }
        };
    }
    catch (error) {
        logger_1.logger.error(`Failed to add embeddings to FAQ:`, error);
        return faq;
    }
}
