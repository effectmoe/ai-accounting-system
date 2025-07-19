import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export async function POST(request: NextRequest) {
  try {
    console.log('[FAQ API] FAQ save API called');

    const body = await request.json();
    console.log('[FAQ API] リクエストボディ:', JSON.stringify(body));
    
    const { question, answer, sessionId, timestamp } = body;

    if (!question || !answer) {
      console.log('[FAQ API] バリデーションエラー: questionまたはanswerが不足');
      return NextResponse.json(
        { success: false, error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    console.log('[FAQ API] データベース接続を確認中...');

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

    console.log('[FAQ API] FAQエントリを挿入:', JSON.stringify(faqEntry));
    
    const result = await db.create('faq', faqEntry);

    console.log('[FAQ API] FAQ保存成功 ID:', result._id);

    return NextResponse.json({
      success: true,
      message: 'FAQに保存されました',
      id: result._id
    });

  } catch (error) {
    console.error('[FAQ API] FAQ保存エラー:', error);
    console.error('[FAQ API] エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'FAQ保存に失敗しました',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}