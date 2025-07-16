/**
 * チャット履歴管理サービス
 * セッション履歴の永続化、コンテキスト管理、エクスポート機能を提供
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { 
  ChatSession, 
  ChatMessage, 
  ContextSummary, 
  ChatAttachment,
  ChatExportSettings,
  KnowledgeChatSession
} from '@/types/collections';

export class ChatHistoryService {
  private client: MongoClient;
  private db!: Db;
  private sessions!: Collection<ChatSession>;
  private knowledgeSessions!: Collection<KnowledgeChatSession>;
  private isConnected = false;

  constructor() {
    const connectionString = process.env.MONGODB_URI || 
      'mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster';
    this.client = new MongoClient(connectionString);
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.db = this.client.db('accounting');
      this.sessions = this.db.collection<ChatSession>('chat_sessions');
      this.knowledgeSessions = this.db.collection<KnowledgeChatSession>('chat_sessions');
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
    }
  }

  /**
   * 新しいチャットセッションを作成
   */
  async createSession(userId?: string, title?: string): Promise<ChatSession> {
    await this.connect();
    
    const sessionId = this.generateSessionId();
    const session: ChatSession = {
      sessionId,
      userId,
      title: title || `チャット ${new Date().toLocaleDateString()}`,
      messages: [],
      settings: {
        aiModel: 'deepseek',
        temperature: 0.7,
        maxTokens: 2000
      },
      context: {
        totalTokens: 0,
        maxTokensLimit: 16000, // DeepSeekの制限
        summarizedTokens: 0,
        summaries: []
      },
      status: 'active',
      isBookmarked: false,
      stats: {
        messageCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        faqGenerated: 0
      },
      metadata: {
        language: 'ja',
        lastActiveAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.sessions.insertOne(session);
    return { ...session, _id: result.insertedId };
  }

  /**
   * セッションにメッセージを追加
   */
  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    await this.connect();
    
    const chatMessage: ChatMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
      isComplete: true
    };

    // セッションを更新
    await this.sessions.updateOne(
      { sessionId },
      {
        $push: { messages: chatMessage },
        $inc: { 
          'stats.messageCount': 1,
          'context.totalTokens': message.metadata?.tokens?.total || 0
        },
        $set: {
          'metadata.lastActiveAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    // 応答時間統計の更新
    if (message.metadata?.responseTime) {
      await this.updateResponseTimeStats(sessionId, message.metadata.responseTime);
    }

    // FAQ生成カウントの更新
    if (message.metadata?.faqCandidate?.isGenerated) {
      await this.sessions.updateOne(
        { sessionId },
        { $inc: { 'stats.faqGenerated': 1 } }
      );
    }

    return chatMessage;
  }

  /**
   * セッション情報を取得
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    await this.connect();
    return await this.sessions.findOne({ sessionId });
  }

  /**
   * ユーザーのセッション一覧を取得
   */
  async getUserSessions(
    userId?: string, 
    options: {
      limit?: number;
      offset?: number;
      status?: 'active' | 'archived' | 'deleted';
      sortBy?: 'createdAt' | 'updatedAt' | 'lastActiveAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ sessions: ChatSession[]; total: number }> {
    await this.connect();

    const {
      limit = 20,
      offset = 0,
      status = 'active',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    const filter: any = { status };
    if (userId) {
      filter.userId = userId;
    }

    const sortOption: any = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [sessions, total] = await Promise.all([
      this.sessions
        .find(filter)
        .sort(sortOption)
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.sessions.countDocuments(filter)
    ]);

    return { sessions, total };
  }

  /**
   * セッションタイトルを自動生成
   */
  async generateSessionTitle(sessionId: string): Promise<string> {
    await this.connect();
    
    const session = await this.sessions.findOne({ sessionId });
    if (!session || session.messages.length === 0) {
      return `チャット ${new Date().toLocaleDateString()}`;
    }

    // 最初のユーザーメッセージから要約を生成
    const firstUserMessage = session.messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return `チャット ${new Date().toLocaleDateString()}`;
    }

    // 簡単なタイトル生成（実際はAIで生成可能）
    const content = firstUserMessage.content;
    let title = content.substring(0, 30);
    if (content.length > 30) {
      title += '...';
    }

    // セッションタイトルを更新
    await this.sessions.updateOne(
      { sessionId },
      { 
        $set: { 
          title,
          updatedAt: new Date()
        }
      }
    );

    return title;
  }

  /**
   * コンテキスト管理 - 古いメッセージを要約
   */
  async summarizeContext(sessionId: string, forceCompress = false): Promise<void> {
    await this.connect();
    
    const session = await this.sessions.findOne({ sessionId });
    if (!session) return;

    const { context, messages } = session;
    
    // トークン制限チェック
    const shouldCompress = forceCompress || 
      context.totalTokens > context.maxTokensLimit * 0.8;

    if (!shouldCompress) return;

    // 要約対象のメッセージを選択（古いメッセージから半分）
    const messagesToSummarize = messages.slice(0, Math.floor(messages.length / 2));
    const remainingMessages = messages.slice(Math.floor(messages.length / 2));

    if (messagesToSummarize.length === 0) return;

    // 要約を生成
    const summaryText = await this.generateSummary(messagesToSummarize);
    const originalTokenCount = messagesToSummarize.reduce(
      (total, msg) => total + (msg.metadata?.tokens?.total || 0), 
      0
    );
    const summaryTokenCount = Math.floor(originalTokenCount * 0.3); // 仮の圧縮率

    const summary: ContextSummary = {
      id: this.generateSummaryId(),
      summaryText,
      originalTokenCount,
      summaryTokenCount,
      compressionRatio: summaryTokenCount / originalTokenCount,
      messageRange: {
        startIndex: 0,
        endIndex: messagesToSummarize.length - 1,
        startTimestamp: messagesToSummarize[0].timestamp,
        endTimestamp: messagesToSummarize[messagesToSummarize.length - 1].timestamp
      },
      summary_method: 'abstractive',
      createdAt: new Date()
    };

    // セッションを更新
    await this.sessions.updateOne(
      { sessionId },
      {
        $set: {
          messages: remainingMessages,
          'context.summaries': [...context.summaries, summary],
          'context.summarizedTokens': context.summarizedTokens + summaryTokenCount,
          'context.totalTokens': context.totalTokens - originalTokenCount + summaryTokenCount,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * セッションを削除
   */
  async deleteSession(sessionId: string, softDelete = true): Promise<boolean> {
    await this.connect();
    
    if (softDelete) {
      const result = await this.sessions.updateOne(
        { sessionId },
        { 
          $set: { 
            status: 'deleted',
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } else {
      const result = await this.sessions.deleteOne({ sessionId });
      return result.deletedCount > 0;
    }
  }

  /**
   * セッションをアーカイブ
   */
  async archiveSession(sessionId: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.sessions.updateOne(
      { sessionId },
      { 
        $set: { 
          status: 'archived',
          archivedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * セッションをブックマーク
   */
  async toggleBookmark(sessionId: string): Promise<boolean> {
    await this.connect();
    
    const session = await this.sessions.findOne({ sessionId });
    if (!session) return false;

    const result = await this.sessions.updateOne(
      { sessionId },
      { 
        $set: { 
          isBookmarked: !session.isBookmarked,
          updatedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * 検索機能
   */
  async searchSessions(
    query: string,
    userId?: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ sessions: ChatSession[]; total: number }> {
    await this.connect();

    const { limit = 20, offset = 0 } = options;

    const filter: any = {
      status: { $ne: 'deleted' },
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { 'messages.content': { $regex: query, $options: 'i' } }
      ]
    };

    if (userId) {
      filter.userId = userId;
    }

    const [sessions, total] = await Promise.all([
      this.sessions
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.sessions.countDocuments(filter)
    ]);

    return { sessions, total };
  }

  /**
   * 統計情報の取得
   */
  async getSessionStats(sessionId: string): Promise<any> {
    await this.connect();
    
    const session = await this.sessions.findOne({ sessionId });
    if (!session) return null;

    return {
      messageCount: session.stats.messageCount,
      totalTokens: session.context.totalTokens,
      summarizedTokens: session.context.summarizedTokens,
      averageResponseTime: session.stats.averageResponseTime,
      faqGenerated: session.stats.faqGenerated,
      duration: session.updatedAt.getTime() - session.createdAt.getTime(),
      lastActive: session.metadata.lastActiveAt
    };
  }

  // プライベートヘルパーメソッド
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSummaryId(): string {
    return `sum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateSummary(messages: ChatMessage[]): Promise<string> {
    // 簡単な要約生成（実際はAIで生成）
    const conversation = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    return `この会話では以下の内容について話し合われました:\n${conversation.substring(0, 300)}...`;
  }

  private async updateResponseTimeStats(sessionId: string, responseTime: number): Promise<void> {
    const session = await this.sessions.findOne({ sessionId });
    if (!session) return;

    const newTotal = session.stats.totalResponseTime + responseTime;
    const newAverage = newTotal / session.stats.messageCount;

    await this.sessions.updateOne(
      { sessionId },
      {
        $set: {
          'stats.totalResponseTime': newTotal,
          'stats.averageResponseTime': newAverage
        }
      }
    );
  }

  /**
   * 知識ベースチャットセッションを作成
   */
  async createKnowledgeSession(
    userId?: string,
    category: 'tax' | 'accounting' | 'journal' | 'mixed' = 'mixed'
  ): Promise<KnowledgeChatSession> {
    await this.connect();
    
    const sessionId = this.generateSessionId();
    const session: KnowledgeChatSession = {
      sessionId,
      userId,
      title: `税務・会計相談 ${new Date().toLocaleDateString()}`,
      category,
      specialization: {
        primaryDomain: category === 'tax' ? '税務' : category === 'accounting' ? '会計' : category === 'journal' ? '仕訳' : '総合',
        subDomains: [],
        detectedTopics: []
      },
      knowledgeContext: {
        relevantArticles: [],
        faqCandidates: []
      },
      messages: [],
      settings: {
        aiModel: 'deepseek',
        temperature: 0.7,
        maxTokens: 2000
      },
      context: {
        totalTokens: 0,
        maxTokensLimit: 16000,
        summarizedTokens: 0,
        summaries: []
      },
      status: 'active',
      isBookmarked: false,
      stats: {
        messageCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        faqGenerated: 0
      },
      metadata: {
        language: 'ja',
        lastActiveAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.knowledgeSessions.insertOne(session);
    return { ...session, _id: result.insertedId };
  }

  /**
   * 知識ベースセッション一覧を取得
   */
  async getKnowledgeSessions(
    userId?: string,
    options: {
      limit?: number;
      offset?: number;
      category?: 'tax' | 'accounting' | 'journal' | 'mixed';
      status?: 'active' | 'archived' | 'deleted';
      sortBy?: 'createdAt' | 'updatedAt' | 'lastActiveAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ sessions: KnowledgeChatSession[]; total: number }> {
    await this.connect();

    const {
      limit = 20,
      offset = 0,
      category,
      status = 'active',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    const filter: any = { status };
    if (userId) {
      filter.userId = userId;
    }
    if (category) {
      filter.category = category;
    }

    const sortOption: any = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [sessions, total] = await Promise.all([
      this.knowledgeSessions
        .find(filter)
        .sort(sortOption)
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.knowledgeSessions.countDocuments(filter)
    ]);

    return { sessions, total };
  }

  /**
   * 知識ベースセッションのカテゴリを更新
   */
  async updateKnowledgeSessionCategory(
    sessionId: string,
    category: 'tax' | 'accounting' | 'journal' | 'mixed',
    detectedTopics?: string[]
  ): Promise<boolean> {
    await this.connect();
    
    const updateData: any = {
      category,
      updatedAt: new Date()
    };

    if (detectedTopics) {
      updateData['specialization.detectedTopics'] = detectedTopics;
    }

    const result = await this.knowledgeSessions.updateOne(
      { sessionId },
      { $set: updateData }
    );

    return result.modifiedCount > 0;
  }

  /**
   * FAQキャンディデートを追加
   */
  async addFaqCandidate(
    sessionId: string,
    candidate: {
      messageId: string;
      question: string;
      answer: string;
      confidence: number;
      category: string;
    }
  ): Promise<boolean> {
    await this.connect();
    
    const result = await this.knowledgeSessions.updateOne(
      { sessionId },
      {
        $push: {
          'knowledgeContext.faqCandidates': candidate
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }
}

// シングルトンインスタンス
let chatHistoryService: ChatHistoryService | null = null;

export function getChatHistoryService(): ChatHistoryService {
  if (!chatHistoryService) {
    chatHistoryService = new ChatHistoryService();
  }
  return chatHistoryService;
}