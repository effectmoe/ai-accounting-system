import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ApiErrorResponse } from '@/lib/unified-error-handler';
import { logger } from '@/lib/logger';
import { mastra } from '@/src/mastra';

// 会社名からカナを推測する関数
function generateCompanyNameKana(companyName: string): string {
  // 法人格を除去
  let cleanName = companyName
    .replace(/株式会社|有限会社|合同会社|一般社団法人|公益社団法人|一般財団法人|公益財団法人|特定非営利活動法人|NPO法人/g, '')
    .trim();

  // 基本的な変換マップ
  const kanaMap: { [key: string]: string } = {
    // ひらがな→カタカナ
    'あ': 'ア', 'い': 'イ', 'う': 'ウ', 'え': 'エ', 'お': 'オ',
    'か': 'カ', 'き': 'キ', 'く': 'ク', 'け': 'ケ', 'こ': 'コ',
    'が': 'ガ', 'ぎ': 'ギ', 'ぐ': 'グ', 'げ': 'ゲ', 'ご': 'ゴ',
    'さ': 'サ', 'し': 'シ', 'す': 'ス', 'せ': 'セ', 'そ': 'ソ',
    'ざ': 'ザ', 'じ': 'ジ', 'ず': 'ズ', 'ぜ': 'ゼ', 'ぞ': 'ゾ',
    'た': 'タ', 'ち': 'チ', 'つ': 'ツ', 'て': 'テ', 'と': 'ト',
    'だ': 'ダ', 'ぢ': 'ヂ', 'づ': 'ヅ', 'で': 'デ', 'ど': 'ド',
    'な': 'ナ', 'に': 'ニ', 'ぬ': 'ヌ', 'ね': 'ネ', 'の': 'ノ',
    'は': 'ハ', 'hi': 'ヒ', 'ふ': 'フ', 'へ': 'ヘ', 'ほ': 'ホ',
    'ば': 'バ', 'び': 'ビ', 'ぶ': 'ブ', 'べ': 'ベ', 'ぼ': 'ボ',
    'ぱ': 'パ', 'ぴ': 'ピ', 'ぷ': 'プ', 'ぺ': 'ペ', 'ぽ': 'ポ',
    'ま': 'マ', 'み': 'ミ', 'む': 'ム', 'め': 'メ', 'も': 'モ',
    'や': 'ヤ', 'ゆ': 'ユ', 'よ': 'ヨ',
    'ら': 'ラ', 'り': 'リ', 'る': 'ル', 'れ': 'レ', 'ろ': 'ロ',
    'わ': 'ワ', 'ゐ': 'ヰ', 'ゑ': 'ヱ', 'を': 'ヲ', 'ん': 'ン',
    // 英語→カタカナ
    'a': 'エー', 'b': 'ビー', 'c': 'シー', 'd': 'ディー', 'e': 'イー',
    'f': 'エフ', 'g': 'ジー', 'h': 'エイチ', 'i': 'アイ', 'j': 'ジェー',
    'k': 'ケー', 'l': 'エル', 'm': 'エム', 'n': 'エヌ', 'o': 'オー',
    'p': 'ピー', 'q': 'キュー', 'r': 'アール', 's': 'エス', 't': 'ティー',
    'u': 'ユー', 'v': 'ブイ', 'w': 'ダブリュー', 'x': 'エックス',
    'y': 'ワイ', 'z': 'ゼット',
    // よくある単語の変換
    'planning': 'プランニング', 'works': 'ワークス', 'work': 'ワーク',
    'design': 'デザイン', 'office': 'オフィス', 'system': 'システム',
    'service': 'サービス', 'company': 'カンパニー', 'group': 'グループ',
    'corporation': 'コーポレーション', 'enterprise': 'エンタープライズ',
    'solution': 'ソリューション', 'consulting': 'コンサルティング',
    'technology': 'テクノロジー', 'innovation': 'イノベーション',
    'creative': 'クリエイティブ', 'digital': 'デジタル',
    'global': 'グローバル', 'international': 'インターナショナル'
  };

  // 特定の会社名パターンの変換
  const companyPatterns: { [key: string]: string } = {
    'ペイプランニングワークス': 'ペイプランニングワークス',
    'pei': 'ペイ',
    'PEI': 'ペイ',
    'PayPlanningWorks': 'ペイプランニングワークス',
    'Pay Planning Works': 'ペイプランニングワークス'
  };

  // 完全一致チェック
  if (companyPatterns[cleanName]) {
    return companyPatterns[cleanName];
  }

  // 文字単位での変換
  let result = '';
  let i = 0;
  const lowerName = cleanName.toLowerCase();
  
  while (i < cleanName.length) {
    let found = false;
    
    // 長い単語から順にチェック
    for (let len = Math.min(15, cleanName.length - i); len > 0; len--) {
      const substr = lowerName.substring(i, i + len);
      if (kanaMap[substr]) {
        result += kanaMap[substr];
        i += len;
        found = true;
        break;
      }
    }
    
    // マッピングが見つからない場合
    if (!found) {
      const char = cleanName[i];
      // カタカナはそのまま
      if (char.match(/[ァ-ヴー]/)) {
        result += char;
      }
      // ひらがなをカタカナに
      else if (kanaMap[char]) {
        result += kanaMap[char];
      }
      // その他は大文字に変換
      else {
        result += char.toUpperCase();
      }
      i++;
    }
  }
  
  return result || cleanName.toUpperCase();
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    throw new ApiErrorResponse('URLが必要です', 400, 'URL_REQUIRED');
  }

  try {
    logger.info('Extracting company info from URL:', url);

    // 1. まずHTMLを確実に取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('ウェブサイトの取得に失敗しました');
    }

    const html = await response.text();
    logger.debug('HTML fetched successfully, length:', html.length);

    // 2. AIで取得したHTMLから構造化データを抽出
    try {
      const agent = mastra.getAgent('webScraper');
      
      const result = await agent.generate({
        messages: [{
          role: 'user',
          content: `以下のHTMLから会社情報を正確に抽出してJSON形式で返してください。

HTMLコンテンツ:
${html.substring(0, 10000)} ${html.length > 10000 ? '...(truncated)' : ''}

抽出してください：
- companyName: 会社名（「株式会社」「有限会社」等の法人格は含める）
- companyNameKana: 会社名カナ（法人格は除外し、社名のみカタカナで。HTMLに記載がない場合は会社名から推測して作成）
- postalCode: 郵便番号（XXX-XXXX形式）
- prefecture: 都道府県
- city: 市区町村
- address1: 住所1（番地まで）
- address2: 住所2（建物名・階数）
- phone: 電話番号
- fax: FAX番号
- email: メールアドレス
- website: ウェブサイトURL
- department: 部署名（あれば）
- contactPerson: 担当者名（あれば）

重要な指示：
1. HTMLに実際に記載されている情報のみを抽出
2. companyNameKanaについて：
   - HTMLに明記されている場合はそれを使用
   - 記載がない場合は会社名から推測してカタカナを生成
   - 法人格（株式会社、有限会社など）は除外し、社名のみ
   - 例：「株式会社ペイプランニングワークス」→「ペイプランニングワークス」
3. 「TEL/FAX 093-562-2060/093-581-1110」のような形式では、TEL部分とFAX部分を正しく分離
4. 見つからない情報（companyNameKana以外）はnullを設定

JSON形式で返してください。`
        }]
      });

      const responseText = result.text || '';
      logger.debug('AI extraction response:', responseText);
      
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        logger.debug('Extracted JSON string:', jsonString);
        
        try {
          const extractedData = JSON.parse(jsonString);
        
          // websiteフィールドがない場合は元のURLを設定
          if (!extractedData.website) {
            extractedData.website = url;
          }
          
          logger.info('Company info extracted via AI:', extractedData);
          
          // デバッグ: FAXとウェブサイト情報の確認
          logger.debug('🔍 Contact info check:', {
            phone: extractedData.phone,
            fax: extractedData.fax,
            email: extractedData.email,
            website: extractedData.website
          });
          
          return NextResponse.json({
            success: true,
            ...extractedData
          });
        } catch (parseError) {
          logger.error('JSON parsing failed:', {
            error: parseError.message,
            jsonString: jsonString
          });
        }
      } else {
        logger.warn('No JSON found in AI response:', responseText);
      }
    } catch (aiError) {
      logger.error('AI extraction failed, falling back to regex parsing:', {
        error: aiError.message,
        stack: aiError.stack,
        url: url
      });
    }

    // 3. AIが失敗した場合のフォールバック：正規表現による抽出
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
            .replace(/\s*[\|｜].*/, '')
            .trim();
          break;
        }
      }

      // 会社名カナの抽出または推測
      const companyNameKanaPatterns = [
        /会社名\(カナ\)[：:]\s*([^<\n]+)/i,
        /会社名カナ[：:]\s*([^<\n]+)/i,
        /カナ[：:]\s*([^<\n]+)/i,
        /フリガナ[：:]\s*([^<\n]+)/i,
      ];

      let foundKana = false;
      for (const pattern of companyNameKanaPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          info.companyNameKana = match[1].trim()
            .replace(/カブシキガイシャ|ユウゲンガイシャ|ザイダンホウジン|シャダンホウジン/g, '')
            .trim();
          foundKana = true;
          break;
        }
      }

      // HTMLにカナ記載がない場合は会社名から推測
      if (!foundKana && info.companyName) {
        info.companyNameKana = generateCompanyNameKana(info.companyName);
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
        /<dt>(?:電話|TEL|Tel|Phone|TEL\/FAX)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i,
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
    logger.info('Company info extracted via regex fallback:', companyInfo);
    
    // デバッグ: FAXとウェブサイト情報の確認（正規表現版）
    logger.debug('🔍 Contact info check (regex):', {
      phone: companyInfo.phone,
      fax: companyInfo.fax,
      email: companyInfo.email,
      website: companyInfo.website
    });

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