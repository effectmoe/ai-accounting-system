import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ApiErrorResponse } from '@/lib/unified-error-handler';
import { logger } from '@/lib/logger';
import { getMastraInstance } from '@/lib/mastra';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const formData = await request.formData();
  const imageFile = formData.get('image') as File;

  if (!imageFile) {
    throw new ApiErrorResponse('画像ファイルが必要です', 400, 'IMAGE_REQUIRED');
  }

  try {
    logger.info('Processing business card image:', imageFile.name);

    // 画像をBase64に変換
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // Mastraエージェントで名刺情報を抽出
    const mastra = getMastraInstance();
    const agent = mastra.getAgent('imageAnalyzer');
    const dataUri = `data:${mimeType};base64,${base64}`;
    
    const result = await agent.generate({
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `この名刺画像から以下の情報を抽出してください：

- 会社名（companyName）
- 会社名カナ（companyNameKana）※あれば
- 氏名（name）
- 氏名カナ（nameKana）※あれば
- 部署（department）
- 役職（title）
- 電話番号（phone）
- 携帯番号（mobile）※あれば
- FAX番号（fax）※あれば
- メールアドレス（email）
- 郵便番号（postalCode）
- 都道府県（prefecture）
- 市区町村（city）
- 住所1（address1）
- 住所2（address2）※ビル名など
- ウェブサイト（website）※あれば

JSON形式で返してください。見つからない情報はnullにしてください。`
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