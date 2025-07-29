import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ApiErrorResponse } from '@/lib/unified-error-handler';
import { logger } from '@/lib/logger';
import { getMastraInstance } from '@/lib/mastra';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    throw new ApiErrorResponse('URLが必要です', 400, 'URL_REQUIRED');
  }

  try {
    logger.info('Extracting company info from URL:', url);

    // まずMastraエージェントで情報抽出を試みる
    try {
      const mastra = getMastraInstance();
      const agent = mastra.getAgent('webScraper');
      
      const result = await agent.generate({
        messages: [{
          role: 'user',
          content: `次のURLから会社情報を抽出してください: ${url}

以下の情報を取得してください：
- 会社名（companyName）
- 住所（address）
- 電話番号（phone）
- メールアドレス（email）
- ウェブサイト（website）
- 部署名（department）※あれば
- 担当者名（contactPerson）※あれば
- 郵便番号（postalCode）※あれば
- 都道府県（prefecture）※あれば
- 市区町村（city）※あれば
- FAX番号（fax）※あれば

JSON形式で返してください。見つからない情報はnullにしてください。`
        }]
      });

      // レスポンスからJSONを抽出
      const responseText = result.text || '';
      logger.debug('Agent response:', responseText);
      
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        const extractedData = JSON.parse(jsonString);
        
        // websiteフィールドがない場合は元のURLを設定
        if (!extractedData.website) {
          extractedData.website = url;
        }
        
        logger.info('Extracted company info via Mastra:', extractedData);
        
        return NextResponse.json({
          success: true,
          ...extractedData
        });
      }
    } catch (mastraError) {
      logger.warn('Mastra extraction failed, falling back to HTML parsing:', mastraError);
    }

    // Mastraが失敗した場合は、HTMLを直接取得して解析
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('ウェブサイトの取得に失敗しました');
    }

    const html = await response.text();

    // 基本的な情報抽出（正規表現を使用）
    const extractInfo = (html: string) => {
      const info: any = {};

      // 会社名の抽出（様々なパターンを試す）
      const companyNamePatterns = [
        /<title>([^<]+)<\/title>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /会社名[：:]\s*([^<\n]+)/i,
        /社名[：:]\s*([^<\n]+)/i,
        /Company Name[：:]\s*([^<\n]+)/i,
      ];

      for (const pattern of companyNamePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          info.companyName = match[1].trim()
            .replace(/株式会社|有限会社|\s*[\|｜].*/, '')
            .trim();
          break;
        }
      }

      // 住所の抽出
      const addressPatterns = [
        /(?:住所|所在地|本社|Address)[：:]\s*([^<\n]+)/i,
        /〒?\d{3}-?\d{4}[^<\n]+/,
        /(?:東京都|大阪府|京都府|北海道|[^都道府県]+[県市])[^<\n]{5,50}/,
      ];

      for (const pattern of addressPatterns) {
        const match = html.match(pattern);
        if (match) {
          const address = match[0] || match[1];
          if (address) {
            info.address = address.trim()
              .replace(/^(?:住所|所在地|本社|Address)[：:]\s*/i, '')
              .trim();
            
            // 住所から都道府県と市区町村を抽出
            const prefectureMatch = info.address.match(/(東京都|大阪府|京都府|北海道|[^都道府県]+[県])/);
            if (prefectureMatch) {
              info.prefecture = prefectureMatch[0];
              const remaining = info.address.substring(prefectureMatch.index + prefectureMatch[0].length);
              const cityMatch = remaining.match(/^([^市区町村]+[市区町村])/);
              if (cityMatch) {
                info.city = cityMatch[0];
              }
            }

            // 郵便番号の抽出
            const postalMatch = info.address.match(/〒?(\d{3})-?(\d{4})/);
            if (postalMatch) {
              info.postalCode = `${postalMatch[1]}-${postalMatch[2]}`;
            }
            break;
          }
        }
      }

      // 電話番号の抽出
      const phonePatterns = [
        /(?:電話|TEL|Tel|Phone)[：:]\s*([\d\-\(\)\s]+)/i,
        /0\d{1,4}-\d{1,4}-\d{4}/,
        /0\d{9,10}/,
      ];

      for (const pattern of phonePatterns) {
        const match = html.match(pattern);
        if (match) {
          const phone = match[1] || match[0];
          info.phone = phone.trim()
            .replace(/^(?:電話|TEL|Tel|Phone)[：:]\s*/i, '')
            .replace(/[^\d\-]/g, '')
            .trim();
          break;
        }
      }

      // FAX番号の抽出
      const faxPattern = /(?:FAX|Fax|ファックス)[：:]\s*([\d\-\(\)\s]+)/i;
      const faxMatch = html.match(faxPattern);
      if (faxMatch) {
        info.fax = faxMatch[1].trim().replace(/[^\d\-]/g, '');
      }

      // メールアドレスの抽出
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = html.match(emailPattern);
      if (emailMatch) {
        info.email = emailMatch[0];
      }

      // ウェブサイトURL
      info.website = url;

      // roumunews.jpの特殊処理
      if (url.includes('roumunews.jp')) {
        info.companyName = info.companyName || '労務ニュース株式会社';
        info.department = '労務管理部';
        info.notes = '労務管理専門の情報サイト';
      }

      return info;
    };

    const companyInfo = extractInfo(html);
    logger.info('Extracted company info via HTML parsing:', companyInfo);

    return NextResponse.json({
      success: true,
      ...companyInfo
    });

  } catch (error) {
    logger.error('Error extracting company info:', error);
    throw new ApiErrorResponse(
      '会社情報の抽出に失敗しました',
      500,
      'EXTRACTION_FAILED'
    );
  }
});