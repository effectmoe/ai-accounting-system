# AAM会計システム リファクタリング指示書

## 重要な注意事項
前回のリファクタリングでAPI設定とファイル構造に問題が発生したため、今回は極めて慎重に作業を行います。

## 絶対に変更してはいけない領域
1. **APIルート構造**
   - `/app/api/*/route.ts` のファイル名と場所
   - HTTPメソッド（GET, POST, PATCH, DELETE）の定義
   - APIレスポンスの形式

2. **データベース接続**
   - `/lib/mongodb-client.ts`
   - GridFS関連の関数（getGridFSBucket）
   - MongoDB接続文字列と設定

3. **環境変数**
   - `.env.local` の内容
   - 環境変数名の変更禁止

## リファクタリング対象

### 1. フロントエンドコンポーネントの重複排除
**対象ファイル**:
- `/app/documents/DocumentsContent.tsx`
- `/app/documents/DocumentsContentMongoDB.tsx`
- `/app/customers/CustomersContent.tsx`
- `/app/suppliers/SuppliersContent.tsx`

**改善内容**:
- 共通のテーブル/グリッド表示ロジックを抽出
- 共通コンポーネント化（`/components/common/DataTable.tsx`など）

### 2. エラーハンドリングの統一
**対象**:
- 各APIルートの try-catch ブロック
- フロントエンドのエラー表示

**改善内容**:
- 統一的なエラーレスポンス形式
- 共通エラーハンドラーの活用

### 3. 型定義の整理
**対象**:
- `/types/*.ts` ファイル群
- 各コンポーネント内のインライン型定義

**改善内容**:
- 重複する型定義の統合
- 名前空間による整理

### 4. 未使用コードの削除
**対象**:
- `.backup` ファイル
- コメントアウトされた古いコード
- 未使用のインポート

## 作業手順

1. **個別ファイルごとに作業**
   - 一度に複数のファイルを変更しない
   - 各変更後にビルドテストを実行

2. **テスト実行**
   ```bash
   npm run build
   npm run dev
   ```
   各ステップでエラーがないことを確認

3. **APIテスト**
   - Postmanまたはcurlで主要APIをテスト
   - 特に以下のエンドポイント：
     - GET /api/documents/list
     - POST /api/ocr/analyze
     - GET /api/files/[id]

4. **ロールバック準備**
   - 各変更前に git commit
   - 問題発生時は即座に revert

## 参照ドキュメント
- `/Users/tonychustudio/Documents/alldocs/report/2025-07-22_AAM会計システムAPI相関関係分析レポート.md`
- `/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/repomix-output.xml`

## 成功基準
1. すべてのAPIが変更前と同じレスポンスを返す
2. ビルドエラーがない
3. 開発サーバーが正常に起動する
4. OCRアップロード→表示→ダウンロードの一連の流れが動作する