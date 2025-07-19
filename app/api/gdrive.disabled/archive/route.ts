import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

import { logger } from '@/lib/logger';
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
    const body = await request.json();
    const { fileId, fileName } = body;

    if (!fileId || !fileName) {
      return NextResponse.json(
        { error: 'File ID and name are required' },
        { status: 400 }
      );
    }

    // 現在の年を取得
    const currentYear = new Date().getFullYear();
    const archiveFolderName = `アーカイブ ${currentYear}年`;

    // AI会計OCRフォルダのIDを環境変数から取得
    const ocrFolderId = process.env.GOOGLE_DRIVE_OCR_FOLDER_ID;
    if (!ocrFolderId) {
      throw new Error('Google Drive OCRフォルダIDが設定されていません');
    }

    // アーカイブフォルダのIDを取得（なければ作成）
    let archiveFolderId: string;
    const archiveFolderQuery = await drive.files.list({
      q: `name='${archiveFolderName}' and '${ocrFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, owners)',
      pageSize: 10  // 複数取得可能に
    });

    if (archiveFolderQuery.data.files && archiveFolderQuery.data.files.length > 0) {
      // 複数ある場合は、サービスアカウントが所有するフォルダを優先
      const serviceAccountEmail = process.env.GOOGLE_CLIENT_EMAIL;
      let selectedFolder = archiveFolderQuery.data.files[0];
      
      // サービスアカウントが所有するフォルダを探す
      for (const folder of archiveFolderQuery.data.files) {
        if (folder.owners && folder.owners.some(owner => owner.emailAddress === serviceAccountEmail)) {
          selectedFolder = folder;
          break;
        }
      }
      
      archiveFolderId = selectedFolder.id!;
      
      // 重複フォルダがある場合は警告をログに出力
      if (archiveFolderQuery.data.files.length > 1) {
        logger.warn(`警告: ${archiveFolderQuery.data.files.length}個の重複した「${archiveFolderName}」フォルダが見つかりました。ID: ${selectedFolder.id} を使用します。`);
      }
    } else {
      // アーカイブフォルダを作成
      const createFolderResponse = await drive.files.create({
        requestBody: {
          name: archiveFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [ocrFolderId]
        },
        fields: 'id'
      });
      archiveFolderId = createFolderResponse.data.id!;
    }

    // ファイルをアーカイブフォルダに移動
    // まず現在の親フォルダを取得
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    const previousParents = fileInfo.data.parents?.join(',') || '';

    // ファイルを移動
    await drive.files.update({
      fileId: fileId,
      addParents: archiveFolderId,
      removeParents: previousParents,
      fields: 'id, parents'
    });

    return NextResponse.json({
      success: true,
      message: 'ファイルをアーカイブに移動しました',
      archiveFolderId,
      archiveFolderName
    });
  } catch (error) {
    logger.error('Archive error:', error);
    return NextResponse.json(
      { 
        error: 'アーカイブ処理に失敗しました',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}