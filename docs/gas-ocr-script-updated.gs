/**
 * Google Apps Script - OCR Web App (Updated)
 * 
 * このスクリプトは、PDF/画像ファイルを受け取り、
 * Google DriveのOCR機能を使用してテキストを抽出します。
 * 
 * セットアップ手順:
 * 1. https://script.google.com で新規プロジェクト作成
 * 2. このコードを貼り付け
 * 3. サービス > Drive API を追加
 * 4. PARENT_FOLDER_ID を設定（下記参照）
 * 5. デプロイ > 新しいデプロイ > ウェブアプリ
 * 6. アクセス権: 全員
 * 7. デプロイURLを環境変数 GAS_OCR_URL に設定
 */

// ==================== 設定項目 ====================
// Google DriveのフォルダIDを設定してください
// フォルダのURLから取得: https://drive.google.com/drive/folders/[ここがフォルダID]
const PARENT_FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // ← ここにフォルダIDを設定
// ================================================

// POSTリクエストを処理
function doPost(e) {
  try {
    // リクエストパラメータを取得
    const params = e.parameter;
    
    if (!params.file) {
      return createErrorResponse('ファイルデータが提供されていません');
    }
    
    // Base64エンコードされたファイルをデコード
    const fileData = Utilities.base64Decode(params.file);
    const fileName = params.fileName || 'upload.pdf';
    
    // ファイルタイプを判定
    const mimeType = getMimeType(fileName);
    
    // Blobオブジェクトを作成
    const blob = Utilities.newBlob(fileData, mimeType, fileName);
    
    // 一時フォルダを作成または取得
    const tempFolder = getOrCreateTempFolder();
    
    // Google Driveにファイルを保存
    const uploadedFile = tempFolder.createFile(blob);
    
    console.log('ファイルアップロード完了:', fileName, 'ID:', uploadedFile.getId());
    
    // OCR処理を実行
    const ocrText = performOCR(uploadedFile, mimeType);
    
    // 一時ファイルを削除
    uploadedFile.setTrashed(true);
    
    // 成功レスポンスを返す
    return createSuccessResponse(ocrText);
    
  } catch (error) {
    console.error('OCR処理エラー:', error);
    return createErrorResponse(error.toString());
  }
}

// OCR処理を実行
function performOCR(file, mimeType) {
  try {
    let ocrText = '';
    
    if (mimeType === 'application/pdf') {
      // PDFの場合、Google Docsに変換してOCR
      ocrText = performPDFOCR(file);
    } else if (mimeType.startsWith('image/')) {
      // 画像の場合、直接OCR
      ocrText = performImageOCR(file);
    } else {
      throw new Error('サポートされていないファイル形式です');
    }
    
    return ocrText;
  } catch (error) {
    console.error('OCR実行エラー:', error);
    throw error;
  }
}

// PDF用OCR処理
function performPDFOCR(pdfFile) {
  try {
    // Drive APIを使用してPDFをGoogle Docsに変換（OCR付き）
    const resource = {
      title: pdfFile.getName() + '_OCR',
      mimeType: 'application/vnd.google-apps.document',
      parents: [{id: pdfFile.getParents().next().getId()}]
    };
    
    const options = {
      ocr: true,
      ocrLanguage: 'ja' // 日本語OCR
    };
    
    // PDFをGoogle Docsに変換
    const docFile = Drive.Files.insert(resource, pdfFile.getBlob(), options);
    
    // Google Docsを開いてテキストを取得
    const doc = DocumentApp.openById(docFile.id);
    const text = doc.getBody().getText();
    
    // 変換したDocsファイルを削除
    DriveApp.getFileById(docFile.id).setTrashed(true);
    
    return text;
  } catch (error) {
    console.error('PDF OCRエラー:', error);
    throw new Error('PDFのOCR処理に失敗しました: ' + error.toString());
  }
}

// 画像用OCR処理
function performImageOCR(imageFile) {
  try {
    // 画像を一時的にGoogle Docsに変換してOCR
    const resource = {
      title: imageFile.getName() + '_OCR',
      mimeType: 'application/vnd.google-apps.document',
      parents: [{id: imageFile.getParents().next().getId()}]
    };
    
    const options = {
      ocr: true,
      ocrLanguage: 'ja' // 日本語OCR
    };
    
    // 画像をGoogle Docsに変換
    const docFile = Drive.Files.insert(resource, imageFile.getBlob(), options);
    
    // Google Docsを開いてテキストを取得
    const doc = DocumentApp.openById(docFile.id);
    const text = doc.getBody().getText();
    
    // 変換したDocsファイルを削除
    DriveApp.getFileById(docFile.id).setTrashed(true);
    
    return text;
  } catch (error) {
    console.error('画像OCRエラー:', error);
    throw new Error('画像のOCR処理に失敗しました: ' + error.toString());
  }
}

