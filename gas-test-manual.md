# GAS OCR処理の手動テスト手順

## 1. Google Apps Scriptエディタを開く

1. ブラウザで以下にアクセス:
   ```
   https://script.google.com
   ```

2. 「AI会計OCR-Complete」プロジェクトを開く

## 2. テスト関数の実行

### A. API設定確認
1. 関数のドロップダウンから `checkApiSettings` を選択
2. 「実行」ボタンをクリック
3. コンソールで以下を確認:
   - Drive API v2が正常か
   - フォルダIDが設定されているか
   - Supabase設定が完了しているか

### B. 最新ファイルの確認
1. 関数のドロップダウンから `checkRecentFiles` を選択
2. 「実行」ボタンをクリック
3. Google DriveフォルダにPDFファイルがあるか確認

### C. Supabase接続テスト
1. 関数のドロップダウンから `testSupabaseConnection` を選択
2. 「実行」ボタンをクリック
3. Supabaseにテストデータが保存されるか確認

### D. 手動OCR実行テスト
1. Google DriveフォルダにPDFをアップロード
2. 関数のドロップダウンから `manualOcrTest` を選択
3. 「実行」ボタンをクリック
4. OCR処理が実行されるか確認

## 3. エラーの確認方法

### 実行ログの確認
1. GASエディタで「実行」タブを開く
2. 最新の実行を選択
3. 「ログを表示」をクリック

### よくあるエラーと対処法

#### "Drive is not defined"
- **原因**: Drive API v2が追加されていない
- **対処法**: 
  1. エディタで「サービス」をクリック
  2. 「Drive API」を選択
  3. バージョン「v2」を選択
  4. 「追加」をクリック

#### "TypeError: Cannot read property 'items' of undefined"
- **原因**: フォルダIDが間違っている、またはアクセス権限がない
- **対処法**: 
  1. Google DriveでフォルダIDを確認
  2. フォルダの共有設定を確認

#### "401 Unauthorized"
- **原因**: Supabaseの認証キーが間違っている
- **対処法**: 
  1. Supabaseダッシュボードでanon keyを確認
  2. GASスクリプトの`SUPABASE_ANON_KEY`を更新

## 4. デプロイ状態の確認

1. 関数のドロップダウンから `checkDeploymentInfo` を選択
2. 「実行」ボタンをクリック
3. デプロイメントURLが表示されることを確認

## 5. プッシュ通知の設定確認

### 現在の設定を確認
1. 関数のドロップダウンから `testCurrentSetup` を選択（もしあれば）
2. 「実行」ボタンをクリック

### プッシュ通知が動作しない場合
1. Webアプリの再デプロイ:
   - 「デプロイ」→「デプロイを管理」
   - 「編集」→「新しいバージョン」
   - 「デプロイ」をクリック

2. 権限の再確認:
   - アクセスできるユーザー: 「全員」
   - 実行ユーザー: 「自分」

## トラブルシューティングチェックリスト

- [ ] Drive API v2が有効化されている
- [ ] フォルダIDが正しく設定されている
- [ ] Supabaseの接続情報が正しい
- [ ] Webアプリがデプロイされている
- [ ] 適切な権限が設定されている
- [ ] Google DriveフォルダにPDFファイルが存在する

## 関連ファイル
- `/gas-src/complete-ocr-system.gs` - メインのOCR処理スクリプト
- `/gas-src/ocr-test-functions.gs` - テスト関数
- `/docs/gas-push-notification-setup.md` - プッシュ通知設定ガイド