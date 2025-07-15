# MongoDB Atlas セットアップガイド

## 概要
このガイドでは、MongoDB Atlasの無料クラスター（M0）をセットアップし、会計システムと接続する手順を説明します。

## ステップ1: MongoDB Atlasアカウントの作成

1. **MongoDB Atlasにアクセス**
   - https://www.mongodb.com/cloud/atlas にアクセス
   - 「Try Free」をクリック

2. **アカウント作成**
   - メールアドレス、パスワードを入力
   - または、GoogleアカウントでサインアップOK
   - 利用規約に同意してアカウント作成

## ステップ2: クラスターの作成

1. **組織とプロジェクトの設定**
   - Organization Name: 任意の名前（例: `tonychustudio-org`）
   - Project Name: `accounting-system`
   - Preferred Language: `JavaScript`を選択

2. **無料クラスターの作成**
   - 「Create a deployment」画面で
   - デプロイタイプ: **M0 (Free)**を選択
   - プロバイダー: **AWS**を選択
   - リージョン: **東京（ap-northeast-1）**を選択
   - クラスター名: `accounting-cluster`

3. **作成をクリック**
   - 数分でクラスターが作成されます

## ステップ3: データベースアクセスの設定

### 3.1 データベースユーザーの作成

1. 左メニューから「Database Access」をクリック
2. 「Add New Database User」をクリック
3. 以下を設定：
   ```
   認証方法: Password
   ユーザー名: accounting-user
   パスワード: 強力なパスワードを生成（保存しておく）
   Database User Privileges: Read and write to any database
   ```
4. 「Add User」をクリック

### 3.2 IPアドレスのホワイトリスト設定

1. 左メニューから「Network Access」をクリック
2. 「Add IP Address」をクリック
3. 以下のいずれかを選択：
   - **開発環境の場合**: 「Allow Access from Anywhere」（0.0.0.0/0）
   - **本番環境の場合**: 特定のIPアドレスのみ許可
4. 「Confirm」をクリック

**重要**: 本番環境では必ず特定のIPアドレス（Vercelの固定IP等）のみを許可してください。

## ステップ4: 接続文字列の取得

1. **Databaseページに戻る**
   - 左メニューから「Database」をクリック

2. **接続文字列を取得**
   - クラスター名の横の「Connect」ボタンをクリック
   - 「Connect your application」を選択
   - Driver: `Node.js`、Version: `5.5 or later`を選択

3. **接続文字列をコピー**
   ```
   mongodb+srv://accounting-user:<password>@accounting-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. **パスワードを置き換え**
   - `<password>`を実際のパスワードに置き換え
   - データベース名を追加：`/accounting?`の形式に

   最終的な接続文字列：
   ```
   mongodb+srv://accounting-user:YourActualPassword@accounting-cluster.xxxxx.mongodb.net/accounting?retryWrites=true&w=majority
   ```

## ステップ5: 環境変数の設定

1. **`.env.local`ファイルを編集**
   ```env
   # MongoDB Atlas
   MONGODB_URI=mongodb+srv://accounting-user:YourActualPassword@accounting-cluster.xxxxx.mongodb.net/accounting?retryWrites=true&w=majority
   ```

2. **環境変数の確認**
   ```bash
   # 環境変数が正しく設定されているか確認
   npm run test:azure-mongodb
   ```

## ステップ6: データベースの初期化

1. **セットアップスクリプトの実行**
   ```bash
   npm run setup:mongodb
   ```

   このスクリプトは以下を実行します：
   - コレクションの作成
   - インデックスの作成
   - 初期データの設定

2. **接続テスト**
   スクリプトが成功すると、以下のような出力が表示されます：
   ```
   ✓ MongoDBに接続しました
   ✓ コレクションを作成しています...
   ✓ インデックスを作成しています...
   ✓ MongoDBセットアップが完了しました！
   ```

## ステップ7: MongoDB Atlasダッシュボードの確認

1. **データベースの確認**
   - MongoDB AtlasのWebコンソールで「Browse Collections」をクリック
   - `accounting`データベースが作成されていることを確認
   - 各コレクションが作成されていることを確認

2. **モニタリング**
   - 「Metrics」タブで接続状況を確認
   - 「Performance Advisor」で推奨事項を確認

## トラブルシューティング

### 接続エラーが発生する場合

1. **認証エラー**
   ```
   MongoServerError: bad auth : Authentication failed
   ```
   - ユーザー名とパスワードを確認
   - パスワードに特殊文字が含まれる場合はURLエンコードが必要

2. **ネットワークエラー**
   ```
   MongoNetworkError: connection timed out
   ```
   - IPホワイトリストを確認
   - ファイアウォール設定を確認

3. **DNS解決エラー**
   ```
   MongooseServerSelectionError: Could not connect to any servers
   ```
   - 接続文字列のフォーマットを確認
   - クラスター名が正しいか確認

### パフォーマンスの最適化

1. **インデックスの確認**
   ```javascript
   // MongoDB Compassまたはシェルで実行
   db.documents.getIndexes()
   ```

2. **接続プールの設定**
   - `.env.local`に追加：
   ```env
   MONGODB_MAX_POOL_SIZE=10
   MONGODB_MIN_POOL_SIZE=2
   ```

## セキュリティのベストプラクティス

1. **本番環境での設定**
   - IPホワイトリストを特定のIPに限定
   - データベースユーザーの権限を最小限に
   - 監査ログを有効化

2. **バックアップの設定**
   - Atlas UIから「Backup」を設定
   - 定期的なスナップショットを有効化

3. **暗号化**
   - Encryption at Restを有効化（M10以上で利用可能）
   - TLS/SSL接続を使用（デフォルトで有効）

## 完了確認

すべての設定が完了したら、以下のコマンドでシステムをテスト：

```bash
# MongoDB接続テスト
npm run test:azure-mongodb

# アプリケーションの起動
npm run dev
```

アプリケーションが正常に起動し、OCR処理とデータ保存が動作することを確認してください。

## 次のステップ

1. **データ移行**（必要な場合）
   ```bash
   npm run migrate:supabase-to-mongodb
   ```

2. **MongoDB Compassのインストール**
   - GUIでデータベースを管理
   - https://www.mongodb.com/products/compass

3. **監視とアラートの設定**
   - Atlas UIで閾値を設定
   - メール通知を有効化

---

設定に関する質問がある場合は、MongoDB Atlasのドキュメントを参照してください：
https://docs.atlas.mongodb.com/