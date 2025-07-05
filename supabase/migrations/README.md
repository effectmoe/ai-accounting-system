# Supabase マイグレーション

## 実行順序

1. ✅ **001_initial_schema_safe.sql** - 基本テーブルの作成（実行済み）
   - companies, accounts, transactions, documents, journal_entries等

2. ⏭️ **002_add_missing_columns.sql** - 追加カラム（必要に応じて実行）

3. ⏭️ **003_import_batches.sql** - インポート機能（必要に応じて実行）

4. ⏭️ **004_items_and_tags.sql** - 商品・タグ機能（必要に応じて実行）

5. ⏭️ **005_partners.sql** - 取引先管理（必要に応じて実行）

6. ❌ **006_documents.sql** - スキップ推奨
   - 理由：`documents`テーブルは既に001で作成済み
   - `company_users`等の依存テーブルが存在しない

7. ✅ **007_additional_tables.sql** - 追加テーブル（必要に応じて実行）
   - company_users, departments, memo_tags等

## 注意事項

- 001が実行済みなら、基本的な機能は動作可能
- 006はスキップしても問題なし
- 追加機能が必要な場合のみ、他のマイグレーションを実行