import { NextRequest, NextResponse } from 'next/server';
import { sendQuoteEmail } from '@/lib/resend-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    console.log('📧 [SEND-EMAIL-API:START] Processing email send request at:', new Date().toISOString());
    
    const body = await request.json();
    console.log('📧 [SEND-EMAIL-API:REQUEST-BODY] Raw body analysis:', {
      bodyType: typeof body,
      bodyKeys: Object.keys(body),
      hasQuote: !!body.quote,
      quoteType: typeof body.quote,
      recipientEmail: body.recipientEmail,
      hasNotes: !!body.quote?.notes,
      notesValue: body.quote?.notes,
      notesType: typeof body.quote?.notes,
      notesLength: body.quote?.notes?.length,
      hasTooltips: !!body.tooltips,
      tooltipsType: typeof body.tooltips,
      hasProductLinks: !!body.productLinks,
      productLinksType: typeof body.productLinks,
      timestamp: new Date().toISOString()
    });
    
    logger.debug('[POST /api/quotes/send-email] Sending quote email:', {
      recipientEmail: body.recipientEmail,
      quoteNumber: body.quote?.quoteNumber,
    });
    
    // Base64エンコードされたPDFをBufferに変換
    let pdfBuffer;
    if (body.pdfBuffer && typeof body.pdfBuffer === 'string') {
      pdfBuffer = Buffer.from(body.pdfBuffer, 'base64');
    }
    
    console.log('📧 [SEND-EMAIL-API:BEFORE-SEND] Calling sendQuoteEmail with:', {
      recipientEmail: body.recipientEmail,
      quoteNumber: body.quote?.quoteNumber,
      hasPdfBuffer: !!pdfBuffer,
      pdfBufferSize: pdfBuffer?.length,
      bodyKeys: Object.keys(body),
      timestamp: new Date().toISOString()
    });
    
    // メール送信
    const result = await sendQuoteEmail({
      ...body,
      pdfBuffer,
    });
    
    console.log('📧 [SEND-EMAIL-API:AFTER-SEND] sendQuoteEmail result:', {
      success: result.success,
      messageId: result.messageId,
      trackingId: result.trackingId,
      error: result.error,
      timestamp: new Date().toISOString()
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