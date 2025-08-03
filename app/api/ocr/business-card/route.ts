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
          const extractedData = {
            companyName: fields.CompanyNames?.values?.[0]?.content || null,
            name: fields.ContactNames?.values?.[0]?.content || null,
            department: fields.Departments?.values?.[0]?.content || null,
            title: fields.JobTitles?.values?.[0]?.content || null,
            phone: fields.WorkPhones?.values?.[0]?.content || fields.OtherPhones?.values?.[0]?.content || null,
            mobile: fields.MobilePhones?.values?.[0]?.content || null,
            fax: fields.Faxes?.values?.[0]?.content || null,
            email: fields.Emails?.values?.[0]?.content || null,
            website: fields.Websites?.values?.[0]?.content || null,
            address: fields.Addresses?.values?.[0]?.content || null
          };
          
          // 住所から詳細情報を抽出
          if (extractedData.address) {
            const addressParts = parseJapaneseAddress(extractedData.address);
            Object.assign(extractedData, addressParts);
          }
          
          logger.info('Extracted business card info from Azure:', extractedData);
          
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
    const agent = mastra.getAgent('imageAnalyzer');
    const dataUri = `data:${mimeType};base64,${base64}`;
    
    const result = await agent.generate({
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `この名刺画像から会社情報と個人情報を正確に抽出してJSONで返してください。

重要な注意事項：
1. 日本語の住所は以下のように分割してください：
   - 郵便番号: "802-0976"のような形式（〒マークは除く）
   - 都道府県: "福岡県"、"東京都"など（都道府県で終わる部分のみ）
   - 市区町村: "北九州市小倉南区"、"千代田区"など（市区町村を含める）
   - 住所1: "南方2-5-22"など（番地部分）
   - 住所2: "2F"、"〇〇ビル501"など（建物名・階数）

2. 抽出する情報：
- companyName: 会社名（株式会社、有限会社などの法人格を含む）
- companyNameKana: 会社名カナ（あれば）
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

// 日本の住所を解析する関数
function parseJapaneseAddress(address: string): {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
} {
  const result: any = {};
  
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
    
    // 市区町村の抽出
    const cityMatch = remaining.match(/^([^市区町村]+[市区町村])/);
    if (cityMatch) {
      result.city = cityMatch[0];
      result.address1 = remaining.substring(cityMatch[0].length).trim();
      
      // ビル名などを分離
      const buildingMatch = result.address1.match(/(.+?)([\s　]*)([^0-9０-９\s　]+ビル|[^0-9０-９\s　]+タワー|[^0-9０-９\s　]+マンション|[^0-9０-９\s　]+[0-9０-９]+F)(.*)$/);
      if (buildingMatch) {
        result.address1 = buildingMatch[1].trim();
        result.address2 = (buildingMatch[3] + buildingMatch[4]).trim();
      }
    } else {
      result.address1 = remaining.trim();
    }
  } else {
    result.address1 = address;
  }
  
  return result;
}