# Azure Form Recognizer + MongoDB 移行ガイド

## 概要

このドキュメントは、既存のGoogle Drive/GAS OCR + Supabaseシステムから、Azure Form Recognizer + MongoDBシステムへの移行手順を説明します。

**重要**: HandwritingOCR機能は引き続き利用可能です。

## 移行の概要

### 変更前
- **OCR**: Google Vision API / Google Apps Script
- **データベース**: Supabase (PostgreSQL)
- **ファイルストレージ**: Google Drive

### 変更後
- **OCR**: Azure Form Recognizer
- **データベース**: MongoDB Atlas
- **ファイルストレージ**: MongoDB GridFS
- **HandwritingOCR**: 既存機能を保持

## セットアップ手順

### 1. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# 新システムを有効化
USE_AZURE_MONGODB=true

# Azure Form Recognizer
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FORM_RECOGNIZER_KEY=your-key-here

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/accounting?retryWrites=true&w=majority

# HandwritingOCR (既存)
HANDWRITING_OCR_API_TOKEN=your-token-here
```

### 2. MongoDBのセットアップ

```bash
# MongoDBのセットアップスクリプトを実行
npm run setup:mongodb
```

### 3. データ移行（オプション）

Supabaseから既存データを移行する場合：

```bash
# 移行スクリプトを実行
npm run migrate:supabase-to-mongodb
```

### 4. MongoDB MCP サーバーのインストール

```bash
# MongoDB MCP サーバーをインストール
npm install -g @mongodb-js/mongodb-mcp-server
```

## 新機能と改善点

### Azure Form Recognizer の利点

1. **高精度な日本語OCR**
   - 請求書、領収書の専用モデル
   - 表形式データの正確な抽出
   - 手書き文字の認識向上

2. **構造化データ抽出**
   - 自動的にフィールドを識別
   - 金額、日付、ベンダー名などを自動抽出
   - 明細行の自動解析

3. **バッチ処理**
   - 複数ファイルの並列処理
   - 高速な処理速度

### MongoDB の利点

1. **柔軟なスキーマ**
   - 可変フィールドに対応
   - カスタムフィールドの保存が容易

2. **GridFS によるファイル管理**
   - 大容量ファイルの効率的な保存
   - メタデータの統合管理

3. **高度な集計機能**
   - 財務分析の高速化
   - リアルタイムレポート生成

## API の使用方法

### OCR処理

```typescript
// Azure Form Recognizer を使用した請求書のOCR
const result = await ocrAgentAzure.tools.analyzeInvoice.execute({
  fileBuffer: base64FileData,
  fileName: 'invoice.pdf',
  companyId: 'company-id',
});
```

### データベース操作

```typescript
// MongoDBへのドキュメント作成
const document = await databaseAgentMongoDB.tools.createDocumentFromOcr.execute({
  ocrResultId: result.ocrResultId,
  companyId: 'company-id',
  documentType: DocumentType.INVOICE,
});
```

## 既存機能との互換性

### HandwritingOCR

手書き文書のOCRは引き続き利用可能：

```typescript
// 手書き文書のOCR（既存のHandwritingOCR APIを使用）
const handwritingResult = await ocrAgentAzure.tools.analyzeHandwriting.execute({
  fileBuffer: base64FileData,
  fileName: 'handwritten.jpg',
  companyId: 'company-id',
  language: 'ja',
});
```

### レガシーモード

環境変数で既存システムに切り替え可能：

```env
USE_AZURE_MONGODB=false
```

## トラブルシューティング

### Azure Form Recognizer

1. **エラー: "Endpoint not found"**
   - エンドポイントURLが正しいか確認
   - リージョンが正しいか確認

2. **エラー: "Invalid API key"**
   - APIキーが正しいか確認
   - キーの有効期限を確認

### MongoDB

1. **接続エラー**
   - 接続文字列が正しいか確認
   - IPアドレスのホワイトリスト設定を確認

2. **認証エラー**
   - ユーザー名とパスワードを確認
   - データベース名が正しいか確認

## 今後の拡張予定

1. **AI機能の強化**
   - 自動仕訳の精度向上
   - 異常検知機能

2. **レポート機能**
   - リアルタイムダッシュボード
   - カスタムレポート生成

3. **統合機能**
   - 会計ソフトとの連携
   - 銀行APIとの接続