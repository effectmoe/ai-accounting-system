---
title: AI会計OCRシステム 完全操作ガイド
created: 2025-07-06 19:00
updated: 2025-07-06 19:00
tags: [OCR, 会計システム, 操作ガイド, GAS, Supabase]
category: guide
author: Claude & tonychustudio
---

# AI会計OCRシステム 完全操作ガイド

## TL;DR

Google Drive + GAS + Supabaseを使用したAI会計OCRシステムが完成しました。PDFアップロード → 自動OCR処理 → データベース保存 → Web画面表示が全自動で動作します。

## 目次

- [システム概要](#システム概要)
- [初期設定](#初期設定)
- [使用方法](#使用方法)
- [動作確認](#動作確認)
- [トラブルシューティング](#トラブルシューティング)

## システム概要

### アーキテクチャ

```
[PDFアップロード] → [Google Drive] → [GAS OCR処理] → [Supabase保存] → [Web画面表示]
                            ↓
                    [アーカイブフォルダ]
```

### 主要コンポーネント

1. **Google Drive**
   - 監視フォルダ: `1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL`
   - アーカイブフォルダ: `1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ`

2. **Google Apps Script**
   - スクリプトID: `AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ`
   - デプロイURL: `https://script.google.com/macros/s/AKfycbwfaf1sYjKovaHIRp7zhVO7C5G9O_LFlQGsTddR8F4hrJ2TZf_enMOlubssihW_atqU/exec`

3. **Supabase**
   - URL: `https://clqpfmroqcnvyxdzadln.supabase.co`
   - テーブル: `ocr_results`

4. **Web画面**
   - URL: `http://localhost:3000/documents`
   - 5秒ごとに自動更新（ポーリング）

## 初期設定

### 1. GASスクリプトの更新

1. [GASエディタ](https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit)を開く
2. 既存のコードを全て削除
3. `/gas-src/complete-ocr-system.gs`の内容をコピー＆ペースト
4. 保存（Cmd+S）

### 2. Drive API v2の有効化

1. GASエディタで「サービス」（＋アイコン）をクリック
2. 「Drive API」を検索
3. バージョン「v2」を選択
4. 「追加」をクリック

### 3. 再デプロイ

1. デプロイ → デプロイを管理
2. 編集ボタン（鉛筆アイコン）
3. バージョン：「新しいバージョン」
4. 説明：「完全版OCRシステム v2.0」
5. デプロイ

### 4. プッシュ通知の設定（オプション）

GASエディタで以下を実行：
```javascript
setupPushNotifications()
```

## 使用方法

### 基本的な使い方

1. **PDFファイルの準備**
   - 領収書や請求書のPDFファイル
   - 画像ファイル（JPG、PNG）も対応

2. **ファイルのアップロード**
   - 方法1: Web画面の「PDFをアップロード」ボタン
   - 方法2: Google Driveの監視フォルダに直接アップロード

3. **OCR処理の実行**
   - 自動: プッシュ通知またはトリガーで自動実行
   - 手動: GASで`manualOcrTest()`を実行

4. **結果の確認**
   - Web画面の「書類一覧」→「OCR処理済み書類」タブ
   - 5秒ごとに自動更新
   - 新しい書類はトースト通知でお知らせ

### 処理フロー

1. **アップロード** (1秒)
   - PDFファイルをGoogle Driveにアップロード

2. **OCR処理** (10-30秒)
   - GASがファイルを検出
   - Drive APIでOCR実行
   - テキスト抽出と情報解析

3. **データ保存** (1秒)
   - Supabaseに結果を保存
   - ステータス: completed

4. **アーカイブ** (1秒)
   - 処理済みファイルを移動
   - ファイル名: `YYYYMMDD_領収書_ベンダー名_金額円.pdf`

5. **画面更新** (最大5秒)
   - ポーリングで新データを検出
   - トースト通知を表示

## 動作確認

### GASでのテスト

1. **API設定確認**
   ```javascript
   checkApiSettings()
   ```
   期待結果：
   - ✅ Drive API v2: 正常
   - 📁 フォルダID表示
   - 🔗 Supabase設定確認

2. **ファイル確認**
   ```javascript
   checkRecentFiles()
   ```
   期待結果：
   - 最新5件のPDFファイル一覧

3. **OCR手動実行**
   ```javascript
   manualOcrTest()
   ```
   期待結果：
   - OCR処理成功メッセージ
   - Supabase保存確認

4. **接続テスト**
   ```javascript
   testSupabaseConnection()
   ```
   期待結果：
   - ✅ Supabase接続成功

### Web画面での確認

1. `http://localhost:3000/documents`にアクセス
2. 「OCR処理済み書類」タブを選択
3. PDFをアップロード
4. 5-10秒待つ
5. 新しい行が追加されることを確認

## トラブルシューティング

### よくある問題と解決方法

#### 1. OCRが実行されない

**原因**: Drive APIが有効化されていない
**解決**: 
- GASエディタ → サービス → Drive API v2を追加
- 再デプロイ

#### 2. Supabase保存エラー

**原因**: APIキーまたはURLが間違っている
**解決**:
- GASスクリプトの定数を確認
- Supabaseダッシュボードで正しいキーを取得

#### 3. ファイルが検出されない

**原因**: フォルダIDが間違っている
**解決**:
- Google DriveでフォルダのURLを確認
- `FOLDER_ID`を正しい値に更新

#### 4. 画面が更新されない

**原因**: ポーリングが停止している
**解決**:
- ブラウザをリロード（F5）
- 開発者ツールでコンソールエラーを確認

#### 5. アーカイブされない

**原因**: アーカイブフォルダへの権限がない
**解決**:
- `ARCHIVE_FOLDER_ID`を確認
- フォルダの共有設定を確認

### ログの確認方法

1. **GASログ**
   - 表示 → ログ
   - または Stackdriver Logging

2. **ブラウザコンソール**
   - F12 → Console
   - ポーリング状態を確認

3. **Supabaseログ**
   - Supabaseダッシュボード → Logs

## メンテナンス

### 定期的な作業

1. **処理済みファイルリストのクリア**（月1回）
   ```javascript
   PropertiesService.getScriptProperties().deleteProperty('processedFiles');
   ```

2. **アーカイブフォルダの整理**（3ヶ月ごと）
   - 古いファイルを別フォルダに移動

3. **プッシュ通知の更新**（24時間ごと）
   ```javascript
   setupPushNotifications()
   ```

## 拡張機能

### 今後の改善案

1. **リアルタイム通知**
   - Supabase Replicationが有効になったら切り替え

2. **AI精度向上**
   - GPT-4 Visionの統合
   - カスタム解析ロジック

3. **自動仕訳**
   - OCR結果から仕訳を自動生成
   - 勘定科目の自動判定

4. **レポート機能**
   - 月次集計
   - 経費分析グラフ

## まとめ

OCRシステムが完全に動作するようになりました。以下の流れで利用できます：

1. PDFをアップロード
2. 5-10秒待つ
3. 書類一覧に表示される
4. データはSupabaseに保存済み

リアルタイム通知は後日対応予定ですが、現在のポーリング方式でも十分実用的です。