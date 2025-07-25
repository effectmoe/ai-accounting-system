"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
// Google Drive APIの設定
// 環境変数が設定されていない場合のダミー認証
const authConfig = process.env.GOOGLE_CLIENT_EMAIL ? {
    credentials: {
        type: 'service_account',
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
const auth = new googleapis_1.google.auth.GoogleAuth(authConfig);
const drive = googleapis_1.google.drive({ version: 'v3', auth });
async function POST(request) {
    // Google Drive認証が設定されていない場合はエラーを返す
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
        console.log('環境変数の確認:', {
            hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
            hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
            hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
            hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
            hasClientId: !!process.env.GOOGLE_CLIENT_ID
        });
        return server_1.NextResponse.json({
            error: 'Google Drive APIが設定されていません',
            detail: 'サーバー管理者に連絡してください'
        }, { status: 503 });
    }
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return server_1.NextResponse.json({ error: 'ファイルが提供されていません' }, { status: 400 });
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
        // ファイルをアップロード
        const stream = new stream_1.Readable();
        stream.push(buffer);
        stream.push(null);
        const media = {
            mimeType: file.type,
            body: stream,
        };
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink',
        });
        console.log('File uploaded to Google Drive:', response.data);
        // GASのOCR処理を呼び出す
        if (process.env.GAS_OCR_URL) {
            try {
                const gasResponse = await fetch(process.env.GAS_OCR_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileIds: [response.data.id]
                    }),
                });
                const gasResult = await gasResponse.json();
                console.log('GAS OCR処理結果:', gasResult);
            }
            catch (error) {
                console.error('GAS OCR呼び出しエラー:', error);
            }
        }
        return server_1.NextResponse.json({
            success: true,
            fileId: response.data.id,
            fileName: response.data.name,
            webViewLink: response.data.webViewLink,
            message: 'ファイルがGoogle Driveにアップロードされました。OCR処理を開始します。',
        });
    }
    catch (error) {
        console.error('Google Drive upload error:', error);
        return server_1.NextResponse.json({
            error: 'Google Driveへのアップロードに失敗しました',
            detail: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
