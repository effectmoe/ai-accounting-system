# AI会計システム統合ガイド

## 🎯 システム概要

このシステムは、以下の技術を統合して日本の会計業務を自動化します：

- **OCR処理**: Google Apps Script (GAS) Web App
- **データベース**: Supabase
- **レポート出力**: Google Sheets
- **自動化**: Mastra AI Framework
- **MCP連携**: Claude Desktop & Mastra

## 🚀 クイックスタート

### 1. 環境変数の設定

`.env.local` ファイルに以下を設定：

```env
# GAS OCR API
GAS_OCR_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
ENABLE_OCR=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Sheets（オプション）
DAILY_SHEET_ID=YOUR_SPREADSHEET_ID
DEFAULT_USER_ID=test-user
```

### 2. データベースのセットアップ

```bash
# Supabaseでテーブルを作成
# SQL Editorで /supabase/migrations/001_create_tables.sql を実行
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## 📋 主な機能

### 1. レシートのOCR処理

```typescript
// PDFや画像ファイルをアップロード
const file = new File([...], "receipt.pdf");

// OCR処理を実行
const ocrProcessor = new OCRProcessor();
const result = await ocrProcessor.processReceiptFile(file);

// 結果：
// {
//   text: "抽出されたテキスト",
//   vendor: "スターバックス",
//   date: "2025-01-05",
//   amount: 1500,
//   taxAmount: 150,
//   items: [...]
// }
```

### 2. Supabaseへのデータ保存

```typescript
// トランザクションを保存
const transaction = await transactionService.create({
  user_id: "user123",
  date: "2025-01-05",
  vendor: "スターバックス",
  amount: 1500,
  tax_amount: 150,
  // ...その他のフィールド
});
```

### 3. Google Sheetsへのエクスポート

```typescript
// トランザクションをエクスポート
const result = await SheetsExportService.exportTransactions(
  transactions,
  { createNew: true }
);

// 月次レポートをエクスポート
const report = await SheetsExportService.exportMonthlyReport(
  summary,
  2025,
  1
);
```

### 4. Mastra自動化

```bash
# 日次処理を実行
npm run mastra:daily

# 月次レポートを生成
npm run mastra:monthly
```

## 🔧 高度な設定

### Cronジョブの設定

```bash
# crontab -e で以下を追加

# 毎日午前1時に日次処理
0 1 * * * cd /path/to/project && npm run mastra:daily

# 毎月1日午前2時に月次レポート
0 2 1 * * cd /path/to/project && npm run mastra:monthly
```

### MCP統合

Claude DesktopまたはMastraから直接操作：

```typescript
// GAS操作
await MCPService.gas.createProject("新規プロジェクト");

// Sheets操作
await MCPService.sheets.updateValues(
  spreadsheetId,
  "A1:C10",
  data
);

// Supabase操作
await MCPService.supabase.query(
  "SELECT * FROM transactions WHERE date >= '2025-01-01'"
);
```

## 📊 レポート機能

### 日次レポート
- 当日の全トランザクション
- 勘定科目別の集計
- 未確認項目のリスト

### 月次レポート
- 勘定科目別の月間集計
- 前月比較
- 税務申告用データ
- AIによる分析コメント

## 🔍 トラブルシューティング

### OCRが動作しない
1. `GAS_OCR_URL` が正しく設定されているか確認
2. GAS Web Appのアクセス権限が「全員」になっているか確認
3. `ENABLE_OCR=true` が設定されているか確認

### Supabaseエラー
1. 環境変数が正しく設定されているか確認
2. テーブルが作成されているか確認
3. RLSポリシーが正しく設定されているか確認

### Google Sheetsエラー
1. GAS MCPサーバーが接続されているか確認
2. OAuth認証が完了しているか確認
3. スプレッドシートIDが正しいか確認

## 🚀 次のステップ

1. **本番環境へのデプロイ**
   - Vercelで環境変数を設定
   - Supabaseの本番プロジェクトを作成

2. **認証の実装**
   - Supabase Authを設定
   - ユーザー管理機能を追加

3. **機能拡張**
   - 複数通貨対応
   - 請求書作成機能
   - 経費精算ワークフロー

## 📚 関連ドキュメント

- [GAS OCR セットアップ](./gas-ocr-setup-guide.md)
- [Supabase セットアップ](./supabase-setup.md)
- [MCP 設定ガイド](./claude-desktop-setup-final.md)

---

質問やサポートが必要な場合は、プロジェクトのIssueでお知らせください。