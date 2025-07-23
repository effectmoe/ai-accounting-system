# 駐車場領収書データフロー デバッグガイド

## 問題の概要

駐車場領収書のOCR処理において、OCR結果には駐車場関連のフィールド（入庫時刻、出庫時刻、駐車時間など）が正しく抽出されているにも関わらず、最終的な文書表示時にこれらのフィールドが表示されない問題が発生しています。

## 原因

主な原因は**フィールド名の不一致**です：

1. **キャメルケース vs スネークケース**
   - OCR処理: `facilityName`, `entryTime` など（キャメルケース）
   - MongoDB保存: `facility_name`, `entry_time` など（スネークケース）
   - API応答: 両方の形式が混在

2. **データフローの各段階での変換ミス**
   - OCR結果 → MongoDB保存時
   - MongoDB → API応答時
   - API応答 → フロントエンド表示時

## データフローの詳細

```
1. OCR処理 (/lib/ocr-ai-orchestrator.ts)
   ↓ キャメルケースで生成
2. OCR API (/app/api/ocr/analyze/route.ts)
   ↓ 両方の形式で保存を試みる
3. MongoDB保存
   ↓ 一部のフィールドのみ保存される
4. 文書作成API (/app/api/documents/create-from-ocr-simple/route.ts)
   ↓ スネークケースで受け取り、保存
5. 文書取得API (/app/api/documents/[id]/route.ts)
   ↓ 両方の形式をチェックして返す
6. フロントエンド表示
   ✗ フィールドが見つからない
```

## デバッグツール

### 1. 駐車場データフロー デバッグスクリプト

特定の文書または全ての駐車場関連文書のデータフローを追跡します。

```bash
# 全ての駐車場関連文書をデバッグ
npm run debug:parking

# 特定の文書をデバッグ
npm run debug:parking -- <document-id>
```

このスクリプトは以下を確認します：
- MongoDB内の実際のフィールド名
- キャメルケースとスネークケースの存在確認
- OCR結果とのマッピング状況
- API応答のシミュレーション

### 2. フィールドマッピング修正スクリプト

フィールド名の不一致を自動的に修正します。

```bash
# ドライラン（変更内容の確認のみ）
npm run fix:parking-fields

# 実際に修正を実行
npm run fix:parking-fields -- --execute
```

このスクリプトは以下を修正します：
- キャメルケース → スネークケースの変換
- 欠落しているフィールドの補完
- receiptTypeの自動設定
- companyNameの自動設定

## 手動での確認方法

### MongoDB直接確認

```javascript
// MongoDB Compassまたはmongoshで実行
db.documents.findOne({
  $or: [
    { receipt_type: 'parking' },
    { vendor_name: /タイムズ/ }
  ]
})
```

### 問題のあるフィールドを確認

```javascript
db.documents.find({
  $and: [
    { receiptType: { $exists: true } },
    { receipt_type: { $exists: false } }
  ]
})
```

## 修正方法

### 1. 即座の修正（既存データ）

```bash
# フィールドマッピングを修正
npm run fix:parking-fields -- --execute
```

### 2. 根本的な修正（コード）

以下のファイルを修正する必要があります：

1. **`/app/api/documents/create-from-ocr-simple/route.ts`**
   - 駐車場フィールドの保存時に両方の形式で保存

2. **`/app/api/documents/[id]/route.ts`**
   - 取得時に両方の形式をチェック

3. **`/lib/ocr-ai-orchestrator.ts`**
   - 出力形式を統一（スネークケース推奨）

### 3. フロントエンドの修正

```typescript
// 両方の形式をサポート
const facilityName = document.facility_name || document.facilityName;
const entryTime = document.entry_time || document.entryTime;
// など...
```

## 推奨される長期的な解決策

1. **フィールド名の統一**
   - 全体でスネークケース（`facility_name`）に統一
   - または全体でキャメルケース（`facilityName`）に統一

2. **データ変換層の追加**
   - API層で自動的に変換する middleware を追加

3. **型定義の強化**
   - TypeScriptの型定義で一貫性を保証

4. **テストの追加**
   - 駐車場領収書のE2Eテスト
   - フィールドマッピングの単体テスト

## トラブルシューティング

### 問題: デバッグスクリプトが動かない

```bash
# 依存関係の確認
npm install tsx dotenv mongodb

# 環境変数の確認
cat .env.local | grep MONGODB
```

### 問題: 修正後も表示されない

1. ブラウザのキャッシュをクリア
2. Next.jsの再起動
3. MongoDBの接続を確認

### 問題: 新しいOCRでも問題が発生

OCR処理のログを確認：
```bash
# サーバーログを確認
npm run dev
# ブラウザでOCR実行後、ターミナルでログを確認
```

## 関連ファイル

- `/scripts/debug-parking-data-flow.ts` - デバッグスクリプト
- `/scripts/fix-parking-field-mapping.ts` - 修正スクリプト
- `/lib/ocr-processor.ts` - OCR処理の基本ロジック
- `/lib/ocr-ai-orchestrator.ts` - AI駆動のOCR解析
- `/app/api/ocr/analyze/route.ts` - OCR API エンドポイント
- `/app/api/documents/create-from-ocr-simple/route.ts` - 文書作成API
- `/app/api/documents/[id]/route.ts` - 文書取得API