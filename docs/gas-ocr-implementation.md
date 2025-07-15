# Google Apps Script (GAS) OCR実装ガイド

## 概要
Google DriveのOCR機能とGASを組み合わせて、無料でPDF/画像のOCRを実現します。

## 実装方法

### 1. GASプロジェクトの作成

```javascript
// Google Apps Scriptコード
function doPost(e) {
  try {
    // Base64エンコードされたファイルを受け取る
    const base64Data = e.parameter.file;
    const fileName = e.parameter.fileName || 'temp.pdf';
    
    // Base64をBlobに変換
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data), 
      'application/pdf', 
      fileName
    );
    
    // Google DriveにPDFをアップロード
    const file = DriveApp.createFile(blob);
    
    // OCR処理（Google DocsでPDFを開く）
    const docFile = Drive.Files.insert({
      title: fileName + '_OCR',
      mimeType: 'application/vnd.google-apps.document'
    }, file.getBlob(), {
      ocr: true,
      ocrLanguage: 'ja' // 日本語OCR
    });
    
    // OCR結果のテキストを取得
    const doc = DocumentApp.openById(docFile.id);
    const text = doc.getBody().getText();
    
    // 一時ファイルを削除
    file.setTrashed(true);
    DriveApp.getFileById(docFile.id).setTrashed(true);
    
    // 結果を返す
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        text: text
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 2. Next.jsアプリケーションからの呼び出し

```typescript
// app/api/ocr/gas/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // ファイルをBase64に変換
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  
  // GAS Web Appを呼び出し
  const gasUrl = process.env.GAS_OCR_URL; // GASのWebアプリURL
  
  const response = await fetch(gasUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      file: base64,
      fileName: file.name
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // OCRテキストを解析
    const parsedData = parseReceiptText(result.text);
    return NextResponse.json(parsedData);
  } else {
    return NextResponse.json(
      { error: 'OCR処理に失敗しました' },
      { status: 500 }
    );
  }
}
```

### 3. 環境変数の設定

```env
# Google Apps Script Web App URL
GAS_OCR_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## セットアップ手順

1. **Google Apps Scriptプロジェクトを作成**
   - [script.google.com](https://script.google.com) にアクセス
   - 新規プロジェクト作成
   - 上記のコードを貼り付け

2. **Drive APIを有効化**
   - サービス → Drive API を追加

3. **Webアプリとして公開**
   - デプロイ → 新しいデプロイ
   - 種類: ウェブアプリ
   - アクセス権: 全員

4. **URLを環境変数に設定**

## メリット

- ✅ 無料でOCR可能
- ✅ 日本語対応
- ✅ スキャンPDFも処理可能
- ✅ 画像ファイルも対応
- ✅ API制限なし

## 注意点

- 処理時間: 5-10秒程度かかる場合がある
- ファイルサイズ: 50MB以下推奨
- 一時的にGoogle Driveにファイルが保存される