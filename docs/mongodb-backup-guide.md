# MongoDB バックアップ設定ガイド

## 概要

AI会計システムのMongoDB Atlasバックアップ設定と復元手順

---

## 1. MongoDB Atlas Cloud Backup設定確認

### Free Tier (M0) の制限事項

**重要**: 現在使用しているFree Tier (M0)クラスタでは以下の機能が利用できません：

- ❌ **Cloud Backup（自動バックアップ）**: M2以上のクラスタで利用可能
- ❌ **Point-in-Time Restore (PITR)**: M10以上のクラスタで利用可能
- ✅ **手動バックアップスクリプト**: mongodumpを使用した手動バックアップ（**推奨**）

### Atlas ダッシュボードでの確認方法

1. **MongoDB Atlas にログイン**
   - URL: https://cloud.mongodb.com/
   - プロジェクト: `accounting-cluster`

2. **クラスタ情報の確認**
   - クラスタ名: `accounting-cluster`
   - リージョン: `AWS / Singapore (ap-southeast-1)`
   - Tier: `M0 Sandbox (Free)`

3. **データベースサイズの確認**
   - Collections タブ → `accounting` データベース
   - 現在のストレージ使用量を確認
   - Free Tier 上限: **512MB**

---

## 2. 手動バックアップの実行

### 前提条件

MongoDB Database Toolsのインストールが必要です：

```bash
# macOS
brew install mongodb/brew/mongodb-database-tools

# インストール確認
mongodump --version
mongorestore --version
```

### バックアップ実行

```bash
# プロジェクトルートで実行
cd /Users/tonychustudio/ai-accounting-system

# バックアップスクリプト実行
./scripts/backup-mongodb.sh
```

**実行結果**:
- バックアップ先: `backups/mongodb/YYYYMMDD_HHMMSS/`
- 形式: gzip圧縮されたBSONファイル
- 保持期間: 30日（31日以上前のバックアップは自動削除）

---

## 3. リストア（復元）手順

### リストア実行

```bash
# バックアップ一覧を確認
ls -lt backups/mongodb/

# リストアスクリプト実行
./scripts/restore-mongodb.sh backups/mongodb/20250107_150000
```

**注意事項**:
- ⚠️ **既存データは上書きされます**（`--drop`オプション使用）
- 実行前に確認プロンプトが表示されます
- 本番環境での実行は慎重に行ってください

---

## 4. 推奨バックアップスケジュール

### 週次バックアップ（手動）

**実行タイミング**: 毎週日曜日 22:00

```bash
# crontabに追加する場合（例）
0 22 * * 0 cd /Users/tonychustudio/ai-accounting-system && ./scripts/backup-mongodb.sh >> logs/backup.log 2>&1
```

### バックアップ前の確認事項

- [ ] ディスク空き容量が十分にあること（最低1GB以上推奨）
- [ ] MongoDB Atlasクラスタが正常に稼働していること
- [ ] .env.local ファイルにMONGODB_URIが設定されていること

---

## 5. Cloudflare移行後の考慮事項

### データベースは変更なし

- ✅ MongoDB Atlasは継続使用
- ✅ 接続文字列（MONGODB_URI）は変更なし
- ✅ トランザクション対応が必須（会計データの整合性）
- ✅ Free Tier 512MBで数万件の領収書を保存可能

### 移行時のバックアップ

**Cloudflare移行前**:
1. 本番データの完全バックアップを実行
2. バックアップの検証（リストアテスト）
3. バックアップファイルを安全な場所に保存

**移行後**:
1. データ整合性の確認
2. 新環境での初回バックアップ実行

---

## 6. トラブルシューティング

### エラー: mongodump コマンドが見つかりません

**原因**: MongoDB Database Toolsがインストールされていない

**解決方法**:
```bash
brew install mongodb/brew/mongodb-database-tools
```

### エラー: MONGODB_URI が設定されていません

**原因**: .env.local ファイルが存在しないか、MONGODB_URIが未設定

**解決方法**:
1. .env.local ファイルの存在確認
2. MONGODB_URI変数が正しく設定されているか確認

### エラー: connection refused

**原因**: ネットワーク接続の問題、またはMongoDB Atlasクラスタが停止している

**解決方法**:
1. インターネット接続を確認
2. MongoDB Atlasダッシュボードでクラスタステータスを確認
3. IP Access Listに現在のIPアドレスが登録されているか確認

---

## 7. セキュリティ上の注意

### バックアップファイルの取り扱い

- ⚠️ バックアップファイルには機密情報が含まれます
- ✅ `.gitignore`にバックアップディレクトリが追加済み
- ✅ バックアップファイルはローカルのみに保存
- ❌ バックアップファイルをGitリポジトリにコミットしない
- ❌ バックアップファイルをクラウドストレージに保存する際は暗号化必須

### アクセス制御

- MongoDB Atlasの接続情報（.env.local）は厳重に管理
- 定期的にパスワードを変更（3ヶ月に1回推奨）
- IP Access Listを適切に設定

---

## まとめ

✅ **完了した設定**:
- 手動バックアップスクリプト作成（backup-mongodb.sh）
- リストアスクリプト作成（restore-mongodb.sh）
- バックアップディレクトリ作成（backups/mongodb/）
- .gitignoreにバックアップディレクトリ追加済み

⏭️ **次のステップ**:
1. MongoDB Database Toolsのインストール
2. 初回バックアップの実行とテスト
3. 週次バックアップスケジュールの設定
4. Cloudflare移行準備
