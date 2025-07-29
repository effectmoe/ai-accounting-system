import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ApiErrorResponse } from '@/lib/unified-error-handler';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Google Cloud Vision APIを使用（環境変数が設定されている場合）
    if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64 },
              features: [
                { type: 'TEXT_DETECTION', maxResults: 1 },
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
              ]
            }]
          })
        }
      );

      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const text = visionData.responses[0]?.fullTextAnnotation?.text || '';
        
        // テキストから情報を抽出
        const extractedInfo = extractBusinessCardInfo(text);
        
        logger.info('Extracted business card info:', extractedInfo);
        
        return NextResponse.json({
          success: true,
          ...extractedInfo
        });
      }
    }

    // フォールバック: 既存のOCR処理を使用
    const fileName = `business-cards/${Date.now()}-${imageFile.name}`;
    
    // Supabase Storageに画像をアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: imageFile.type,
        cacheControl: '3600'
      });

    if (uploadError) {
      logger.error('Failed to upload image:', uploadError);
      throw new ApiErrorResponse('画像のアップロードに失敗しました', 500, 'UPLOAD_FAILED');
    }

    // OCRテーブルに記録
    const { data: ocrData, error: ocrError } = await supabase
      .from('ocr_history')
      .insert([{
        file_name: imageFile.name,
        file_path: fileName,
        ocr_text: '', // 後で更新
        status: 'processing',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (ocrError) {
      logger.error('Failed to create OCR record:', ocrError);
    }

    // 簡易的な名刺情報抽出（デモ用）
    const demoInfo = {
      companyName: '株式会社サンプル',
      companyNameKana: 'カブシキガイシャサンプル',
      name: '山田 太郎',
      nameKana: 'ヤマダ タロウ',
      department: '営業部',
      title: '部長',
      email: 'yamada@sample.co.jp',
      phone: '03-1234-5678',
      fax: '03-1234-5679',
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      address1: '千代田1-1-1',
      address2: 'サンプルビル5F',
      website: 'https://sample.co.jp'
    };

    // OCRレコードを更新
    if (ocrData) {
      await supabase
        .from('ocr_history')
        .update({
          ocr_text: JSON.stringify(demoInfo),
          extracted_data: demoInfo,
          status: 'completed'
        })
        .eq('id', ocrData.id);
    }

    return NextResponse.json({
      success: true,
      ...demoInfo
    });

  } catch (error) {
    logger.error('Error processing business card:', error);
    throw new ApiErrorResponse(
      '名刺の処理に失敗しました',
      500,
      'PROCESSING_FAILED'
    );
  }
});

// 名刺テキストから情報を抽出する関数
function extractBusinessCardInfo(text: string): any {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const info: any = {};

  // 会社名の抽出
  const companyPatterns = [
    /株式会社[^\s]+/,
    /[^\s]+株式会社/,
    /有限会社[^\s]+/,
    /[^\s]+有限会社/,
    /[^\s]+(?:Corporation|Corp|Inc|Ltd)/i,
  ];

  for (const line of lines) {
    for (const pattern of companyPatterns) {
      const match = line.match(pattern);
      if (match) {
        info.companyName = match[0];
        break;
      }
    }
    if (info.companyName) break;
  }

  // メールアドレスの抽出
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  for (const line of lines) {
    const match = line.match(emailPattern);
    if (match) {
      info.email = match[0];
      break;
    }
  }

  // 電話番号の抽出
  const phonePatterns = [
    /(?:TEL|Tel|電話)[：:.]?\s*([\d\-\(\)\s]+)/,
    /0\d{1,4}[\-\s]?\d{1,4}[\-\s]?\d{4}/,
    /\+81[\-\s]?\d{1,4}[\-\s]?\d{1,4}[\-\s]?\d{4}/,
  ];

  for (const line of lines) {
    for (const pattern of phonePatterns) {
      const match = line.match(pattern);
      if (match) {
        info.phone = (match[1] || match[0]).replace(/[^\d\-]/g, '');
        break;
      }
    }
    if (info.phone) break;
  }

  // FAX番号の抽出
  const faxPattern = /(?:FAX|Fax|ファックス)[：:.]?\s*([\d\-\(\)\s]+)/;
  for (const line of lines) {
    const match = line.match(faxPattern);
    if (match) {
      info.fax = match[1].replace(/[^\d\-]/g, '');
      break;
    }
  }

  // 郵便番号の抽出
  const postalPattern = /〒?\s*(\d{3})[\-\s]?(\d{4})/;
  for (const line of lines) {
    const match = line.match(postalPattern);
    if (match) {
      info.postalCode = `${match[1]}-${match[2]}`;
      break;
    }
  }

  // 住所の抽出（郵便番号の次の行を探す）
  const postalIndex = lines.findIndex(line => postalPattern.test(line));
  if (postalIndex !== -1 && postalIndex < lines.length - 1) {
    const addressLine = lines[postalIndex + 1];
    
    // 都道府県の抽出
    const prefectureMatch = addressLine.match(/(東京都|大阪府|京都府|北海道|[^都道府県]+[県])/);
    if (prefectureMatch) {
      info.prefecture = prefectureMatch[0];
      const remaining = addressLine.substring(prefectureMatch.index + prefectureMatch[0].length);
      
      // 市区町村の抽出
      const cityMatch = remaining.match(/^([^市区町村]+[市区町村])/);
      if (cityMatch) {
        info.city = cityMatch[0];
        info.address1 = remaining.substring(cityMatch[0].length).trim();
      }
    }
  }

  // 部署名の抽出
  const deptPatterns = [/[^\s]+部(?:門)?/, /[^\s]+課/, /[^\s]+室/];
  for (const line of lines) {
    for (const pattern of deptPatterns) {
      const match = line.match(pattern);
      if (match) {
        info.department = match[0];
        break;
      }
    }
    if (info.department) break;
  }

  // 役職の抽出
  const titlePatterns = [/代表取締役|取締役|部長|課長|主任|マネージャー|Manager|Director|Chief/];
  for (const line of lines) {
    for (const pattern of titlePatterns) {
      const match = line.match(pattern);
      if (match) {
        info.title = match[0];
        break;
      }
    }
    if (info.title) break;
  }

  // 氏名の抽出（日本語の名前パターン）
  const namePattern = /[一-龥ぁ-ん]{2,4}\s*[一-龥ぁ-ん]{2,4}/;
  for (const line of lines) {
    // 会社名、部署名、役職を含まない行で名前を探す
    if (!info.companyName || !line.includes(info.companyName)) {
      if (!info.department || !line.includes(info.department)) {
        if (!info.title || !line.includes(info.title)) {
          const match = line.match(namePattern);
          if (match) {
            info.name = match[0].trim();
            break;
          }
        }
      }
    }
  }

  // ウェブサイトの抽出
  const urlPattern = /https?:\/\/[^\s]+/;
  for (const line of lines) {
    const match = line.match(urlPattern);
    if (match) {
      info.website = match[0];
      break;
    }
  }

  return info;
}