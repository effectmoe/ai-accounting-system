import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ApiErrorResponse } from '@/lib/unified-error-handler';
import { logger } from '@/lib/logger';
import { mastra } from '@/src/mastra';

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
      const agent = mastra.getAgent('webScraper');
      
      const result = await agent.generate({
        messages: [{
          role: 'user',
          content: `次のURLにアクセスして、そのウェブサイトから会社情報を正確に抽出してください: ${url}

重要: ウェブサイトに実際に記載されている情報のみを抽出してください。推測や仮定の情報は入れないでください。

以下の情報を取得してください：
- 会社名（companyName）
- 郵便番号（postalCode）
- 都道府県（prefecture）
- 市区町村（city）
- 住所1（address1） - 番地まで
- 住所2（address2） - ビル名や階数
- 電話番号（phone）
- FAX番号（fax）
- メールアドレス（email）
- ウェブサイト（website）
- 部署名（department）※あれば
- 担当者名（contactPerson）※あれば

JSON形式で返してください。ウェブサイトに記載がない情報はnullにしてください。`
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
        logger.debug('Mastra FAX field:', extractedData.fax);
        
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
        /<dt>(?:住所|所在地|本社|Address)<\/dt>\s*<dd[^>]*>([^<]+(?:<br[^>]*>[^<]+)*)<\/dd>/i,
        /(?:住所|所在地|本社|Address)[：:]\s*([^<\n]+)/i,
        /〒?\d{3}-?\d{4}[^<\n]+/,
        /(?:東京都|大阪府|京都府|北海道|福岡県|[^都道府県]+[県府市])[^<\n]{5,100}/,
      ];

      for (const pattern of addressPatterns) {
        const match = html.match(pattern);
        if (match) {
          const address = match[1] || match[0];
          if (address) {
            info.address = address.trim()
              .replace(/^(?:住所|所在地|本社|Address)[：:]\s*/i, '')
              .replace(/<br[^>]*>/gi, ' ')  // <br>タグを空白に変換
              .replace(/\s+/g, ' ')  // 連続する空白を1つに
              .trim();
            
            // 郵便番号の抽出（最初に実行）
            const postalMatch = info.address.match(/〒?(\d{3})-?(\d{4})/);
            if (postalMatch) {
              info.postalCode = `${postalMatch[1]}-${postalMatch[2]}`;
            }

            // 郵便番号を除去してから都道府県を抽出
            const addressWithoutPostal = info.address.replace(/〒?\d{3}-?\d{4}\s*/, '');
            const prefectureMatch = addressWithoutPostal.match(/(東京都|大阪府|京都府|北海道|福岡県|[^都道府県〒\d]+[県府])/);
            if (prefectureMatch) {
              info.prefecture = prefectureMatch[0];
              const remaining = addressWithoutPostal.substring(prefectureMatch.index + prefectureMatch[0].length);
              const cityMatch = remaining.match(/^([^市区町村]+[市区町村])/);
              if (cityMatch) {
                info.city = cityMatch[0];
                // 住所1と住所2: 市区町村以降の部分を抽出して分割
                const address1Start = remaining.indexOf(cityMatch[0]) + cityMatch[0].length;
                const fullAddress = remaining.substring(address1Start).trim();
                if (fullAddress) {
                  // ビル名、建物名を住所2として分離
                  // パターン: "弁天町5-2 内山南小倉駅前ビル501" のような形式
                  const buildingMatch = fullAddress.match(/^([^町区市]+町?\d+(?:-\d+)*)\s+(.+)/);
                  if (buildingMatch && buildingMatch[2]) {
                    info.address1 = buildingMatch[1].trim();
                    info.address2 = buildingMatch[2].trim();
                  } else {
                    // より汎用的なパターン: 数字の後にスペースがあり、その後に文字が続く
                    const generalMatch = fullAddress.match(/^(.+\d+(?:-\d+)*)\s+(.+)/);
                    if (generalMatch && generalMatch[2]) {
                      info.address1 = generalMatch[1].trim();
                      info.address2 = generalMatch[2].trim();
                    } else {
                      // 分離できない場合は全体を住所1に
                      info.address1 = fullAddress;
                    }
                  }
                }
              }
            }
            break;
          }
        }
      }

      // 電話番号の抽出
      const phonePatterns = [
        /<dt>(?:電話|TEL|Tel|Phone|TEL\/FAX)<\/dt>\s*<dd[^>]*>([^<\/]+)/i,
        /(?:電話|TEL|Tel|Phone)[：:]\s*([\d\-\(\)\s]+)/i,
        /0\d{1,4}-\d{1,4}-\d{4}/,
        /0\d{9,10}/,
      ];

      for (const pattern of phonePatterns) {
        const match = html.match(pattern);
        if (match) {
          const phone = match[1] || match[0];
          let cleanPhone = phone.trim()
            .replace(/^(?:電話|TEL|Tel|Phone)[：:]\s*/i, '')
            .trim();
          
          // TEL/FAX形式の場合、最初の電話番号のみを抽出
          if (cleanPhone.includes('/')) {
            const parts = cleanPhone.split('/');
            cleanPhone = parts[0].trim();
            
            // FAX番号も抽出
            if (parts[1]) {
              info.fax = parts[1].trim().replace(/[^\d\-]/g, '');
              logger.debug('FAX extracted:', info.fax);
            }
            logger.debug('Phone/FAX split:', { cleanPhone, parts, fax: info.fax });
          }
          
          info.phone = cleanPhone.replace(/[^\d\-]/g, '');
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

      // 特殊処理は削除 - 実際の情報のみを抽出する

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