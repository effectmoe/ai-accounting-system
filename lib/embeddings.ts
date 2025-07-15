/**
 * Embeddings生成ライブラリ
 * OpenAI embeddings-ada-002モデルを使用してベクトル検索用埋め込みを生成
 */

import OpenAI from 'openai';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  totalTokens: number;
  processingTime: number;
}

export class EmbeddingsService {
  private openai: OpenAI;
  private model = 'text-embedding-ada-002';
  private maxTokensPerRequest = 8191; // OpenAI limit

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * 単一テキストの埋め込み生成
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
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
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 複数テキストの一括埋め込み生成
   */
  async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const results: EmbeddingResult[] = [];
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

    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * FAQ記事用の埋め込み生成
   */
  async generateFaqEmbedding(question: string, answer: string): Promise<EmbeddingResult> {
    // 質問と回答を組み合わせてコンテキストを作成
    const combinedText = `質問: ${question}\n回答: ${answer}`;
    return this.generateEmbedding(combinedText);
  }

  /**
   * ナレッジ記事用の埋め込み生成
   */
  async generateKnowledgeEmbedding(title: string, content: string, excerpt?: string): Promise<EmbeddingResult> {
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
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
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
  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 複数の空白を単一空白に
      .replace(/\n+/g, ' ') // 改行を空白に
      .trim()
      .substring(0, this.maxTokensPerRequest * 4); // 概算でトークン制限を適用
  }

  /**
   * 埋め込みの次元数を取得
   */
  getEmbeddingDimensions(): number {
    return 1536; // text-embedding-ada-002の次元数
  }

  /**
   * モデル情報を取得
   */
  getModelInfo(): { model: string; dimensions: number; maxTokens: number } {
    return {
      model: this.model,
      dimensions: this.getEmbeddingDimensions(),
      maxTokens: this.maxTokensPerRequest
    };
  }
}

// シングルトンインスタンス
let embeddingsInstance: EmbeddingsService | null = null;

export function getEmbeddingsService(): EmbeddingsService {
  if (!embeddingsInstance) {
    embeddingsInstance = new EmbeddingsService();
  }
  return embeddingsInstance;
}

// MongoDB Vector Search用のヘルパー関数
export async function addEmbeddingsToDocument(
  document: any,
  textField: string,
  embeddingField: string = 'embeddings'
): Promise<any> {
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
  } catch (error) {
    console.error(`Failed to add embeddings to document:`, error);
    return document;
  }
}

// FAQ記事専用のヘルパー
export async function addEmbeddingsToFaq(faq: any): Promise<any> {
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
  } catch (error) {
    console.error(`Failed to add embeddings to FAQ:`, error);
    return faq;
  }
}