import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ApiErrorResponse } from '@/lib/unified-error-handler';
import { logger } from '@/lib/logger';
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { mastra } from '@/src/mastra';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const formData = await request.formData();
  const imageFile = formData.get('image') as File;

  if (!imageFile) {
    throw new ApiErrorResponse('画像ファイルが必要です', 400, 'IMAGE_REQUIRED');
  }

  try {
    logger.info('Processing business card image:', imageFile.name);

    // 画像バッファを取得
    const buffer = await imageFile.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // Azure Form Recognizerの設定を確認
    const azureEndpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
    const azureKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
    
    if (azureEndpoint && azureKey) {
      // Azure Form Recognizerでビジネスカードを分析
      try {
        logger.info('Using Azure Form Recognizer for business card OCR');
        
        const client = new DocumentAnalysisClient(
          azureEndpoint,
          new AzureKeyCredential(azureKey)
        );
        
        // prebuilt-businessCardモデルを使用
        const poller = await client.beginAnalyzeDocument(
          "prebuilt-businessCard",
          uint8Array,
          {
            contentType: imageFile.type || 'image/jpeg'
          }
        );
        
        const result = await poller.pollUntilDone();
        
        if (result.documents && result.documents.length > 0) {
          const businessCard = result.documents[0];
          const fields = businessCard.fields || {};
          
          // Azure Form Recognizerの結果を整形
          let extractedData = {
            companyName: fields.CompanyNames?.values?.[0]?.content || null,
            name: fields.ContactNames?.values?.[0]?.content || null,
            department: fields.Departments?.values?.[0]?.content || null,
            title: fields.JobTitles?.values?.[0]?.content || null,
            phone: fields.WorkPhones?.values?.[0]?.content || fields.OtherPhones?.values?.[0]?.content || null,
            mobile: fields.MobilePhones?.values?.[0]?.content || null,
            fax: fields.Faxes?.values?.[0]?.content || null,
            email: fields.Emails?.values?.[0]?.content || null,
            website: fields.Websites?.values?.[0]?.content || null,
            address: fields.Addresses?.values?.[0]?.content || null,
            postalCode: null,
            prefecture: null,
            city: null,
            address1: null,
            address2: null
          };
          
          // Azure Form Recognizerから取得した住所情報をデバッグログ出力
          logger.info('Azure Form Recognizer extracted address:', {
            fullAddress: extractedData.address,
            allAddressValues: fields.Addresses?.values?.map(v => v.content) || []
          });
          
          // 全フィールドをログ出力して確認
          logger.info('Azure Form Recognizer all fields:', {
            CompanyNames: fields.CompanyNames?.values || [],
            ContactNames: fields.ContactNames?.values || [],
            Addresses: fields.Addresses?.values || [],
            Phones: fields.WorkPhones?.values || [],
            Emails: fields.Emails?.values || [],
            allFieldNames: Object.keys(fields)
          });
          
          // OCR全文から住所を探す
          logger.info('Azure OCR full content:', result.content);
          
          // OCR結果から住所を抽出（正規表現で検索）
          const addressMatch = result.content.match(/(?:〒?\d{3}-?\d{4}\s*)?(?:東京都|大阪府|京都府|北海道|[^都道府県]+県)(.+?)(?=\s*電話|TEL|FAX|メール|$)/s);
          if (addressMatch && !extractedData.address) {
            extractedData.address = addressMatch[0].trim();
            logger.info('Address extracted from OCR content:', extractedData.address);
          }
          
          // 住所情報の分割処理
          // 住所が取得できていても、詳細な分割が必要
          if (extractedData.address || result.content.includes('県') || result.content.includes('市')) {
            
            logger.info('Azure address mapping incomplete, using Mastra for full OCR analysis');
            logger.info('Azure OCR full content:', result.content);
            
            try {
              // DeepSeek APIを直接呼び出し（Mastraエージェントのツール問題を回避）
              const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'deepseek-chat',
                  messages: [{
                    role: 'user',
                    content: `以下のOCR結果から住所情報と会社名カナを抽出して、JSONで返してください：

OCR結果:
${result.content}

抽出してほしい情報：
**住所情報:**
- postalCode: 郵便番号（XXX-XXXX形式）
- prefecture: 都道府県
- city: 市区町村（政令指定都市の場合は「市区」を連結）
- address1: 番地・丁目
- address2: 建物名・階数

**会社名カナ生成:**
- companyNameKana: 会社名の振り仮名（カタカナ）を生成してください
  - 株式会社、有限会社、合同会社、一般社団法人などの法人格接頭辞は除外
  - 例：「株式会社アベック商事」→「アベックショウジ」
  - 例：「有限会社田中製作所」→「タナカセイサクショ」
  - 例：「合同会社スカイテック」→「スカイテック」

JSON形式のみで返してください。`
                  }],
                  temperature: 0.1,
                  max_tokens: 1000
                })
              });

              const aiResult = await response.json();
              const responseText = aiResult.choices?.[0]?.message?.content || '';
              const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                               responseText.match(/\{[\s\S]*\}/);
              
              if (jsonMatch) {
                const jsonString = jsonMatch[1] || jsonMatch[0];
                const aiAddressParts = JSON.parse(jsonString);
                
                logger.info('Mastra extracted address parts:', aiAddressParts);
                console.log('🏠 DeepSeek APIが抽出した住所詳細:', JSON.stringify(aiAddressParts, null, 2));
                
                // Mastraの結果でAzureの不完全な住所情報を補完
                Object.assign(extractedData, aiAddressParts);
                
                // 完全な住所を再構築
                const fullAddressParts = [
                  aiAddressParts.postalCode ? `〒${aiAddressParts.postalCode}` : '',
                  aiAddressParts.prefecture || '',
                  aiAddressParts.city || '',
                  aiAddressParts.address1 || '',
                  aiAddressParts.address2 || ''
                ].filter(part => part).join(' ');
                
                extractedData.address = fullAddressParts;
                logger.info('Reconstructed full address:', fullAddressParts);
              }
            } catch (mastraError) {
              logger.error('Mastra address extraction failed:', mastraError);
              // Mastraが失敗した場合は元のAzure結果で住所解析を実行
              if (extractedData.address) {
                try {
                  const addressParts = await parseAddressWithAI(extractedData.address);
                  Object.assign(extractedData, addressParts);
                } catch (aiError) {
                  logger.warn('AI address parsing failed, using fallback:', aiError);
                  const addressParts = parseJapaneseAddress(extractedData.address);
                  Object.assign(extractedData, addressParts);
                }
              }
            }
          } else {
            // Azureの住所が十分な場合は通常の解析を実行
            try {
              const addressParts = await parseAddressWithAI(extractedData.address);
              Object.assign(extractedData, addressParts);
            } catch (aiError) {
              logger.warn('AI address parsing failed, using fallback:', aiError);
              const addressParts = parseJapaneseAddress(extractedData.address);
              Object.assign(extractedData, addressParts);
            }
          }
          
          // 会社名カナを生成
          if (extractedData.companyName && !extractedData.companyNameKana) {
            try {
              const companyKana = await generateCompanyNameKana(extractedData.companyName);
              extractedData.companyNameKana = companyKana;
            } catch (kanaError) {
              logger.warn('Company name kana generation failed:', kanaError);
            }
          }
          
          logger.info('Extracted business card info from Azure:', extractedData);
          
          // レスポンス前の最終データ確認
          console.log('=== FINAL RESPONSE DATA ===');
          console.log('postalCode:', extractedData.postalCode);
          console.log('prefecture:', extractedData.prefecture);
          console.log('city:', extractedData.city);
          console.log('address1:', extractedData.address1);
          console.log('address2:', extractedData.address2);
          console.log('address (full):', extractedData.address);
          console.log('========================');
          
          // 住所データが存在することを確認
          const hasAddressData = extractedData.prefecture || extractedData.city || extractedData.address1 || extractedData.address;
          console.log('住所データ存在確認:', hasAddressData);
          console.log('返却データ全体:', JSON.stringify(extractedData, null, 2));
          
          return NextResponse.json({
            success: true,
            ...extractedData
          });
        }
      } catch (azureError) {
        logger.warn('Azure Form Recognizer failed, falling back to Mastra:', azureError);
      }
    }
    
    // Azure Form Recognizerが利用できない場合はMastraエージェントを使用
    logger.info('Using Mastra agent for business card OCR');
    
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';
    const agent = mastra.getAgent('ocrAgent');
    const dataUri = `data:${mimeType};base64,${base64}`;
    
    const result = await agent.generate({
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `この名刺画像から会社情報と個人情報を正確に抽出してJSONで返してください。

💡 特に住所の完全な抽出に注意してください：
- 郵便番号から建物名・階数まで全て抽出する
- 「北九州市小倉南区南方2-5-22 2F」のような詳細な住所情報を見落とさない

重要な注意事項：
1. 日本語の住所は以下のように分割してください：
   - 郵便番号: "802-0976"のような形式（〒マークは除く）
   - 都道府県: "福岡県"、"東京都"など（都道府県で終わる部分のみ）
   - 市区町村: "北九州市小倉南区"、"千代田区"など（市区町村を含める）
   - 住所1: "南方2-5-22"など（番地部分）
   - 住所2: "2F"、"3階"、"〇〇ビル501"など（建物名・階数）

2. 抽出する情報：
- companyName: 会社名（株式会社、有限会社などの法人格を含む）
- companyNameKana: 会社名の振り仮名（カタカナ）を生成（法人格接頭辞は除外）
  例：「株式会社アベック商事」→「アベックショウジ」
- name: 氏名
- nameKana: 氏名カナ（あれば）
- department: 部署名
- title: 役職
- phone: 電話番号（ハイフン付き）
- mobile: 携帯番号（あれば）
- fax: FAX番号（あれば）
- email: メールアドレス
- postalCode: 郵便番号（XXX-XXXX形式）
- prefecture: 都道府県
- city: 市区町村（政令指定都市の場合は"市区"を連結）
- address1: 番地
- address2: 建物名・階数など
- website: ウェブサイト（あれば）

3. 実際の例：
住所が"〒802-0976 福岡県北九州市小倉南区南方2-5-22 2F"の場合：
- postalCode: "802-0976"
- prefecture: "福岡県"
- city: "北九州市小倉南区"
- address1: "南方2-5-22"
- address2: "2F"

🔍 画像をよく見て、住所の詳細部分（市区町村、番地、建物名）を見落とさないようにしてください。
見つからない情報はnullを設定してください。
JSON形式のみで返してください。`
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUri
            }
          }
        ]
      }]
    });

    // レスポンスからJSONを抽出
    const responseText = result.text || '';
    logger.debug('Agent response:', responseText);
    
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        const extractedData = JSON.parse(jsonString);
        
        // 会社名カナを生成（Mastraエージェントが生成していない場合）
        if (extractedData.companyName && !extractedData.companyNameKana) {
          try {
            const companyKana = await generateCompanyNameKana(extractedData.companyName);
            extractedData.companyNameKana = companyKana;
          } catch (kanaError) {
            logger.warn('Company name kana generation failed:', kanaError);
          }
        }
        
        logger.info('Extracted business card info:', extractedData);
        
        return NextResponse.json({
          success: true,
          ...extractedData
        });
      } else {
        throw new Error('JSONの抽出に失敗しました');
      }
    } catch (parseError) {
      logger.error('JSON parsing error:', parseError);
      logger.error('Raw response:', responseText);
      
      // パースに失敗した場合は、エラーを返す
      return NextResponse.json({
        success: false,
        error: '名刺情報の抽出に失敗しました',
        companyName: null,
        name: null,
        department: null,
        title: null,
        phone: null,
        mobile: null,
        email: null,
        postalCode: null,
        prefecture: null,
        city: null,
        address1: null,
        address2: null,
        website: null
      });
    }

  } catch (error) {
    logger.error('Error processing business card:', error);
    throw new ApiErrorResponse(
      '名刺の処理に失敗しました',
      500,
      'PROCESSING_FAILED'
    );
  }
});

