# GAS修正版コード 手動更新ガイド

## 更新概要
- **バージョン**: 2.0.0 → 2.1.0
- **主な修正**: ログ出力の修正（console.log → Logger.log）
- **目的**: OCR処理の問題を特定するための詳細なログ出力

## 手動更新手順

### 1. 現在のコードをバックアップ

1. GASエディタを開く：
   ```
   https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit
   ```

2. 現在のCode.gsの内容を全選択（Ctrl+A / Cmd+A）してコピー

3. ローカルファイルにバックアップ：
   - ファイル名: `Code_backup_YYYY-MM-DD.gs`
   - 保存場所: 任意（念のため）

### 2. 修正版コードの適用

1. 修正版コードを開く：
   - VSCode、または任意のエディタで以下のファイルを開く：
   ```
   /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-src/complete-ocr-system-fixed.gs
   ```

2. 修正版コードを全選択してコピー

3. GASエディタのCode.gsの内容を全て削除

4. 修正版コードを貼り付け

5. 「保存」（Ctrl+S / Cmd+S）をクリック

### 3. 初期動作確認

#### A. API設定の確認
1. 関数ドロップダウンから `checkApiSettings` を選択
2. 「実行」ボタンをクリック
3. 「実行ログ」を確認

期待される出力：
```
=== デバッグ情報出力 ===
SUPABASE_URL: https://clqpfmroqcnvyxdzadln.supabase.co
SUPABASE_ANON_KEY: 設定済み
FOLDER_ID: 1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL
ARCHIVE_FOLDER_ID: 1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ
Drive API v2: ✅ 正常
監視フォルダ: ✅ [フォルダ名]
アーカイブフォルダ: ✅ [フォルダ名]
```

#### B. ファイル確認
1. 関数ドロップダウンから `checkRecentFiles` を選択
2. 「実行」ボタンをクリック
3. 「実行ログ」で最新のPDFファイルが表示されることを確認

### 4. Web Appの再デプロイ

1. 「デプロイ」→「デプロイを管理」をクリック

2. 現在のデプロイの「編集」アイコンをクリック

3. 設定を更新：
   - バージョン: 「新しいバージョン」を選択
   - 説明: `v2.1.0 - Logger.log対応版`
   - 実行ユーザー: 「自分」
   - アクセスできるユーザー: 「全員」

4. 「デプロイ」ボタンをクリック

5. デプロイメントURLをコピー（念のため）

### 5. 本番テスト

#### A. Supabase接続テスト
1. 関数ドロップダウンから `testSupabaseConnection` を選択
2. 「実行」ボタンをクリック
3. 「実行ログ」で接続成功を確認

成功時のログ：
```
=== Supabase接続テスト ===
=== saveToSupabase開始 ===
保存データ: {...}
Supabase APIを呼び出します
レスポンスコード: 201
=== saveToSupabase成功 ===
接続テスト結果: {"success":true,"data":{...}}
```

#### B. 手動OCRテスト
1. Google Driveの監視フォルダに新しいPDFをアップロード
2. 1-2分待機
3. 関数ドロップダウンから `manualOcrTest` を選択
4. 「実行」ボタンをクリック
5. 「実行ログ」で処理詳細を確認

### 6. トラブルシューティング

#### ログが表示されない場合
1. 実行後、画面下部の「実行ログ」をクリック
2. ポップアップウィンドウでログを確認

#### エラー: "Drive is not defined"
1. 「サービス」→「＋」をクリック
2. 「Drive API」を選択
3. バージョン: 「v2」
4. 識別子: 「Drive」
5. 「追加」をクリック

#### エラー: "401 Unauthorized" (Supabase)
1. `SUPABASE_ANON_KEY`の値を確認
2. Supabaseダッシュボードから正しいanon keyをコピー
3. GASコードの該当箇所を更新

### 7. 実運用での確認

1. **PDFアップロードテスト**
   - Google Driveの監視フォルダに実際のレシートPDFをアップロード
   - 「実行数」タブでdoPost関数の実行を確認
   - ログで処理内容を確認

2. **Supabaseデータ確認**
   - Supabaseダッシュボードでocr_resultsテーブルを確認
   - 新しいレコードが追加されているか確認

3. **AAM管理画面での確認**
   - http://localhost:3001/documents にアクセス
   - OCR処理済み書類が表示されることを確認

## 更新完了チェックリスト

- [ ] 現在のコードをバックアップした
- [ ] 修正版コードを適用した
- [ ] checkApiSettingsで設定を確認した
- [ ] Web Appを再デプロイした
- [ ] testSupabaseConnectionでDB接続を確認した
- [ ] manualOcrTestでOCR処理を確認した
- [ ] 実際のPDFアップロードで動作を確認した

## 関連ファイル
- 修正版コード: `/gas-src/complete-ocr-system-fixed.gs`
- 元のコード: `/gas-src/complete-ocr-system.gs`
- トラブルシューティング: `/gas-troubleshooting-steps.md`