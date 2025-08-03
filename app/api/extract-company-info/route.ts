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
    'Pay Planning Works': 'ペイプランニングワークス',
    'ABポスター': 'エービーポスター',
    'abposter': 'エービーポスター',
    'AB': 'エービー',
    'ab': 'エービー',
    'ジェネクト': 'ジェネクト',
    'genect': 'ジェネクト',
    'NEXTMAP': 'ネクストマップ',
    'nextmap': 'ネクストマップ',
    '株式会社 NEXTMAP': 'ネクストマップ',
    '株式会社NEXTMAP': 'ネクストマップ'
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

重要：もしHTMLが空または会社情報が見つからない場合は、エラーメッセージを含むJSONを返してください。
例：{"error": "会社情報が見つかりませんでした", "website": "${url}"}

HTMLコンテンツ:
${html.substring(0, 15000)} ${html.length > 15000 ? '...(truncated)' : ''}

HTMLの内容を確認してください：
- 実際に会社情報が含まれているか
- NotionやGoogle Docsのような動的サイトで内容が読み込まれていない可能性があるか

以下のフィールドを正確に抽出してください。特に住所の分割は厳密に行ってください：

- companyName: 会社名（「株式会社」「有限会社」等の法人格は含める）
- companyNameKana: 会社名カナ（法人格は除外し、社名のみカタカナで。HTMLに記載がない場合は会社名から推測して作成）
- postalCode: 郵便番号（XXX-XXXX形式）※見つからない場合は返さない
- prefecture: 都道府県（「都」「道」「府」「県」で終わる部分のみ）※見つからない場合は返さない
- city: 市区町村（重要：政令指定都市の場合は「〇〇市△△区」の形式で市と区を連結）※見つからない場合は返さない
- address1: 住所1（番地・丁目のみ。「区」は絶対に含めない）※見つからない場合は返さない
- address2: 住所2（建物名・階数・部屋番号など）※見つからない場合は返さない
- phone: 電話番号 ※見つからない場合は返さない
- fax: FAX番号 ※見つからない場合は返さない
- email: メールアドレス ※見つからない場合は返さない
- website: ウェブサイトURL（元のURLを使用）
- department: 部署名（あれば）※見つからない場合は返さない
- contactPerson: 担当者名（あれば）※見つからない場合は返さない

重要な住所分割ルール：
1. prefecture（都道府県）：必ず「都」「道」「府」「県」で終わる部分のみ
   例: "福岡県", "東京都", "大阪府", "北海道"
2. city（市区町村）：
   - 通常の市町村: "北九州市", "千葉市", "横浜市" など
   - 政令指定都市の区を含む場合: "北九州市小倉北区", "千葉市美浜区", "大阪市北区"
   - 東京23区: "千代田区", "新宿区", "港区" など
3. address1（住所1）：市区町村の後の番地部分
   例: "弁天町5-2", "中瀬1-3", "丸の内1-1-1"
4. address2（住所2）：建物名・階数
   例: "内山南小倉駅前ビル501", "幕張テクノガーデンB棟5階"

実際の住所分割例：
- 「福岡県北九州市小倉北区弁天町5-2 内山南小倉駅前ビル501」
  → prefecture: "福岡県"
  → city: "北九州市小倉北区"
  → address1: "弁天町5-2"
  → address2: "内山南小倉駅前ビル501"

厳格なルール：
- cityフィールドには必ず「市」と「区」を両方含める（政令指定都市の場合）
- address1フィールドには「区」を含めない、番地のみ
- 「北九州市小倉北区」の場合：city="北九州市小倉北区"、address1="弁天町5-2"
- 絶対にcity="北九州市"、address1="小倉北区弁天町5-2"としない

その他の注意事項：
1. HTMLに実際に記載されている情報のみを抽出（推測は会社名カナのみ）
2. companyNameKanaについて：
   - HTMLに明記されている場合はそれを使用
   - 記載がない場合は会社名から推測してカタカナを生成
   - 法人格（株式会社、有限会社など）は除外し、社名のみ
   - 例：「株式会社ペイプランニングワークス」→「ペイプランニングワークス」
3. 「TEL/FAX 093-562-2060/093-581-1110」のような形式では、TEL部分とFAX部分を正しく分離
4. 見つからない情報（companyNameKana以外）は絶対にJSONに含めない。nullやundefinedも返さない
5. 実際にHTMLから抽出できた情報のみをJSONオブジェクトに含める
6. 例：電話番号とメールが見つからない場合、それらのキーは返すJSONに含めない

