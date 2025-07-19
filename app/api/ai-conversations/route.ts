import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { AIConversation, SaveConversationRequest } from '@/types/ai-conversation';
import { v4 as uuidv4 } from 'uuid';
import { normalizeConversationId } from '@/lib/ai-conversation-helper';

import { logger } from '@/lib/logger';
// AI会話履歴を保存
export async function POST(request: NextRequest) {
  try {
    const body: SaveConversationRequest = await request.json();
    const { conversationId, invoiceId, companyId, messages, metadata } = body;

    logger.debug('[AI Conversations API - POST] Received data:', {
      conversationId,
      invoiceId,
      companyId,
      messagesCount: messages?.length
    });

    if (!conversationId || !companyId || !messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const conversationsCollection = db.collection<AIConversation>('aiConversations');

    // conversationIdを正規化（conv_プレフィックスを確保）
    const normalizedConversationId = normalizeConversationId(conversationId);
    
    if (!normalizedConversationId) {
      return NextResponse.json(
        { success: false, error: 'conversationIdの正規化に失敗しました' },
        { status: 400 }
      );
    }
    
    logger.debug('[AI Conversations API - POST] Normalizing conversationId:', {
      original: conversationId,
      originalType: typeof conversationId,
      normalized: normalizedConversationId,
      normalizedType: typeof normalizedConversationId
    });

    // 既存の会話を確認
    const existingConversation = await conversationsCollection.findOne({
      conversationId: normalizedConversationId
    });

    let result;
    
    if (existingConversation) {
      // 既存の会話がある場合は更新（メッセージを完全に置き換え）
      logger.debug('[AI Conversations API - POST] Updating existing conversation:', normalizedConversationId);
      logger.debug('[AI Conversations API - POST] Existing messages count:', existingConversation.messages?.length || 0);
      logger.debug('[AI Conversations API - POST] New messages count:', messages.length);
      
      // メッセージを完全に置き換える（追加ではなく）
      const updatedMessages = messages;
      
      result = await conversationsCollection.updateOne(
        { conversationId: normalizedConversationId },
        {
          $set: {
            messages: updatedMessages,
            updatedAt: new Date(),
            metadata: {
              ...existingConversation.metadata,
              ...metadata
            }
          }
        }
      );

      return NextResponse.json({
        success: true,
        conversationId: normalizedConversationId,
        _id: existingConversation._id,
        updated: true,
        messagesCount: updatedMessages.length
      });
    } else {
      // 新規会話の場合
      logger.debug('[AI Conversations API - POST] Creating new conversation:', normalizedConversationId);
      
      const conversation: AIConversation = {
        conversationId: normalizedConversationId,
        invoiceId,
        companyId,
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata,
      };

      result = await conversationsCollection.insertOne(conversation);

      return NextResponse.json({
        success: true,
        conversationId: conversation.conversationId,
        _id: result.insertedId,
        updated: false,
        messagesCount: messages.length
      });
    }
  } catch (error) {
    logger.error('AI会話履歴の保存エラー:', error);
    return NextResponse.json(
      { success: false, error: 'AI会話履歴の保存に失敗しました' },
      { status: 500 }
    );
  }
}

// AI会話履歴を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const invoiceId = searchParams.get('invoiceId');

    logger.debug('[AI Conversations API - GET] Search params:', {
      conversationId,
      invoiceId
    });

    if (!conversationId && !invoiceId) {
      return NextResponse.json(
        { success: false, error: 'conversationIdまたはinvoiceIdが必要です' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const conversationsCollection = db.collection<AIConversation>('aiConversations');

    // conversationIdの正規化と検索
    let conversation = null;
    
    if (conversationId) {
      // conversationIdを正規化
      const normalizedId = normalizeConversationId(conversationId) || ''
      
      // さまざまな形式で検索を試みる（後方互換性のため）
      const queries = [
        { conversationId: normalizedId }, // 正規化後
        { conversationId: conversationId }, // 元の値
        { conversationId: String(conversationId) }, // 文字列化
        { conversationId: parseInt(conversationId) as any }, // 数値形式（古いデータ用）
      ];
      
      for (const query of queries) {
        logger.debug('[AI Conversations API - GET] Trying query:', query);
        
        // 複数のマッチがある場合、テストデータ以外を優先
        const conversations = await conversationsCollection.find(query).toArray();
        
        if (conversations.length > 0) {
          // テストデータでないものを優先
          conversation = conversations.find(c => !c.metadata?.testData) || conversations[0];
          logger.debug('[AI Conversations API - GET] Found conversations:', conversations.length);
          logger.debug('[AI Conversations API - GET] Selected conversation ID:', conversation._id);
          logger.debug('[AI Conversations API - GET] Is test data:', !!conversation.metadata?.testData);
          break;
        }
      }
    } else if (invoiceId) {
      logger.debug('[AI Conversations API - GET] Searching by invoiceId:', invoiceId);
      
      // invoiceIdでの検索でも複数のマッチがある場合、テストデータ以外を優先
      const conversations = await conversationsCollection.find({ invoiceId }).toArray();
      
      if (conversations.length > 0) {
        conversation = conversations.find(c => !c.metadata?.testData) || conversations[0];
        logger.debug('[AI Conversations API - GET] Found conversations by invoiceId:', conversations.length);
        logger.debug('[AI Conversations API - GET] Selected conversation ID:', conversation._id);
        logger.debug('[AI Conversations API - GET] Is test data:', !!conversation.metadata?.testData);
      }
    }

    if (!conversation) {
      // デバッグ用: すべての会話を取得してログ出力
      const allConversations = await conversationsCollection.find({}).limit(5).toArray();
      logger.debug('[AI Conversations API - GET] No conversation found. Sample conversations:', 
        allConversations.map(c => ({ 
          conversationId: c.conversationId,
          conversationIdType: typeof c.conversationId,
          invoiceId: c.invoiceId,
          companyId: c.companyId,
          createdAt: c.createdAt
        }))
      );
      
      // 特定のinvoiceIdで検索してみる
      if (invoiceId) {
        const searchByInvoiceId = await conversationsCollection.find({ 
          invoiceId: { $regex: invoiceId, $options: 'i' } 
        }).limit(5).toArray();
        logger.debug('[AI Conversations API - GET] Search by invoiceId pattern:', 
          searchByInvoiceId.map(c => ({ 
            conversationId: c.conversationId,
            invoiceId: c.invoiceId 
          }))
        );
      }
      
      return NextResponse.json(
        { success: false, error: '会話履歴が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    logger.error('AI会話履歴の取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'AI会話履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}