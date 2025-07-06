import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    console.log('OCR Webhook received:', data);

    // OCR結果をクライアントに返すための処理
    // リアルタイムでクライアントに通知する場合は、
    // WebSocketやServer-Sent Eventsを使用することも可能

    // 一時的にレスポンスとして返す
    return NextResponse.json({
      success: true,
      data: {
        fileId: data.fileId,
        fileName: data.fileName,
        documentInfo: data.documentInfo,
        preview: data.ocrText
      }
    });

  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return NextResponse.json(
      { 
        error: 'Webhook処理に失敗しました',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}