// AI による住所解析関数
async function parseAddressWithAI(address: string): Promise<{
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
}> {
  try {
    const agent = mastra.getAgent('ocrAgent');
    
    const result = await agent.generate({
      messages: [{
        role: 'user',
        content: `以下の日本の住所を詳細に分割してJSONで返してください：

住所: ${address}

以下の形式で正確に分割してください：
{
  "postalCode": "XXX-XXXX", // 郵便番号（〒は除く）
  "prefecture": "〇〇県", // 都道府県
  "city": "〇〇市〇〇区", // 市区町村（政令指定都市の区も含む）
  "address1": "番地・丁目", // 番地部分
  "address2": "建物名・階数" // 建物名、階数（2F、3階など）
}

重要な注意点：
- 「北九州市小倉南区」のような政令指定都市は、市と区を組み合わせてcityとして扱う
- 「2F」「3階」「101号室」などは address2 に入れる
- 見つからない項目はnullを設定
- JSONのみ返してください（説明文は不要）`
      }]
    });

    const responseText = result.text || '';
    
    // JSONを抽出
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                     responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonString);
      
      logger.info('AI parsed address:', { input: address, output: parsed });
      return parsed;
    }
    
    throw new Error('JSONの抽出に失敗しました');
    
  } catch (error) {
    logger.error('AI address parsing failed, falling back to regex:', error);
    // AI解析が失敗した場合は従来の関数にフォールバック
    return parseJapaneseAddress(address);
  }
}

