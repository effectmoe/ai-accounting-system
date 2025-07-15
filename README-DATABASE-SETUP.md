# Database Setup Guide

AAM会計システムのデータベースセットアップガイドです。

## 問題

「文書化」ボタンをクリックすると以下のエラーが発生します：

```
Could not find the 'document_type' column of 'documents' in the schema cache
```

これは、Supabaseデータベースに必要なテーブルが作成されていないことが原因です。

## 解決方法

### 方法1: SQLファイルを使用（推奨）

1. **Supabase SQL Editorにアクセス**
   ```
   https://app.supabase.com/project/clqpfmroqcnvyxdzadln/sql/new
   ```

2. **SQLファイルの内容をコピー&ペースト**
   - `create-tables.sql` ファイルの内容を全てコピー
   - SQL Editorにペーストして「Run」ボタンをクリック

3. **実行結果を確認**
   - エラーがないことを確認
   - 最後のSELECT文でテーブルの作成とレコード数を確認

### 方法2: セットアップスクリプトを使用

```bash
npm run setup-database
```

このコマンドで実行可能なSQLが生成され、手順が表示されます。

## 作成されるテーブル

1. **companies** - 会社情報
2. **partners** - 取引先情報  
3. **documents** - 書類（見積書、請求書、領収書など）
4. **document_items** - 書類の明細

## テーブル作成後の確認

1. **Webアプリケーションをリロード**
2. **「文書化」ボタンをクリック**
3. **エラーが解消され、文書が正常に作成されることを確認**

## トラブルシューティング

### エラー: "relation does not exist"
- 手順1-3を再度実行してください
- Supabaseプロジェクトが正しいかを確認してください

### エラー: "foreign key constraint"
- SQLを順番通りに実行していることを確認してください
- 必要に応じて、既存のテーブルを削除してから再作成してください

### 文書化ボタンがまだエラーになる場合
1. ブラウザのキャッシュをクリア
2. 開発サーバーを再起動: `npm run dev`
3. Supabaseダッシュボードでテーブルが正しく作成されているか確認

## データベーススキーマ

### Documents Table

```sql
documents (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  document_type VARCHAR(20) -- 'estimate', 'invoice', 'delivery_note', 'receipt'
  document_number VARCHAR(50),
  issue_date DATE,
  partner_name VARCHAR(255),
  subtotal DECIMAL(15, 2),
  tax_amount DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  -- ... その他のフィールド
)
```

### 関連テーブル

- **document_items**: 書類の明細行
- **companies**: 会社マスタ（デモ会社含む）
- **partners**: 取引先マスタ

## 完了確認

以下の手順で正常に動作することを確認してください：

1. OCR処理済みのレシートが表示される
2. 「文書化」ボタンをクリック
3. 成功メッセージが表示される
4. 「作成済み文書」タブに文書が表示される

---

*このガイドに従ってもエラーが解決しない場合は、開発者にお問い合わせください。*