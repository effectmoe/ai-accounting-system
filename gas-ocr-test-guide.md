# GAS OCR プロジェクト テスト実行ガイド

## プロジェクト情報
- **プロジェクトURL**: https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit
- **現在のデプロイURL**: https://script.google.com/macros/s/AKfycbwfaf1sYjKovaHIRp7zhVO7C5G9O_LFlQGsTddR8F4hrJ2TZf_enMOlubssihW_atqU/exec

## 実行手順

### 1. プロジェクトを開く
```bash
open "https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit"
```

### 2. Drive API v2の設定確認
1. エディタの左側メニューから「サービス」をクリック
2. 「Drive API」が追加されているか確認
3. もし追加されていない場合：
   - 「サービスを追加」をクリック
   - 「Drive API」を選択
   - バージョンは「v2」を選択
   - IDは「Drive」のまま
   - 「追加」をクリック

### 3. スクリプトの更新
1. 現在のコードをすべて選択（Cmd+A）して削除
2. 以下のファイルの内容をコピー＆ペースト：
   ```
   /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-ocr-test-complete.gs
   ```
3. 保存（Cmd+S）

### 4. テスト実行

#### A. API設定の確認
1. 関数ドロップダウンから「testAPISettings」を選択
2. 「実行」ボタンをクリック
3. 実行ログを確認：
   - ✅ Drive API v2が有効です
   - ✅ 監視フォルダにアクセス可能
   - ✅ アーカイブフォルダにアクセス可能
   - ✅ Supabaseに接続可能

#### B. 最新ファイルの確認
1. 関数ドロップダウンから「checkLatestFiles」を選択
2. 「実行」ボタンをクリック
3. フォルダ内のファイル一覧が表示される

#### C. OCR手動実行テスト
1. 関数ドロップダウンから「testOCRManually」を選択
2. 「実行」ボタンをクリック
3. フォルダ内の最初のPDF/画像ファイルでOCRが実行される

#### D. 完全テストスイート
1. 関数ドロップダウンから「runAllTests」を選択
2. 「実行」ボタンをクリック
3. すべてのテストが順番に実行される

### 5. 再デプロイ

1. エディタ右上の「デプロイ」をクリック
2. 「デプロイを管理」を選択
3. 現在のデプロイの右側の鉛筆アイコンをクリック
4. 「バージョン」を「新しいバージョン」に変更
5. 説明を入力（例：「テスト機能追加とフォルダID修正」）
6. 「デプロイ」をクリック
7. 新しいデプロイURLが表示される（既存のURLは変わらない）

### 6. 初期設定の実行（必要な場合）
1. 関数ドロップダウンから「initialSetup」を選択
2. 「実行」ボタンをクリック
3. プッシュ通知とトリガーが設定される

## トラブルシューティング

### Drive APIエラーが出る場合
- 「サービス」からDrive API v2が追加されているか確認
- 追加されている場合は、一度削除して再度追加

### 権限エラーが出る場合
- 初回実行時は権限の承認が必要
- 「許可を確認」をクリックして、必要な権限を承認

### フォルダアクセスエラーが出る場合
- フォルダIDが正しいか確認
- フォルダへのアクセス権限があるか確認

## 期待される結果

### testAPISettings実行時
```
=== API設定確認 ===
✅ Drive API v2が有効です
✅ 監視フォルダにアクセス可能: [フォルダ名]
✅ アーカイブフォルダにアクセス可能: [フォルダ名]
✅ Supabaseに接続可能
```

### testOCRManually実行時
```
=== OCR手動実行テスト ===
テストファイル: [ファイル名]
ファイルID: [ファイルID]
OCR処理開始: [ファイル名]
Supabaseに保存成功
ファイルをアーカイブしました
OCR結果: [OCR結果オブジェクト]
```