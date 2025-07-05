# Mastra AI-Driven Accounting Automation System

日本の税務コンプライアンスに対応したAI駆動型会計自動化システム

## 概要

このプロジェクトは、Mastraフレームワークを使用して構築された完全統合型の会計自動化システムです。日本の税制（消費税、源泉徴収税、インボイス制度など）に完全対応し、AIを活用して会計処理を自動化します。

## 主な機能

- 🤖 **AIエージェント**: 税務計算、スキーマ設計、OCR処理、コンプライアンス検証
- 📊 **ワークフロー自動化**: 会計処理、コンプライアンスレポート、請求書処理
- 🗾 **日本税制対応**: 消費税（8%/10%）、適格請求書、源泉徴収税
- 📱 **NLWeb統合**: 自然言語での会計データアクセス
- 🔍 **OCR機能**: 領収書・請求書の自動読み取り

## ディレクトリ構造

```
accounting-automation/
├── src/
│   ├── agents/           # Mastraエージェント
│   ├── workflows/        # ワークフロー定義
│   ├── lib/             # 共通ライブラリ
│   ├── config/          # 設定ファイル
│   ├── index.ts         # Mastraメインエントリー
│   └── api.ts           # API エンドポイント
├── app/                 # Next.js UI
├── supabase/           # データベーススキーマ
├── scripts/            # ユーティリティスクリプト
└── mastra.config.ts    # Mastra設定
```

## セットアップ

### 1. 環境変数の設定

`.env`ファイルに以下の変数を設定：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Google Cloud Vision (OCR)
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# Mastra
MASTRA_API_SECRET=your_generated_secret
MASTRA_API_PORT=3001
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースのセットアップ

```bash
npm run db:migrate
```

### 4. Mastraの起動

```bash
# 開発モード（ホットリロード）
npm run mastra:dev

# 本番モード
npm run mastra:start

# APIサーバーのみ
npm run mastra:api
```

## 使用方法

### エージェントの実行

```bash
# 税務ライブラリ生成
npm run mastra:agent tax-library-generator '{"taxTypes": ["consumption", "withholding"]}'

# OCR処理
npm run mastra:agent ocr-processor '{"documents": [{"type": "receipt", "fileUrl": "..."}]}'
```

### ワークフローの実行

```bash
# 会計処理ワークフロー
npm run mastra:workflow accounting-processing '{
  "companyId": "11111111-1111-1111-1111-111111111111",
  "transactionType": "income",
  "documents": []
}'

# コンプライアンスレポート生成
npm run mastra:workflow compliance-reporting '{
  "companyId": "11111111-1111-1111-1111-111111111111",
  "period": {"startDate": "2024-01-01", "endDate": "2024-12-31"},
  "reportTypes": ["consumption_tax", "withholding_tax"]
}'
```

### API経由での利用

```typescript
import { getMastraClient } from '@/lib/mastra-client';

const client = getMastraClient();

// 取引処理
const result = await client.processTransaction({
  companyId: "...",
  transactionType: "income",
  amount: 100000,
  description: "コンサルティング料"
});

// 請求書作成
const invoice = await client.createInvoice({
  companyId: "...",
  customerId: "...",
  items: [
    { description: "Webサイト制作", quantity: 1, unitPrice: 200000 }
  ]
});
```

## エージェント一覧

### 1. Tax Library Generator
- 日本の税制に基づく計算ライブラリを生成
- 消費税、源泉徴収税の計算ロジックを提供

### 2. Accounting Schema Designer
- 会計データのスキーマ設計と検証
- 勘定科目の自動分類

### 3. NLWeb Integration
- 自然言語での会計データアクセス
- レポートの自動生成

### 4. OCR Processor
- 領収書・請求書の画像からテキスト抽出
- AI強化による構造化データ抽出

### 5. Compliance Validator
- 日本の税制への準拠性チェック
- インボイス制度対応の検証

## ワークフロー一覧

### 1. Accounting Processing
- ドキュメント処理 → スキーマ検証 → 税額計算 → コンプライアンスチェック → DB保存

### 2. Compliance Reporting
- 期間指定でのコンプライアンスレポート生成
- 複数の税制に対応した包括的なレポート

### 3. Invoice Processing
- 請求書の作成、処理、送信
- 適格請求書の要件チェック

## トラブルシューティング

### Mastraが起動しない
- 環境変数が正しく設定されているか確認
- ポート3001が使用されていないか確認

### OCRが動作しない
- Google Cloud Vision APIの認証情報を確認
- 画像フォーマットがサポートされているか確認

### データベース接続エラー
- Supabaseの認証情報を確認
- データベーススキーマが最新か確認

## ライセンス

MIT License