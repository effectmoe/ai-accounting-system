/**
 * Google Apps Script - OCR Web App
 * 
 * このスクリプトは、PDF/画像ファイルを受け取り、
 * Google DriveのOCR機能を使用してテキストを抽出します。
 * 
 * セットアップ手順:
 * 1. https://script.google.com で新規プロジェクト作成
 * 2. このコードを貼り付け
 * 3. サービス > Drive API を追加
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ
 * 5. アクセス権: 全員
 * 6. デプロイURLを環境変数 GAS_OCR_URL に設定
 */

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
    
    // 指定されたフォルダIDを使用（環境に応じて変更してください）
    const PARENT_FOLDER_ID = '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9';
    
    // 指定フォルダを取得
    let parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (e) {
      // フォルダが見つからない場合は一時フォルダを使用
      console.log('指定フォルダが見つかりません。一時フォルダを使用します。');
      parentFolder = getOrCreateTempFolder();
    }
    
    // Google Driveにファイルを保存
    const uploadedFile = parentFolder.createFile(blob);
    
    console.log('ファイルアップロード完了:', fileName, 'ID:', uploadedFile.getId());
    
    // OCR処理を実行
    const ocrText = performOCR(uploadedFile, mimeType);
    
    // OCRテキストから書類情報を推測
    const documentInfo = analyzeDocumentType(ocrText);
    
    // アーカイブフォルダを取得または作成
    const archiveFolder = getOrCreateArchiveFolder(parentFolder, documentInfo.year, documentInfo.month);
    
    // ファイル名を生成（税務証拠用）
    const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
    const newFileName = `${documentInfo.date}_${documentInfo.type}_${documentInfo.vendor}_${timestamp}.pdf`;
    
    // ファイルをアーカイブフォルダに移動してリネーム
    uploadedFile.setName(newFileName);
    uploadedFile.moveTo(archiveFolder);
    
    console.log('ファイルアーカイブ完了:', newFileName, 'フォルダ:', archiveFolder.getName());
    
    // 成功レスポンスを返す
    return createSuccessResponse({
      text: ocrText,
      timestamp: new Date().toISOString(),
      archived: {
        fileName: newFileName,
        folder: archiveFolder.getName(),
        path: `${archiveFolder.getName()}/${newFileName}`,
        documentInfo: documentInfo
      }
    });
    
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
  const folderName = 'OCR_Temp_' + Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
  
  // 既存のフォルダを検索
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  
  // フォルダが存在しない場合は作成
  return DriveApp.createFolder(folderName);
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
function createSuccessResponse(data) {
  // dataが文字列の場合は古い形式で処理
  if (typeof data === 'string') {
    data = {
      text: data,
      timestamp: new Date().toISOString()
    };
  }
  
  const response = {
    success: true,
    ...data
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
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📄 GAS OCR API</h1>
          <p class="status">✅ APIは正常に動作しています</p>
          
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

// OCRテキストから書類の種類と情報を分析
function analyzeDocumentType(ocrText) {
  const info = {
    type: '不明書類',
    vendor: '不明',
    date: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd'),
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0')
  };
  
  // 日付の抽出
  const datePatterns = [
    /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
    /(\d{2})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
    /令和(\d+)年(\d{1,2})月(\d{1,2})日/
  ];
  
  for (const pattern of datePatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      let year = match[1];
      if (match[0].includes('令和')) {
        year = String(2018 + parseInt(match[1]));
      } else if (year.length === 2) {
        year = `20${year}`;
      }
      info.date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      info.year = year;
      info.month = match[2].padStart(2, '0');
      break;
    }
  }
  
  // 書類タイプの判定
  if (ocrText.includes('領収書') || ocrText.includes('レシート')) {
    info.type = '領収書';
  } else if (ocrText.includes('請求書')) {
    info.type = '請求書';
  } else if (ocrText.includes('納品書')) {
    info.type = '納品書';
  } else if (ocrText.includes('見積書') || ocrText.includes('御見積')) {
    info.type = '見積書';
  } else if (ocrText.includes('契約書')) {
    info.type = '契約書';
  }
  
  // ベンダー名の抽出（最初の意味のある行）
  const lines = ocrText.split('\n').filter(line => line.trim());
  for (const line of lines) {
    const trimmedLine = line.trim();
    // 日付や金額ではない行を店舗名として採用
    if (trimmedLine && 
        !trimmedLine.match(/^\d/) && 
        trimmedLine.length > 2 &&
        !trimmedLine.includes('領収書') &&
        !trimmedLine.includes('レシート')) {
      info.vendor = trimmedLine
        .replace(/[\s　]+/g, '_')
        .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\-_]/g, '')
        .substring(0, 30); // 最大30文字
      break;
    }
  }
  
  return info;
}

// アーカイブフォルダを取得または作成
function getOrCreateArchiveFolder(parentFolder, year, month) {
  const archiveFolderName = `アーカイブ_${year}年`;
  const monthFolderName = `${month}月`;
  
  // 年別フォルダを検索または作成
  let yearFolder;
  const yearFolders = parentFolder.getFoldersByName(archiveFolderName);
  if (yearFolders.hasNext()) {
    yearFolder = yearFolders.next();
  } else {
    yearFolder = parentFolder.createFolder(archiveFolderName);
    console.log('年別フォルダ作成:', archiveFolderName);
  }
  
  // 月別フォルダを検索または作成
  let monthFolder;
  const monthFolders = yearFolder.getFoldersByName(monthFolderName);
  if (monthFolders.hasNext()) {
    monthFolder = monthFolders.next();
  } else {
    monthFolder = yearFolder.createFolder(monthFolderName);
    console.log('月別フォルダ作成:', monthFolderName);
  }
  
  return monthFolder;
}

// 定期的な一時ファイルクリーンアップ（手動実行用）
function cleanupTempFiles() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 1); // 1日以上前のファイルを削除
  
  // OCR_Tempで始まるフォルダを検索
  const folders = DriveApp.searchFolders('title contains "OCR_Temp_"');
  
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