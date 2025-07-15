import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // Google Drive認証
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
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL || '')}`
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    // ファイルのメタデータを取得
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'mimeType, name'
    });

    // ファイルの内容を取得
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, {
      responseType: 'stream'
    });

    // レスポンスヘッダーを設定
    const headers = new Headers();
    headers.set('Content-Type', fileMetadata.data.mimeType || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${fileMetadata.data.name}"`);
    headers.set('Cache-Control', 'public, max-age=3600');

    // ストリームをバッファに変換
    const chunks: any[] = [];
    return new Promise<NextResponse>((resolve, reject) => {
      response.data
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(new NextResponse(buffer, { headers }));
        })
        .on('error', (err) => {
          console.error('Stream error:', err);
          resolve(NextResponse.json(
            { error: 'Failed to fetch file' },
            { status: 500 }
          ));
        });
    });

  } catch (error: any) {
    console.error('Google Drive proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch file from Google Drive',
        details: error.message 
      },
      { status: 500 }
    );
  }
}