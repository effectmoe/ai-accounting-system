# API インベントリ - 会計自動化システム

## 基本情報
- **本番URL**: https://accounting-automation.vercel.app
- **MongoDB データベース**: `accounting`
- **主要コレクション**: 
  - `supplierQuotes` (72件)
  - `ocr_results` (83件) 
  - `customers` (4件)
  - `purchaseInvoices` (8件)
  - `suppliers` (51件)
  - `documents` (59件)

## メインAPI一覧

| API エンドポイント | 機能 | 使用コレクション | データ件数 | ステータス | 備考 |
|---|---|---|---|---|---|
| `/api/supplier-quotes` | 仕入先見積書管理 | `supplierQuotes` | 72件 | ✅ 正常 | GET/POST対応 |
| `/api/ocr-results` | OCR結果表示 | `ocr_results` | 83件 | ✅ 正常 | 2025-01-21修正済み |
| `/api/customers` | 顧客管理 | `customers` | 4件 | ✅ 正常 | - |
| `/api/purchase-invoices` | 仕入先請求書 | `purchaseInvoices` | 8件 | ✅ 正常 | - |
| `/api/suppliers` | 仕入先管理 | `suppliers` | 51件 | ✅ 正常 | - |
| `/api/documents` | 文書管理 | `documents` | 59件 | ✅ 正常 | - |

## デバッグAPI一覧

| デバッグAPI | 用途 | ステータス | 削除予定 |
|---|---|---|---|
| `/api/debug/db-info` | データベース情報確認 | ✅ 稼働中 | 🗑️ Yes |
| `/api/debug/direct-db-test` | 直接DB接続テスト | ✅ 稼働中 | 🗑️ Yes |
| `/api/debug/supplier-quotes-count` | 仕入先見積書カウント | ✅ 稼働中 | 🗑️ Yes |
| `/api/debug/ocr-direct` | OCR直接接続テスト | ⚠️ 404エラー | 🗑️ Yes |

## 修正履歴

### 2025-01-21 重要修正
1. **MongoDB接続修正**
   - `lib/mongodb-client.ts`: DB名を環境変数から動的取得
   - 改行文字除去処理を追加

2. **OCR結果API修正** 
   - `app/api/ocr-results/route.ts`: `documents` → `ocr_results` コレクションに変更
   - 全7箇所のdb.find/db.count呼び出しを修正
   - companyIdフィルターを削除

## 現在の問題点

### ❌ 問題
- デバッグAPIが多すぎる（4個）
- 同じ機能のAPIが重複している
- APIの役割分担が不明確

### ✅ 解決策
1. **デバッグAPIクリーンアップ**
   - 不要なデバッグAPIを全削除
   - 本番環境から削除

2. **API統合**
   - 類似機能のAPIを統合
   - 一貫したレスポンス形式

## 次回修正時の注意点

### 🚨 絶対に避けること
- 同じ機能のAPIを複数作成
- デバッグAPIを本番環境に放置
- コレクション名の変更（事前確認必須）
- フィルター条件の安易な変更

### ✅ 推奨手順
1. **既存API確認**: この表で現状を確認
2. **コレクション確認**: `/api/debug/db-info` で実際のデータを確認
3. **段階的修正**: 一つずつテストしながら修正
4. **デバッグAPIクリーンアップ**: 修正後は必ず削除

## MongoDB コレクション詳細

| コレクション名 | 件数 | 主な用途 | 関連API |
|---|---|---|---|
| `supplierQuotes` | 72 | 仕入先見積書 | `/api/supplier-quotes` |
| `ocr_results` | 83 | OCR処理結果 | `/api/ocr-results` |
| `customers` | 4 | 顧客情報 | `/api/customers` |
| `purchaseInvoices` | 8 | 仕入先請求書 | `/api/purchase-invoices` |
| `suppliers` | 51 | 仕入先情報 | `/api/suppliers` |
| `documents` | 59 | 文書管理 | `/api/documents` |

---
**最終更新**: 2025-01-21  
**作成者**: Claude & tonychustudio  
**目的**: API重複作業の防止と効率的な管理