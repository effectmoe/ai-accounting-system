# Google Apps Script 設定手順

## 1. プロジェクト作成
1. [Google Apps Script](https://script.google.com/) にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「会計OCR処理」に変更

## 2. コード設定
1. `ocr-processor.js` の内容をすべてコピー
2. GASエディタの `コード.gs` に貼り付け
3. 保存（Ctrl+S または Cmd+S）

## 3. Drive API有効化
1. エディタで `enableDriveAPI` 関数を選択
2. 実行ボタン（▶）をクリック
3. 権限を承認

## 4. スクリプトプロパティ設定
1. 歯車アイコン（プロジェクト設定）をクリック
2. 下部の「スクリプトプロパティ」セクション
3. 「プロパティを追加」をクリック
4. 以下を設定：
   - プロパティ: `WEBHOOK_URL`
   - 値: `https://accounting-automation-l4rd0r8mn-effectmoes-projects.vercel.app/api/webhook/ocr`
5. 「スクリプトプロパティを保存」をクリック

## 5. デプロイ
1. 「デプロイ」ボタン > 「新しいデプロイ」
2. 種類の選択で歯車アイコン > 「ウェブアプリ」
3. 設定：
   - 説明: 「OCR処理API v1」
   - 実行するユーザー: 「自分」
   - アクセスできるユーザー: 「全員」
4. 「デプロイ」をクリック
5. 表示されるURLを保存（これがGAS_WEBHOOK_URL）

## 6. テスト方法
1. Google Driveに画像をアップロード
2. ファイルIDを取得（URLの/d/の後の部分）
3. GASエディタで `testOCR` 関数内のファイルIDを更新
4. `testOCR` 関数を実行
5. ログを確認（表示 > ログ）

## トラブルシューティング

### エラー: Drive APIが有効になっていない
→ サービス > Drive API > 追加

### エラー: WEBHOOK_URLが設定されていません
→ スクリプトプロパティを確認

### エラー: 権限がありません
→ デプロイ設定で「全員」を選択

### Webhookが届かない
→ 本番環境のURLが正しいか確認
→ Vercelのログを確認