// 一時フォルダを取得または作成
function getOrCreateTempFolder() {
  try {
    // 親フォルダを取得
    let parentFolder;
    if (PARENT_FOLDER_ID && PARENT_FOLDER_ID !== 'YOUR_FOLDER_ID_HERE') {
      try {
        parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
        console.log('親フォルダを使用:', parentFolder.getName());
      } catch (error) {
        console.error('指定されたフォルダIDが無効です。ルートフォルダを使用します。', error);
        parentFolder = DriveApp.getRootFolder();
      }
    } else {
      console.log('フォルダIDが設定されていません。ルートフォルダを使用します。');
      parentFolder = DriveApp.getRootFolder();
    }
    
    const folderName = 'OCR_Temp_' + Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
    
    // 既存のフォルダを検索（親フォルダ内）
    const folders = parentFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      return folders.next();
    }
    
    // フォルダが存在しない場合は作成
    return parentFolder.createFolder(folderName);
  } catch (error) {
    console.error('フォルダ作成エラー:', error);
    throw new Error('一時フォルダの作成に失敗しました: ' + error.toString());
  }
}

// MIMEタイプを判定
function getMimeType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// 成功レスポンスを作成
function createSuccessResponse(text) {
  const response = {
    success: true,
    text: text,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// エラーレスポンスを作成
function createErrorResponse(error) {
  const response = {
    success: false,
    error: error,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// テスト用GET関数
function doGet(e) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GAS OCR API</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 40px auto; 
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 { color: #333; }
          .status { 
            color: #22c55e; 
            font-weight: bold;
          }
          code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
          .endpoint {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
          }
          .info-box {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📄 GAS OCR API</h1>
          <p class="status">✅ APIは正常に動作しています</p>
          
          <div class="info-box">
            <strong>⚙️ 設定状態:</strong><br>
            親フォルダID: ${PARENT_FOLDER_ID === 'YOUR_FOLDER_ID_HERE' ? '未設定（ルートフォルダを使用）' : PARENT_FOLDER_ID}
          </div>
          
          <h2>エンドポイント情報</h2>
          <div class="endpoint">
            <strong>Method:</strong> POST<br>
            <strong>URL:</strong> ${ScriptApp.getService().getUrl()}<br>
            <strong>Content-Type:</strong> application/x-www-form-urlencoded
          </div>
          
          <h2>リクエストパラメータ</h2>
          <ul>
            <li><code>file</code>: Base64エンコードされたファイルデータ（必須）</li>
            <li><code>fileName</code>: ファイル名（オプション）</li>
          </ul>
          
          <h2>対応ファイル形式</h2>
          <ul>
            <li>PDF (.pdf)</li>
            <li>画像 (.png, .jpg, .jpeg, .gif, .bmp, .tiff)</li>
          </ul>
          
          <h2>レスポンス形式</h2>
          <pre><code>{
  "success": true,
  "text": "OCRで抽出されたテキスト",
  "timestamp": "2025-07-05T12:00:00.000Z"
}</code></pre>
          
          <p><small>最終更新: ${new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'})}</small></p>
        </div>
      </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html);
}

// 定期的な一時ファイルクリーンアップ（手動実行用）
function cleanupTempFiles() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 1); // 1日以上前のファイルを削除
  
  let query = 'title contains "OCR_Temp_"';
  if (PARENT_FOLDER_ID && PARENT_FOLDER_ID !== 'YOUR_FOLDER_ID_HERE') {
    query += ` and '${PARENT_FOLDER_ID}' in parents`;
  }
  
  // OCR_Tempで始まるフォルダを検索
  const folders = DriveApp.searchFolders(query);
  
  let deletedCount = 0;
  while (folders.hasNext()) {
    const folder = folders.next();
    const createdDate = folder.getDateCreated();
    
    if (createdDate < cutoffDate) {
      folder.setTrashed(true);
      deletedCount++;
      console.log('削除:', folder.getName());
    }
  }
  
  console.log(`${deletedCount}個の一時フォルダを削除しました`);
}