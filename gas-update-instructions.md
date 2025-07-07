# Google Apps Script プロジェクト更新手順

## プロジェクト情報
- **プロジェクトID**: 1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5
- **プロジェクトURL**: https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit
- **Service Account**: accounting-ocr@cloudmcp-451912.iam.gserviceaccount.com

## 1. コードの更新

### 手順
1. 上記のプロジェクトURLにアクセス
2. **Code.gs** ファイルを開く
3. 全てのコードを以下のファイルの内容に置き換える：
   - ファイル: `/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-src/complete-ocr-system.gs`
   - 行数: 452行
   - 文字数: 11,895文字

## 2. Drive API v2 の追加

### 手順
1. 左メニューの「サービス」をクリック
2. 「サービスを追加」ボタンをクリック
3. 「Drive API」を検索
4. 以下の設定で追加：
   - **識別子**: Drive
   - **バージョン**: v2

## 3. テスト関数の実行

### 実行順序
1. **checkApiSettings()** - API設定確認
2. **testSupabaseConnection()** - Supabase接続テスト
3. **checkRecentFiles()** - 最新ファイル確認

### 実行方法
1. 関数一覧から関数を選択
2. 「実行」ボタンをクリック
3. 初回実行時は権限の許可が必要
4. 実行ログで結果を確認

## 4. Web App のデプロイ

### 手順
1. 「デプロイ」> 「新しいデプロイ」をクリック
2. 設定：
   - **種類**: ウェブアプリ
   - **実行者**: 自分
   - **アクセス**: 全員
3. 「デプロイ」をクリック
4. Web App URLを記録

## 5. 期待される動作

### API設定確認 (checkApiSettings)
```
=== API設定確認 ===
✅ Drive API v2: 正常
📁 監視フォルダID: 1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL
📁 アーカイブフォルダID: 1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ
🔗 Supabase URL: 設定済み
🔑 Supabase Key: 設定済み
```

### Supabase接続テスト (testSupabaseConnection)
```
=== Supabase接続テスト ===
✅ Supabase接続成功
保存されたID: [UUID]
```

### 最新ファイル確認 (checkRecentFiles)
```
=== 最新ファイル確認 ===
📄 X個のPDFファイルが見つかりました:
1. ファイル名1 (作成日時)
2. ファイル名2 (作成日時)
...
```

## 6. トラブルシューティング

### Drive API エラー
- サービス画面でDrive APIが正しく追加されているか確認
- バージョンがv2になっているか確認

### Supabase接続エラー
- SUPABASE_URLとSUPABASE_ANON_KEYの設定値を確認
- Supabaseプロジェクトが正常に動作しているか確認

### 権限エラー
- Service Account (accounting-ocr@cloudmcp-451912.iam.gserviceaccount.com) にGoogle Apps Scriptプロジェクトの編集権限が付与されているか確認
- 監視フォルダとアーカイブフォルダへのアクセス権限を確認

## 7. 完了確認

✅ コードの更新完了
✅ Drive API v2の追加完了
✅ テスト関数の実行完了
✅ Web Appデプロイ完了
✅ 全ての機能が正常に動作

## 注意事項
- 初回実行時は必ず権限の許可が必要
- プッシュ通知を設定する場合は、setupPushNotifications()も実行
- 定期的にcheckRecentFiles()を実行して動作確認を行う