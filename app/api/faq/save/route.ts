import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://effectmoe:Dhfgmtekd77@cluster0.h1e6k.mongodb.net/accounting-automation?retryWrites=true&w=majority&appName=Cluster0';

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    console.log('FAQ save API called');
    
    // 環境変数チェック
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is not set');
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      );
    }
    
    console.log('MONGODB_URI is configured:', !!MONGODB_URI);

    const body = await request.json();
    console.log('Request body:', body);
    
    const { question, answer, sessionId, timestamp } = body;

    if (!question || !answer) {
      console.log('Validation failed: missing question or answer');
      return NextResponse.json(
        { success: false, error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    console.log('Attempting MongoDB connection...');
    
    // MongoDB接続
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('MongoDB connected successfully');
    
    const db = client.db('accounting-automation');
    console.log('Database selected: accounting-automation');
    
    const faqCollection = db.collection('faq');
    console.log('FAQ collection selected');

    // FAQ保存
    const faqEntry = {
      question: question.trim(),
      answer: answer.trim(),
      sessionId,
      createdAt: new Date(timestamp),
      savedAt: new Date(),
      category: 'tax-accounting',
      status: 'active',
      tags: ['ai-generated', 'chat']
    };

    console.log('Inserting FAQ entry:', faqEntry);
    
    const result = await faqCollection.insertOne(faqEntry);

    console.log('FAQ saved successfully:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'FAQに保存されました',
      id: result.insertedId
    });

  } catch (error) {
    console.error('FAQ保存エラー:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'FAQ保存に失敗しました',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('MongoDB connection closed');
      } catch (closeError) {
        console.error('Error closing MongoDB connection:', closeError);
      }
    }
  }
}