// 日本の住所を解析する関数（フォールバック用）
function parseJapaneseAddress(address: string): {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
} {
  const result: any = {};
  
  logger.info('parseJapaneseAddress input:', address);
  
  
  // 郵便番号の抽出
  const postalMatch = address.match(/〒?\s*(\d{3})[-\s]?(\d{4})/);
  if (postalMatch) {
    result.postalCode = `${postalMatch[1]}-${postalMatch[2]}`;
    address = address.replace(postalMatch[0], '').trim();
  }
  
  // 都道府県の抽出
  const prefectureMatch = address.match(/(東京都|大阪府|京都府|北海道|[^都道府県]+[県])/);
  if (prefectureMatch) {
    result.prefecture = prefectureMatch[0];
    const remaining = address.substring(prefectureMatch.index! + prefectureMatch[0].length);
    
    // 市区町村の抽出（政令指定都市の区も含む）
    // 「北九州市小倉南区」「札幌市中央区」などにマッチ
    const cityMatch = remaining.match(/^(.+?市.+?区|.+?[市区町村])/);
    if (cityMatch) {
      result.city = cityMatch[1];
      result.address1 = remaining.substring(cityMatch[1].length).trim();
      
      // ビル名・階数などを分離（「2F」「3階」「101号室」など）
      const buildingMatch = result.address1.match(/(.+?)\s*([0-9０-９]+[FfＦｆ階]|.+?(?:ビル|タワー|マンション|ハイツ|コーポ|アパート).*)$/);
      if (buildingMatch) {
        result.address1 = buildingMatch[1].trim();
        result.address2 = buildingMatch[2].trim();
      }
    } else {
      result.address1 = remaining.trim();
    }
  } else {
    result.address1 = address;
  }
  
  logger.info('parseJapaneseAddress output:', result);
  return result;
}