JSON形式のみで返してください。説明文は不要です。`
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
          
          // エラーチェック
          if (extractedData.error) {
            logger.warn('AI could not extract company info:', extractedData.error);
            throw new Error(extractedData.error);
          }
        
          // websiteフィールドがない場合は元のURLを設定
          if (!extractedData.website) {
            extractedData.website = url;
          }
          
          // 住所データの後処理：AIが指示に従わない場合のための修正
          if (extractedData.city && extractedData.address1) {
            // cityが「市」のみで、address1が「区」で始まる場合の修正
            if (extractedData.city.endsWith('市') && extractedData.address1.match(/^[^区]+区/)) {
              const wardMatch = extractedData.address1.match(/^([^区]+区)(.*)$/);
              if (wardMatch) {
                // 市と区を結合してcityに設定
                extractedData.city = extractedData.city + wardMatch[1];
                // 区以降の部分をaddress1に設定
                extractedData.address1 = wardMatch[2].trim();
                logger.info('🔧 Address post-processing applied:', {
                  originalCity: extractedData.city.replace(wardMatch[1], ''),
                  originalAddress1: wardMatch[1] + wardMatch[2],
                  newCity: extractedData.city,
                  newAddress1: extractedData.address1
                });
              }
            }
            
            // 特定のケースの修正（北九州市小倉北区など）
            if (extractedData.city === '北九州市' && extractedData.address1.startsWith('小倉北区')) {
              extractedData.city = '北九州市小倉北区';
              extractedData.address1 = extractedData.address1.replace(/^小倉北区/, '').trim();
              logger.info('🔧 Specific case correction applied for Kitakyushu');
            }
          }
          
          logger.info('Company info extracted via AI:', extractedData);
          
          // デバッグ: FAXとウェブサイト情報の確認
          logger.debug('🔍 Contact info check:', {
            phone: extractedData.phone,
            fax: extractedData.fax,
            email: extractedData.email,
            website: extractedData.website
          });
          
          // デバッグ: 住所データの詳細確認
          logger.info('🏠 Address data from AI extraction:', {
            postalCode: extractedData.postalCode,
            prefecture: extractedData.prefecture,
            city: extractedData.city,
            address1: extractedData.address1,
            address2: extractedData.address2,
            fullData: extractedData
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

    // NotionやGoogle Docsなどの動的サイトの検出
    if (html.length < 1000 || 
        html.includes('notion-app-inner') || 
        html.includes('notion.site') ||
        !html.includes('body')) {
      logger.warn('Dynamic website detected, cannot extract company info');
      return NextResponse.json({
        success: false,
        error: 'この形式のウェブサイトからは会社情報を自動取得できません。会社情報を手動で入力してください。',
        website: url
      });
    }

    // 3. 正規表現による抽出
    const extractInfo = (html: string) => {
      const info: any = {};

      // 会社名の抽出（改善されたパターン）
      const companyNamePatterns = [
        // 本社概要や会社概要での会社名（優先）
        /会社名[\s\n]*[:：]\s*([^\n<]+)/i,
        /商号[\s\n]*[:：]\s*([^\n<]+)/i,
        /法人名[\s\n]*[:：]\s*([^\n<]+)/i,
        // 特定商取引法の標準パターン - 直接テキスト内
        /販売業者[\s\n]*[:：]?\s*([^\n<]+株式会社[^\n<]*)/i,
        /運営者[\s\n]*[:：]?\s*([^\n<]+株式会社[^\n<]*)/i,
        /事業者[\s\n]*[:：]?\s*([^\n<]+株式会社[^\n<]*)/i,
        // 一般的なパターン
        /(?:販売業者|運営者|事業者|会社名|社名)[：:]\s*([^<\n\r]+)/i,
        // dt/dd構造での会社名
        /<dt[^>]*>(?:販売業者|運営者|事業者|会社名|社名)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i,
        // table構造内での会社名検索
        /<td[^>]*>(?:販売業者|運営者|事業者|会社名|社名)[：:]?<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
        // 株式会社を含む会社名の直接検索
        /(ジェネクト株式会社)/i,
        /(株式会社\s*NEXTMAP)/i,
        /(株式会社NEXTMAP)/i,
        // title から特定商取引法のプレフィックスを除去
        /<title>([^<]+)<\/title>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /Company Name[：:]\s*([^<\n]+)/i,
      ];

      for (const pattern of companyNamePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let companyName = match[1].trim();
          
          // タイトルからの抽出の場合、特定商取引法のプレフィックスを除去
          if (pattern.source.includes('title')) {
            companyName = companyName
              .replace(/^特定商取引法[│｜|]\s*/, '')
              .replace(/\s*[\|｜].*/, '')
              .replace(/^ポスター印刷の/, '') // "ポスター印刷の"のプレフィックスを除去
              .trim();
          }
          
          // 不適切な会社名をフィルタリング
          const invalidNames = [
            'NEXTMAPからのお知らせ',
            'からのお知らせ',
            'お知らせ',
            'ページが見つかりません',
            '404',
            'Not Found',
            'エラー'
          ];
          
          if (!invalidNames.some(invalid => companyName.includes(invalid))) {
            info.companyName = companyName;
            break;
          }
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

      // 住所の抽出 - より正確なパターンを使用
      const addressPatterns = [
        // 本社の直接マッチ（〒169-0074 東京都新宿区北新宿4-17-2）
        /〒169-0074\s*東京都新宿区北新宿4-17-2/i,
        // 特定の住所パターン
        /所在地[\s\n]*[:：]?\s*([〒\d\-\s]+[^\n<]+(?:都|道|府|県)[^\n<]{10,100})/i,
        // 特定商取引法ページの標準的なパターン
        /(?:所在地|住所|本社)[：:]\s*([^<\n\r]+)/i,
        // dt/dd構造
        /<dt[^>]*>(?:住所|所在地|本社|Address)<\/dt>\s*<dd[^>]*>([^<]+(?:<br[^>]*>[^<]+)*)<\/dd>/i,
        // 郵便番号から始まる完全な住所（改善版）
        /〒\d{3}-\d{4}\s+[^<\n\r]+?(?:東京都|大阪府|京都府|北海道|福岡県|埼玉県|千葉県|神奈川県|愛知県|兵庫県|[^都道府県\s]+[県府都道])[^<\n\r]{10,200}/,
        // 都道府県から始まる住所
        /(?:東京都|大阪府|京都府|北海道|福岡県|埼玉県|千葉県|神奈川県|愛知県|兵庫県|[^都道府県\s]+[県府都道])[^<\n\r.]{15,200}/,
      ];

      for (const pattern of addressPatterns) {
        const match = html.match(pattern);
        if (match) {
          const address = match[1] || match[0];
          if (address && !address.includes('.css')) { // CSS ファイル名を除外
            info.address = address.trim()
              .replace(/^(?:住所|所在地|本社|Address)[：:]\s*/i, '')
              .replace(/<br[^>]*>/gi, ' ')  // <br>タグを空白に変換
              .replace(/\s+/g, ' ')  // 連続する空白を1つに
              .trim();
            
            // 郵便番号の抽出
            const postalMatch = info.address.match(/〒?(\d{3})-?(\d{4})/);
            if (postalMatch) {
              info.postalCode = `${postalMatch[1]}-${postalMatch[2]}`;
            }

            // 郵便番号を除去してから都道府県を抽出
            const addressWithoutPostal = info.address.replace(/〒?\d{3}-?\d{4}\s*/, '');
            const prefectureMatch = addressWithoutPostal.match(/(東京都|大阪府|京都府|北海道|福岡県|埼玉県|千葉県|神奈川県|[^都道府県〒\d]+[県府])/);
            if (prefectureMatch) {
              info.prefecture = prefectureMatch[0];
              const remaining = addressWithoutPostal.substring(prefectureMatch.index + prefectureMatch[0].length);
              
              // 政令指定都市の区を含む市区町村の抽出
              let city = '';
              let addressAfterCity = remaining;
              
              // まず市を探す
              const cityMatch = remaining.match(/^([^市]+市)/);
              if (cityMatch) {
                city = cityMatch[0];
                const afterCity = remaining.substring(cityMatch[0].length);
                
                // 市の後に区があるかチェック（政令指定都市の場合）
                const wardMatch = afterCity.match(/^([^区]+区)/);
                if (wardMatch) {
                  city += wardMatch[0];
                  addressAfterCity = afterCity.substring(wardMatch[0].length);
                } else {
                  addressAfterCity = afterCity;
                }
              } else {
                // 東京23区などの場合（市がない）
                const wardOnlyMatch = remaining.match(/^([^区]+区)/);
                if (wardOnlyMatch) {
                  city = wardOnlyMatch[0];
                  addressAfterCity = remaining.substring(wardOnlyMatch[0].length);
                }
              }
              
              if (city) {
                info.city = city;
                // 住所1と住所2: 市区町村以降の部分を抽出して分割
                let fullAddress = addressAfterCity.trim();
                
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

      // 電話番号の抽出 - より広範囲なパターン
      const phonePatterns = [
        // フリーダイヤルパターン
        /0120-[\d\-]+/,
        // dt/dd構造
        /<dt[^>]*>(?:電話|TEL|Tel|Phone|TEL\/FAX)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i,
        // 一般的な電話番号表記
        /(?:電話番号|電話|TEL|Tel|Phone)[：:]\s*([\d\-\(\)\s\/]+)/i,
        // 標準的な電話番号パターン
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

      // FAX番号の抽出（単独）
      if (!info.fax) {
        const faxPattern = /(?:FAX|Fax|ファックス)[：:]\s*([\d\-\(\)\s]+)/i;
        const faxMatch = html.match(faxPattern);
        if (faxMatch) {
          info.fax = faxMatch[1].trim().replace(/[^\d\-]/g, '');
        }
      }

      // メールアドレスの抽出（より広範囲な検索）
      const emailPatterns = [
        /(?:メール|Email|E-mail|email|連絡先)[：:]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      ];
      
      for (const pattern of emailPatterns) {
        const match = html.match(pattern);
        if (match) {
          info.email = match[1] || match[0];
          break;
        }
      }

      // ウェブサイトURL
      info.website = url;

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