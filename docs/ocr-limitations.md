# OCR機能の制限事項と改善案

## 現在の制限事項

### 1. スキャンPDFの処理
- **問題**: 画像として保存されたPDF（スキャンPDF）はテキスト抽出できない
- **原因**: `pdf-parse`ライブラリはテキストベースのPDFのみ対応

### 2. 画像OCR
- **問題**: 画像ファイルはモックデータを返す
- **原因**: Google Cloud Vision APIの設定が必要

## 改善案

### 短期的な改善（すぐに実装可能）

1. **エラーメッセージの改善**
   - スキャンPDFの場合、より分かりやすいエラーメッセージを表示
   - 「このPDFは画像形式のため、現在処理できません」

2. **画像変換の案内**
   - PDFを画像（PNG/JPG）に変換してアップロードするよう案内

### 中期的な改善（追加実装が必要）

1. **OCR機能の実装**
   ```javascript
   // Google Cloud Vision APIを使用
   - スキャンPDFを画像に変換
   - 画像をOCR処理
   - テキストを抽出して解析
   ```

2. **代替OCRサービス**
   - Tesseract.js（ブラウザ内OCR）
   - AWS Textract
   - Azure Computer Vision

### 実装手順

1. **Google Cloud Vision APIの有効化**
   - 環境変数の設定済み
   - APIの有効化が必要

2. **pdf2pic + OCR**
   ```javascript
   // PDFを画像に変換してOCR処理
   const pdf2pic = require('pdf2pic');
   const images = await pdf2pic.convert(pdfBuffer);
   const ocrResult = await visionClient.textDetection(images[0]);
   ```

## 現在の回避策

1. **PDFを画像として保存**
   - PDFビューアで開く
   - スクリーンショットを撮る
   - PNG/JPGとしてアップロード

2. **テキストベースPDFの使用**
   - 電子的に作成されたPDF（印刷からPDF）
   - テキスト選択可能なPDF