# Google Cloud Vision API 詳細設定ガイド

## 1. Google Cloud プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択

## 2. Vision APIの有効化

1. [Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com) ページへ
2. 「有効にする」をクリック

## 3. サービスアカウントの作成

1. [サービスアカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) ページへ
2. 「サービスアカウントを作成」をクリック
3. 以下の情報を入力：
   - サービスアカウント名: `accounting-ocr`
   - サービスアカウントID: 自動生成されます
   - 説明: `会計システムOCR処理用`

4. 役割を付与：
   - `Cloud Vision API User` を選択

5. キーの作成：
   - 「キーを作成」→「JSON」を選択
   - JSONファイルがダウンロードされます（重要：安全に保管）

## 4. 環境変数の設定

### ローカル開発環境

`.env` ファイルに追加：
```env
# Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
ENABLE_OCR=true
```

### Vercel環境

1. Vercelダッシュボードで環境変数を設定
2. `GOOGLE_APPLICATION_CREDENTIALS` には、JSONファイルの**内容全体**を貼り付け
3. `GOOGLE_CLOUD_PROJECT_ID` にプロジェクトIDを設定
4. `ENABLE_OCR` を `true` に設定

## 5. 料金について

### 無料枠
- 月間1,000ユニットまで無料
- テキスト検出（DOCUMENT_TEXT_DETECTION）は1画像=1ユニット

### 料金目安
- 1,001〜5,000,000ユニット: $1.50/1,000ユニット
- 日本円で約165円/1,000画像（$1=110円の場合）

### コスト管理
1. [予算アラート](https://console.cloud.google.com/billing/budgets) を設定
2. 月額上限を設定（例：$10）
3. APIクォータを設定して使用量を制限

## 6. セキュリティのベストプラクティス

### サービスアカウントキーの管理
- **絶対にGitにコミットしない**
- `.gitignore` に追加済み
- Vercelには環境変数として設定

### APIキーの制限
1. [APIキー](https://console.cloud.google.com/apis/credentials) ページへ
2. アプリケーションの制限を設定
3. APIの制限でVision APIのみを許可

## 7. テスト方法

### ローカルでのテスト
```bash
# 環境変数が正しく設定されているか確認
echo $GOOGLE_APPLICATION_CREDENTIALS

# 開発サーバー起動
npm run dev
```

### 動作確認
1. PDFまたは画像をアップロード
2. コンソールログで「Using Google Cloud Vision API」を確認
3. 実際のOCR結果が返されることを確認

## トラブルシューティング

### よくあるエラー

1. **認証エラー**
   ```
   Error: Could not load the default credentials
   ```
   → サービスアカウントキーのパスを確認

2. **API未有効化エラー**
   ```
   Error: Cloud Vision API has not been used in project
   ```
   → Vision APIを有効化

3. **権限エラー**
   ```
   Error: Permission denied
   ```
   → サービスアカウントに適切な役割を付与

### デバッグ方法

`src/lib/ocr-processor.ts` で以下を確認：
- `isGoogleCloudConfigured` の値
- `process.env.ENABLE_OCR` の値
- エラーログの内容

## まとめ

Google Cloud Vision APIの設定は任意です。設定しない場合：
- モックデータで動作継続
- 料金は発生しない
- デモ・開発には十分な機能

本番環境で実際のOCR機能が必要な場合のみ設定してください。