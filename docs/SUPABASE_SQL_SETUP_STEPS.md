# 📋 Supabase SQL セットアップ手順

## 手順1: Supabaseダッシュボードにアクセス

1. 以下のURLをクリックしてダッシュボードを開く：
   https://supabase.com/dashboard/project/clqpfmroqcnvyxdzadln

2. ログインしていない場合はログイン

## 手順2: SQL Editorを開く

![SQL Editor](https://via.placeholder.com/600x400/4f46e5/ffffff?text=SQL+Editor)

1. 左側のメニューから「**SQL Editor**」をクリック
2. 「**New query**」ボタンをクリック（または「+ New」）

## 手順3: SQLをコピー＆貼り付け

### コピーする内容
以下のファイルの**すべての内容**をコピーしてください：

📁 `/Users/tonychustudio/mastra-accounting-automation/supabase/migrations/001_initial_schema.sql`

または、以下のコマンドでファイルの内容を表示してコピー：
```bash
cat /Users/tonychustudio/mastra-accounting-automation/supabase/migrations/001_initial_schema.sql
```

### 貼り付け方法
1. SQL Editorの大きなテキストエリアに、コピーした内容を**すべて貼り付け**
2. 貼り付けた内容が以下で始まることを確認：
   ```sql
   -- Mastra Accounting System Initial Schema
   -- このファイルの内容をすべてコピーしてSupabase SQL Editorに貼り付けてください
   
   -- Enable required extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

## 手順4: SQLを実行

1. エディタの右上にある緑色の「**Run**」ボタンをクリック
2. または、キーボードショートカット：
   - Mac: `Cmd + Enter`
   - Windows: `Ctrl + Enter`

## 手順5: 実行結果の確認

### 成功した場合
- 「Success」メッセージが表示される
- エラーメッセージがない

### エラーが出た場合
よくあるエラーと対処法：

#### エラー: "type already exists"
```sql
ERROR: type "transaction_type" already exists
```
→ すでにデータベースが設定されています。問題ありません。

#### エラー: "permission denied"
→ ダッシュボードに再ログインしてください

## 手順6: テーブルが作成されたか確認

1. 左メニューから「**Table Editor**」をクリック
2. 以下のテーブルが表示されることを確認：
   - ✅ companies
   - ✅ accounts
   - ✅ transactions
   - ✅ transaction_lines
   - ✅ invoices
   - ✅ documents
   - ✅ audit_logs

## 手順7: 接続テストを実行

ターミナルで以下を実行：
```bash
npm run test:supabase
```

成功すると：
```
✅ データベース接続成功！
   companiesテーブルが存在します
```

## 🎉 完了！

これでデータベースのセットアップが完了しました。

### 次のステップ
1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで確認：
   http://localhost:3000

## トラブルシューティング

### Q: SQLをどこまでコピーすればいいですか？
A: ファイルの**最初から最後まですべて**コピーしてください。最後の行は以下で終わります：
```sql
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Q: 一部だけ実行してもいいですか？
A: いいえ、すべて一度に実行してください。テーブル間に依存関係があるため、順番に実行する必要があります。

### Q: エラーが出て止まってしまいました
A: 以下を試してください：
1. ブラウザをリロード
2. 新しいクエリを作成
3. もう一度SQLを貼り付けて実行