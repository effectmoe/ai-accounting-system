import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://effectmoe:Dhfgmtekd77@cluster0.h1e6k.mongodb.net/accounting-automation?retryWrites=true&w=majority&appName=Cluster0';

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    const body = await request.json();
    const { question, answer, sessionId, timestamp } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    // MongoDB接続
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('accounting-automation');
    const faqCollection = db.collection('faq');

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

    const result = await faqCollection.insertOne(faqEntry);

    console.log('FAQ saved successfully:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'FAQに保存されました',
      id: result.insertedId
    });

  } catch (error) {
    console.error('FAQ保存エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'FAQ保存に失敗しました' 
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}