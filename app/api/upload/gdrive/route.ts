import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { Readable } from 'stream';

import { logger } from '@/lib/logger';

// Google Drive APIの設定
// 環境変数が設定されていない場合のダミー認証
const authConfig = process.env.GOOGLE_CLIENT_EMAIL ? {
  credentials: {
    type: 'service_account' as const,
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || '',
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
    client_id: process.env.GOOGLE_CLIENT_ID || '',
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
} : {
  // ダミー認証（開発用）
  keyFile: 'dummy-key.json',
  scopes: ['https://www.googleapis.com/auth/drive.file'],
};

const auth = new GoogleAuth(authConfig);

// ファイルアップロード用のマルチパートリクエストを作成
function createMultipartBody(
  metadata: any,
  fileBuffer: Buffer,
  mimeType: string,
  boundary: string
): Buffer {
  const metadataString = JSON.stringify(metadata);
  
  const parts = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadataString,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    'Content-Transfer-Encoding: base64',
    '',
    fileBuffer.toString('base64'),
    `--${boundary}--`,
  ];
  
  return Buffer.from(parts.join('\r\n'), 'utf-8');
}

export async function POST(request: NextRequest) {
  // Google Drive認証が設定されていない場合はエラーを返す
  if (!process.env.GOOGLE_CLIENT_EMAIL) {
    logger.debug('環境変数の確認:', {
      hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID
    });
    return NextResponse.json(
      { 
        error: 'Google Drive APIが設定されていません',
        detail: 'サーバー管理者に連絡してください'
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    // Google Driveのフォルダー ID
    const FOLDER_ID = '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9';

    // ファイルをバッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイルのメタデータ
    const fileMetadata = {
      name: file.name,
      parents: [FOLDER_ID],
    };

    // 認証クライアントを取得
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken || !accessToken.token) {
      throw new Error('アクセストークンの取得に失敗しました');
    }

    // マルチパートアップロード用のboundary
    const boundary = '-------314159265358979323846';
    
    // マルチパートボディを作成
    const multipartBody = createMultipartBody(
      fileMetadata,
      buffer,
      file.type || 'application/octet-stream',
      boundary
    );

    // Google Drive APIを直接呼び出し
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartBody.length.toString(),
        },
        body: multipartBody,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Google Drive API error: ${uploadResponse.status} - ${errorText}`);
    }

    const responseData = await uploadResponse.json();
    logger.debug('File uploaded to Google Drive:', responseData);

    // GASのOCR処理を呼び出す
    if (process.env.GAS_OCR_URL) {
      try {
        const gasResponse = await fetch(process.env.GAS_OCR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileIds: [responseData.id]
          }),
        });
        
        const gasResult = await gasResponse.json();
        logger.debug('GAS OCR処理結果:', gasResult);
      } catch (error) {
        logger.error('GAS OCR呼び出しエラー:', error);
      }
    }

    return NextResponse.json({
      success: true,
      fileId: responseData.id,
      fileName: responseData.name,
      webViewLink: responseData.webViewLink,
      message: 'ファイルがGoogle Driveにアップロードされました。OCR処理を開始します。',
    });

  } catch (error) {
    logger.error('Google Drive upload error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    logger.error('Error type:', error?.constructor?.name);
    
    // より詳細なエラー情報を返す
    return NextResponse.json(
      { 
        error: 'Google Driveへのアップロードに失敗しました',
        detail: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'UnknownError',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : undefined
      },
      { status: 500 }
    );
  }
}