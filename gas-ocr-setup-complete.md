# GAS OCR Webhook 完全セットアップガイド

## 概要
Google Apps Script (GAS) を使用してOCR処理を行うWebアプリケーションを作成します。
このシステムは、Google Driveに保存されたPDFや画像ファイルをOCR処理し、結果をSupabaseに保存します。

## 設定情報

### Supabase情報
- **Supabase URL**: `https://cjqwqvvxqvlufrvnmqtx.supabase.co`
- **Supabase Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcXdxdnZ4cXZsdWZydm5tcXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0Mjg5NDcsImV4cCI6MjA1NzAwNDk0N30.1hCFMoJ6hJRtLLjzlCdNwLCiOpHkOdG-o8ZWJYN_Vho`

### Google Drive情報
- **Folder ID**: `1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9`

### Webhook情報
- **Webhook URL**: `https://accounting-automation-i3mnej3yv-effectmoes-projects.vercel.app/api/webhook/ocr`

## セットアップ手順

### ステップ1: Google Apps Scriptプロジェクトを作成

1. [Google Apps Script](https://script.google.com) にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「AI会計OCR Web Apps」に変更
   - 左上の「無題のプロジェクト」をクリック
   - 新しい名前を入力してEnter

### ステップ2: Drive APIを有効化

1. 左サイドバーの「サービス」（＋マーク）をクリック
2. 「Drive API」を見つけてクリック
3. 「追加」ボタンをクリック

### ステップ3: コードを貼り付け

1. デフォルトの `コード.gs` ファイルの内容を全て削除
2. `/docs/gas-ocr-webhook.gs` の内容を全てコピーして貼り付け
3. Ctrl+S（またはCmd+S）で保存

### ステップ4: スクリプトプロパティを設定

1. エディタで以下の手順を実行：
   - 関数ドロップダウンから `setupScriptProperties` を選択
   - 「実行」ボタンをクリック
   - 初回実行時は認証画面が表示されるので承認

2. または手動で設定：
   - 左サイドバーの「プロジェクトの設定」をクリック
   - 下にスクロールして「スクリプト プロパティ」セクションを見つける
   - 「スクリプト プロパティを追加」をクリック
   - 以下のプロパティを追加：

| プロパティ名 | 値 |
|------------|---|
| SUPABASE_URL | https://cjqwqvvxqvlufrvnmqtx.supabase.co |
| SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcXdxdnZ4cXZsdWZydm5tcXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0Mjg5NDcsImV4cCI6MjA1NzAwNDk0N30.1hCFMoJ6hJRtLLjzlCdNwLCiOpHkOdG-o8ZWJYN_Vho |
| WEBHOOK_URL | https://accounting-automation-i3mnej3yv-effectmoes-projects.vercel.app/api/webhook/ocr |
| FOLDER_ID | 1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9 |

### ステップ5: ウェブアプリとしてデプロイ

1. 右上の「デプロイ」ボタンをクリック
2. 「新しいデプロイ」を選択
3. 歯車アイコンをクリック → 「ウェブアプリ」を選択
4. 以下の設定を行う：
   - **説明**: `AI会計OCR API v1.0`
   - **実行するユーザー**: `自分`
   - **アクセスできるユーザー**: `全員`
5. 「デプロイ」ボタンをクリック
6. 認証画面が表示されたら承認

### ステップ6: Web App URLを取得

デプロイ完了後、表示される「ウェブアプリ」のURLをコピーして保存

例：
```
https://script.google.com/macros/s/AKfycbxM4o5KU_OPjkU4Et-DeeA5NE5pWKhJFrHzUHoSblICZxPAX5LBaebiAFGP19srbVPa/exec
```

### ステップ7: Google Driveトリガーを設定（オプション）

フォルダーの変更を監視する場合：

1. 左サイドバーの「トリガー」をクリック
2. 「トリガーを追加」をクリック
3. 以下の設定を行う：
   - **実行する関数**: `checkFolderChanges`
   - **実行するデプロイ**: `Head`
   - **イベントのソースを選択**: `時間主導型`
   - **時間ベースのトリガーのタイプ**: `分ベースのタイマー`
   - **時間の間隔を選択**: `10分おき`
4. 「保存」をクリック

## 動作確認

### 1. Web App URLのテスト

ブラウザで取得したWeb App URLにアクセスして、以下のレスポンスが返ることを確認：

```json
{
  "status": "OK",
  "message": "AI会計OCR Web Appsが正常に動作しています",
  "version": "1.0.0"
}
```

### 2. OCR機能のテスト

1. Google Driveの指定フォルダーにPDFまたは画像ファイルをアップロード
2. エディタで `checkFolderChanges` 関数を実行
3. 実行ログでOCR処理結果を確認

### 3. 手動でPOSTリクエストをテスト

```bash
curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{"fileIds":["YOUR_FILE_ID"]}'
```

## トラブルシューティング

### よくあるエラーと対処法

#### 1. 「認証が必要です」エラー
- 関数を実行する際に認証を求められた場合は、「許可」をクリック
- Googleアカウントでログインし、必要な権限を承認

#### 2. 「Drive APIが見つかりません」エラー
- サービスでDrive APIが追加されているか確認
- プロジェクトを保存してから再度実行

#### 3. 「フォルダーが見つかりません」エラー
- FOLDER_IDが正しいか確認
- 該当のGoogle Driveフォルダーにアクセス権限があるか確認

#### 4. Supabase保存エラー
- Supabase URLとAnon Keyが正しいか確認
- Supabaseのocr_resultsテーブルが存在するか確認

## 次のステップ

1. Vercelアプリケーションで、取得したGAS Web App URLを環境変数に設定
2. Google Driveフォルダーにファイルをアップロードしてテスト
3. 処理結果がSupabaseに保存されることを確認

準備ができましたら、実際のセットアップを開始してください。