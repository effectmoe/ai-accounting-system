# 仕訳伝票フィールド比較レポート

## 概要
このレポートは、仕訳伝票（J202500004）作成プロセスにおいて、通常フィールドと駐車場フィールドがどのように処理されているかを調査した結果をまとめたものです。

## 調査結果

### 1. データベース構造
- **利用可能なコレクション**: `documents`, `items`
- **journalsコレクション**: 存在しない（仕訳も`documents`コレクションに保存）
- **documentType**: 領収書は`receipt`、仕訳伝票は`journal_entry`

### 2. フィールドマッピングの実装状況

#### 通常フィールド（正常にコピーされる）
```typescript
// app/api/journals/create/route.ts より
totalAmount      // 金額
issueDate        // 日付
partnerName      // 取引先名（vendorNameから）
category         // 勘定科目
gridfsFileId     // 画像ID
```

#### 駐車場フィールド（実装済みだが動作確認必要）
```typescript
// app/api/journals/create/route.ts の177-184行目
receipt_type: sourceDocument?.receipt_type || sourceDocument?.receiptType,
facility_name: sourceDocument?.facility_name || sourceDocument?.facilityName,
entry_time: sourceDocument?.entry_time || sourceDocument?.entryTime,
exit_time: sourceDocument?.exit_time || sourceDocument?.exitTime,
parking_duration: sourceDocument?.parking_duration || sourceDocument?.parkingDuration,
base_fee: sourceDocument?.base_fee || sourceDocument?.baseFee,
additional_fee: sourceDocument?.additional_fee || sourceDocument?.additionalFee,
```

### 3. 問題の分析

#### 駐車場フィールドがコピーされない可能性のある原因：

1. **元の領収書に駐車場情報が存在しない**
   - OCR処理時に駐車場情報が抽出されていない
   - documentsコレクションへの保存時に駐車場フィールドが欠落

2. **フィールド名の不一致**
   - snake_case（receipt_type）とcamelCase（receiptType）の混在
   - コードは両方のケースを処理しているが、実データで確認が必要

3. **仕訳作成のタイミング**
   - 古い仕訳は実装前に作成された可能性
   - 最新のコードでは駐車場フィールドがコピーされるはず

### 4. 現在の実装の評価

**良い点:**
- 仕訳作成APIは駐車場フィールドを明示的にコピーする実装がある
- snake_caseとcamelCaseの両方に対応
- sourceDocumentから情報を引き継ぐ設計

**改善が必要な点:**
- OCR結果から領収書作成時の駐車場フィールドの保存
- フィールド名の統一（snake_case or camelCase）
- デバッグログの追加

### 5. 推奨される対応

1. **即時対応**
   - 既存の仕訳伝票に対して`fix-journal-parking-info.ts`スクリプトを実行
   - 元の領収書から駐車場情報を手動でコピー

2. **長期的改善**
   - OCR処理パイプラインの駐車場情報抽出を確認
   - フィールド名の命名規則を統一
   - 仕訳作成時のログを強化して問題を早期発見

## 結論

仕訳伝票作成プロセスには駐車場フィールドをコピーする実装が存在していますが、実際のデータでは駐車場情報が欠落している可能性があります。これは主に、OCR処理段階または領収書保存段階での問題が原因と考えられます。

コード自体は正しく実装されているため、データフローの各段階でのデバッグが必要です。