// 会社名からカナを生成する関数
async function generateCompanyNameKana(companyName: string): Promise<string | null> {
  try {
    logger.info('Generating company name kana for:', companyName);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `以下の会社名から、法人格接頭辞を除外したカタカナ読みを生成してください：

会社名: ${companyName}

ルール：
1. 株式会社、有限会社、合同会社、一般社団法人、合名会社、合資会社、医療法人、社会福祉法人などの法人格接頭辞は除外
2. カタカナのみで返す（ひらがな、漢字、英数字は含めない）
3. 長音符「ー」は使用可能

例：
- 「株式会社山田商事」→「ヤマダショウジ」  
- 「有限会社田中製作所」→「タナカセイサクショ」
- 「合同会社スカイテック」→「スカイテック」
- 「医療法人清水会」→「シミズカイ」

カタカナのみで返してください。`
        }],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    const aiResult = await response.json();
    const responseText = aiResult.choices?.[0]?.message?.content || '';
    
    // カタカナのみを抽出（英数字、記号、ひらがなを除外）
    const kanaMatch = responseText.match(/[ァ-ヴー]+/);
    const companyKana = kanaMatch ? kanaMatch[0] : null;
    
    logger.info('Generated company name kana:', { input: companyName, output: companyKana });
    
    return companyKana;
    
  } catch (error) {
    logger.error('Company name kana generation error:', error);
    throw error;
  }
}