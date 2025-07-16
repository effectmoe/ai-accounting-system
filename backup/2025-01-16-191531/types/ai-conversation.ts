import { ObjectId } from 'mongodb';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AIConversation {
  _id?: ObjectId;
  conversationId: string;
  invoiceId?: string;
  companyId: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    model?: string;
    totalTokens?: number;
    invoiceData?: any; // 抽出された請求書データ
  };
}

export interface SaveConversationRequest {
  conversationId: string;
  invoiceId?: string;
  companyId: string;
  messages: AIMessage[];
  metadata?: AIConversation['metadata'];
}

export interface GetConversationResponse {
  success: boolean;
  conversation?: AIConversation;
  error?: string;
}