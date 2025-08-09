import { NextRequest, NextResponse } from 'next/server';
import { generateHtmlQuote } from '@/lib/html-quote-generator';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quote,
      companyInfo,
      recipientName,
      customMessage,
      suggestedOptions,
      tooltips,
      productLinks,
      includeTracking,
    } = body;

    // Map配列をMapオブジェクトに変換
    const tooltipsMap = new Map(tooltips || []);
    const productLinksMap = new Map(productLinks || []);

    // HTML生成
    const result = await generateHtmlQuote({
      quote,
      companyInfo,
      recipientName,
      customMessage,
      includeTracking,
      includeInteractiveElements: true,
      suggestedOptions,
      tooltips: tooltipsMap,
      productLinks: productLinksMap,
    });

    return NextResponse.json({
      html: result.html,
      plainText: result.plainText,
      subject: result.subject,
      previewText: result.previewText,
    });
  } catch (error) {
    logger.error('Error generating HTML quote preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}