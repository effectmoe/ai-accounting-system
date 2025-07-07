import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Drive APIの認証設定
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
  },
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが必要です' },
        { status: 400 }
      );
    }

    // AI会計OCRフォルダのID
    const ocrFolderId = process.env.GOOGLE_DRIVE_OCR_FOLDER_ID;
    if (!ocrFolderId) {
      throw new Error('Google Drive OCRフォルダIDが設定されていません');
    }

    // ファイルをバッファに変換
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    // Google Driveにアップロード
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [ocrFolderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, name, webViewLink',
    });

    if (!driveResponse.data.id) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    // GAS Webhookを呼び出してOCR処理を開始
    const gasWebhookUrl = process.env.GAS_WEBHOOK_URL;
    if (gasWebhookUrl) {
      console.log('Calling GAS webhook:', gasWebhookUrl);
      try {
        const webhookResponse = await fetch(gasWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: driveResponse.data.id,
            fileName: driveResponse.data.name,
            uploadTime: new Date().toISOString(),
          }),
        });
        
        const webhookResult = await webhookResponse.text();
        console.log('GAS webhook response:', webhookResult);
      } catch (webhookError) {
        console.error('GAS webhook error:', webhookError);
        // Webhookエラーがあってもアップロードは成功として扱う
      }
    } else {
      console.warn('GAS_WEBHOOK_URL is not configured');
    }

    return NextResponse.json({
      success: true,
      fileId: driveResponse.data.id,
      fileName: driveResponse.data.name,
      webViewLink: driveResponse.data.webViewLink,
    });
  } catch (error) {
    console.error('Google Drive upload error:', error);
    return NextResponse.json(
      { 
        error: 'アップロードに失敗しました',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}