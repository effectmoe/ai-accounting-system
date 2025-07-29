import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ApiErrorResponse } from '@/lib/unified-error-handler';
import { logger } from '@/lib/logger';
import { mastra } from '@/src/mastra';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { companyName, url, query } = body;

  if (!companyName) {
    throw new ApiErrorResponse('会社名が必要です', 400, 'COMPANY_NAME_REQUIRED');
  }

  try {
    logger.info('Investigating company:', { companyName, url, query });

    // Mastraエージェントで企業情報を深掘り調査
    // webResearcherがない場合はgeneralエージェントを使用
    let agent;
    try {
      agent = mastra.getAgent('webResearcher');
    } catch (e) {
      agent = mastra.getAgent('general');
    }
    
    const searchQuery = query 
      ? `「${companyName}」について「${query}」を教えてください。`
      : `「${companyName}」について以下を詳しく調査してください：

1. 事業内容・サービス
2. 企業規模（従業員数、資本金、売上高など）
3. 主要な取引先・顧客
4. 最近のニュース・動向
5. 業界での評判・特徴
6. 社長・経営陣の情報
7. 企業文化・働き方
8. その他の重要な情報

ウェブサイト、ニュース、SNS、企業データベースなど、あらゆる公開情報源から情報を収集してください。
${url ? `参考URL: ${url}` : ''}`;
    
    const result = await agent.generate({
      messages: [{
        role: 'user',
        content: searchQuery
      }]
    });

    const summary = result.text || '調査結果を取得できませんでした。';
    
    // レスポンスを整形
    const formattedSummary = `🏢 **${companyName}の詳細情報**

${summary}

---
*この情報は公開されている情報源から収集されました。最新の情報については、直接企業にお問い合わせください。*`;

    logger.info('Company investigation completed:', { companyName });
    
    return NextResponse.json({
      success: true,
      companyName,
      summary: formattedSummary,
      rawData: summary
    });

  } catch (error) {
    logger.error('Error investigating company:', error);
    
    // フォールバック: 基本的な情報のみ返す
    const fallbackSummary = `🏢 **${companyName}の情報**

申し訳ございません。現在、詳細な企業情報を取得できませんでした。
以下の方法で情報を確認することをお勧めします：

1. 企業の公式ウェブサイトを確認
2. 会社四季報や企業データベースで検索
3. Google検索で最新情報をチェック

${url ? `\n提供されたURL: ${url}` : ''}`;
    
    return NextResponse.json({
      success: false,
      companyName,
      summary: fallbackSummary,
      error: '詳細情報の取得に失敗しました'
    });
  }
});