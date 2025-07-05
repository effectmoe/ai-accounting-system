# Google Cloud Vision API 設定ガイド

このガイドでは、Google Cloud Vision APIを使用して領収書のOCR機能を有効化する手順を説明します。

## 1. Google Cloud プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択
3. プロジェクトIDをメモしておく（後で使用）

## 2. Vision APIの有効化

1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」を選択
2. 「Cloud Vision API」を検索
3. 「有効にする」をクリック

## 3. サービスアカウントの作成

1. 「IAMと管理」→「サービスアカウント」を選択
2. 「サービスアカウントを作成」をクリック
3. 以下の情報を入力：
   - サービスアカウント名: `accounting-ocr-service`
   - サービスアカウントID: 自動生成されたものを使用
   - 説明: `会計システムのOCR処理用`

4. 「作成して続行」をクリック
5. ロールの選択で「Cloud Vision API ユーザー」を追加
6. 「続行」→「完了」をクリック

## 4. 認証キーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」
4. キーのタイプは「JSON」を選択
5. 「作成」をクリック（JSONファイルがダウンロードされる）

## 5. 環境変数の設定

### 方法1: キーファイルを使用（開発環境推奨）

1. ダウンロードしたJSONファイルを安全な場所に保存
   ```bash
   mkdir -p ~/.credentials
   mv ~/Downloads/accounting-ocr-service-xxxxx.json ~/.credentials/
   ```

2. `.env`ファイルに以下を追加：
   ```bash
   # Google Cloud Project ID
   GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
   
   # サービスアカウントキーファイルのパス
   GOOGLE_APPLICATION_CREDENTIALS=/Users/username/.credentials/accounting-ocr-service-xxxxx.json
   
   # OCR機能を有効化
   ENABLE_OCR=true
   ```

### 方法2: 環境変数に直接設定（本番環境推奨）

1. JSONファイルの内容を1行にする：
   ```bash
   cat accounting-ocr-service-xxxxx.json | jq -c '.'
   ```

2. `.env`ファイルに以下を追加：
   ```bash
   # Google Cloud Project ID
   GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
   
   # サービスアカウントキー（JSONを1行で）
   GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"..."}
   
   # OCR機能を有効化
   ENABLE_OCR=true
   ```

## 6. 必要なパッケージのインストール

```bash
npm install @google-cloud/vision
```

## 7. 動作確認

1. アプリケーションを起動
   ```bash
   npm run dev
   ```

2. チャットインターフェースで領収書画像をアップロード
3. OCR結果が表示されることを確認

## トラブルシューティング

### エラー: "The request is missing a valid API key"
- プロジェクトIDが正しく設定されているか確認
- サービスアカウントキーが正しく設定されているか確認

### エラー: "Cloud Vision API has not been used in project"
- Vision APIが有効化されているか確認
- APIが有効化されてから数分待つ

### エラー: "Permission denied"
- サービスアカウントに「Cloud Vision API ユーザー」ロールが付与されているか確認

## セキュリティに関する注意事項

1. **キーファイルの管理**
   - サービスアカウントキーファイルは絶対にGitにコミットしない
   - `.gitignore`にキーファイルのパスを追加
   - 本番環境では環境変数を使用

2. **アクセス制限**
   - サービスアカウントには最小限の権限のみ付与
   - 定期的にキーをローテーション

3. **使用量の監視**
   - Google Cloud Consoleで使用量を定期的に確認
   - 予算アラートを設定

## 料金について

Google Cloud Vision APIは従量課金制です：
- 最初の1,000ユニット/月: 無料
- 1,001〜5,000,000ユニット/月: $1.50/1,000ユニット

詳細は[料金ページ](https://cloud.google.com/vision/pricing)を参照してください。