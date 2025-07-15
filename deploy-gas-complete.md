---
title: GAS完全制御 - 再デプロイとテスト実行手順
created: 2025-07-06 18:45
updated: 2025-07-06 18:45
tags: [GAS, デプロイ, テスト, 完全制御]
category: guide
author: Claude & tonychustudio
---

# GAS完全制御 - 再デプロイとテスト実行手順

## TL;DR

Google Apps Script (GAS)のOCRスクリプトを完全制御するための手順です。現在GASは正常に動作していることが確認できました。テスト関数を追加して再デプロイを行います。

## 目次

- [現在の状況](#現在の状況)
- [実行手順](#実行手順)
- [テスト確認](#テスト確認)

## 現在の状況

### 確認済み事項
- ✅ GASデプロイメントURL: 正常にレスポンス（200 OK）
- ✅ Web Apps動作確認: `{"status":"OK","message":"AI会計OCR Web Appsが正常に動作しています","version":"1.0.0"}`
- ✅ スクリプトID: AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ
- ✅ デプロイメントURL: https://script.google.com/macros/s/AKfycbwfaf1sYjKovaHIRp7zhVO7C5G9O_LFlQGsTddR8F4hrJ2TZf_enMOlubssihW_atqU/exec

## 実行手順

### ステップ1: GASエディタを開く

1. 以下のURLをブラウザで開く：
   ```
   https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit
   ```

### ステップ2: テスト関数を追加

1. 現在の820行のコードの**最後に**追加
2. `/gas-src/ocr-test-functions.gs`の内容をコピー＆ペースト
3. Ctrl+S（またはCmd+S）で保存

### ステップ3: Drive API v2の確認

1. エディタ左側の「サービス」（＋アイコン）をクリック
2. 既に追加されているサービスを確認：
   - **Drive API** (識別子: Drive, バージョン: v2) があることを確認
   - なければ追加

### ステップ4: 再デプロイ

1. **デプロイ** → **デプロイを管理**
2. 鉛筆アイコン（編集）をクリック
3. **バージョン**：「新しいバージョン」を選択
4. **説明**：「テスト関数追加 - 2025/07/06」
5. **デプロイ**をクリック
6. デプロイURLは変わらないことを確認

### ステップ5: テスト実行

関数を選択して実行（順番に）：

1. **checkApiSettings**
   - API設定の確認
   - Drive API v2が有効か確認

2. **checkRecentFiles**
   - フォルダ内のPDFファイル一覧を表示
   - ファイルがあるか確認

3. **manualOcrTest**
   - OCR処理を手動実行
   - 処理結果を確認

4. **testSupabaseConnection**
   - Supabase接続テスト
   - データ保存が成功するか確認

## テスト確認

### 期待される結果

1. **checkApiSettings**の結果：
   ```
   ✅ Drive API v2: 正常
   📁 監視フォルダID: 1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL
   📁 アーカイブフォルダID: 1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ
   🔗 Supabase URL: 設定済み
   🔑 Supabase Key: 設定済み
   ```

2. **checkRecentFiles**の結果：
   ```
   📄 3個のPDFファイルが見つかりました:
   1. 2025-07-06_領収書_タイムズ24株式会社_20250706_152102.pdf
   2. スキャン_20250705-2350.pdf
   3. receipt_test.jpg
   ```

3. **manualOcrTest**の結果：
   ```
   ✅ OCR処理成功: {
     file_name: "xxx.pdf",
     extracted_text: "...",
     total_amount: 1000
   }
   ```

## 実際のファイルでテスト

1. Google Driveの監視フォルダにPDFをアップロード
2. 2-3分待つ
3. Supabaseの書類一覧ページで確認

## トラブルシューティング

### エラー: Drive is not defined
→ サービスからDrive API v2を追加

### エラー: 権限が不十分です
→ 実行時に権限を承認

### OCR処理が実行されない
→ manualOcrTest()を手動実行