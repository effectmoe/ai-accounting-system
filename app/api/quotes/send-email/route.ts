import { NextRequest, NextResponse } from 'next/server';
import { sendQuoteEmail } from '@/lib/resend-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.debug('[POST /api/quotes/send-email] Sending quote email:', {
      recipientEmail: body.recipientEmail,
      quoteNumber: body.quote?.quoteNumber,
    });
    
    // Base64エンコードされたPDFをBufferに変換
    let pdfBuffer;
    if (body.pdfBuffer && typeof body.pdfBuffer === 'string') {
      pdfBuffer = Buffer.from(body.pdfBuffer, 'base64');
    }
    
    // メール送信
    const result = await sendQuoteEmail({
      ...body,
      pdfBuffer,
    });
    
    if (result.success) {
      logger.info('[POST /api/quotes/send-email] Email sent successfully', {
        messageId: result.messageId,
        trackingId: result.trackingId,
      });
      
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        trackingId: result.trackingId,
      });
    } else {
      logger.error('[POST /api/quotes/send-email] Failed to send email:', result.error);
      
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('[POST /api/quotes/send-email] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}