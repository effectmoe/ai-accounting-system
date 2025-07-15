---
title: GAS OCR Web Appデプロイ手順
created: 2025-07-06 04:20
updated: 2025-07-06 04:20
tags: [gas, ocr, deployment, google-drive]
category: guide
author: Claude & tonychustudio
---

# GAS OCR Web Appデプロイ手順

## TL;DR

Google Apps ScriptでOCR Web Appを更新し、指定されたGoogle DriveフォルダにアップロードされたPDFを保存してOCR処理を実行するようにします。

## 目次

- [更新内容](#更新内容)
- [デプロイ手順](#デプロイ手順)
- [動作確認](#動作確認)

## 更新内容

### 変更点

1. **指定フォルダへの保存**
   - フォルダID: `1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9`
   - アップロードされたPDFはこのフォルダに保存されます

2. **エラーハンドリング**
   - フォルダが見つからない場合は一時フォルダを使用

## デプロイ手順

### 1. Google Apps Scriptプロジェクトを開く

```bash
# URLにアクセス
https://script.google.com
```

「AI会計OCR Web Apps」プロジェクトを開きます。

### 2. コードを更新

`docs/gas-ocr-script.gs`の内容をコピーして、GASエディタに貼り付けます。

特に以下の部分が追加されていることを確認：

```javascript
// 指定されたフォルダIDを使用（環境に応じて変更してください）
const PARENT_FOLDER_ID = '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9';
```

### 3. ファイルを保存

- Ctrl+S（Windows）またはCmd+S（Mac）で保存

### 4. 新しいデプロイを作成

1. 「デプロイ」ボタンをクリック
2. 「新しいデプロイ」を選択
3. 以下の設定を適用：
   - 種類: 「ウェブアプリ」
   - 実行ユーザー: 「自分」
   - アクセスできるユーザー: 「全員」
4. 「デプロイ」をクリック

### 5. URLを確認

デプロイ完了後、新しいWeb App URLが表示されます。
このURLがVercelの環境変数に設定されているURLと一致していることを確認してください。

## 動作確認

### 1. Google Driveフォルダを確認

- https://drive.google.com/drive/folders/1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9
- アクセス権限があることを確認

### 2. アプリケーションでテスト

1. AI会計アプリケーションにアクセス
2. 「ドキュメント」タブを開く
3. PDFファイルをアップロード
4. OCR処理が成功することを確認

### 3. Google Driveで確認

- 指定フォルダにファイルが一時的に保存される
- OCR処理後は自動的に削除される

## トラブルシューティング

### 「フォルダが見つかりません」エラー

- GASプロジェクトがフォルダにアクセスできない場合
- 解決方法：
  1. Google Driveでフォルダを共有設定にする
  2. または、GASプロジェクトの実行アカウントにアクセス権を付与

### 「CORSエラー」

- GASスクリプトの`doPost`関数でCORSヘッダーが設定されているか確認
- レスポンスに`Access-Control-Allow-Origin: *`が含まれていることを確認