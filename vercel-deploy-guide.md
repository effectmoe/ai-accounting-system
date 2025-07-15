---
title: AI会計自動化システム Vercelデプロイガイド
created: 2025-07-06 04:06
updated: 2025-07-06 04:06
tags: [deployment, vercel, ai-accounting, gas-ocr, troubleshooting]
category: guide
author: Claude & tonychustudio
---

# AI会計自動化システム Vercelデプロイガイド

## TL;DR

AI会計自動化システムのVercelデプロイが完了しました。現在、GAS OCR Web AppのURLが無効になっているため、PDFアップロード機能でエラーが発生しています。GAS側でWeb Appを再デプロイする必要があります。

## 目次

- [デプロイ情報](#デプロイ情報)
- [環境変数設定](#環境変数設定)
- [現在の問題と解決方法](#現在の問題と解決方法)
- [GAS Web App再デプロイ手順](#gas-web-app再デプロイ手順)
- [動作確認方法](#動作確認方法)

## デプロイ情報

- **本番環境URL**: https://accounting-automation-78ix70m5p-effectmoes-projects.vercel.app
- **デプロイ日時**: 2025-07-06 04:01
- **ステータス**: デプロイ成功（GAS OCR機能に問題あり）

## 環境変数設定

### 必須の環境変数

```env
# GAS OCR設定
GAS_OCR_URL=https://script.google.com/macros/s/[YOUR_SCRIPT_ID]/exec
ENABLE_OCR=true

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
```

### 不要な環境変数（削除推奨）

- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_CLOUD_PROJECT_ID`

※ GAS OCRを使用するため、Google Cloud Vision関連の設定は不要です。

## 現在の問題と解決方法

### 問題

PDFアップロード時に「PDFの解析に失敗しました」エラーが発生

### 原因

GAS OCR Web AppのURLが無効（404エラー）になっている

### 解決方法

Google Apps ScriptでWeb Appを再デプロイする必要があります。

## GAS Web App再デプロイ手順

1. **Google Apps Scriptプロジェクトを開く**
   - https://script.google.com にアクセス
   - 「AI会計OCR Web Apps」プロジェクトを開く

2. **デプロイを確認**
   - 右上の「デプロイ」ボタンをクリック
   - 「デプロイを管理」を選択

3. **新しいデプロイを作成**
   - 「新しいデプロイ」をクリック
   - 種類: 「ウェブアプリ」を選択
   - 実行ユーザー: 「自分」
   - アクセスできるユーザー: 「全員」
   - 「デプロイ」をクリック

4. **新しいURLを取得**
   - デプロイ完了後、新しいWeb App URLをコピー
   - 形式: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`

5. **Vercelの環境変数を更新**
   - Vercelダッシュボードで`GAS_OCR_URL`を新しいURLに更新
   - 再デプロイをトリガー

## 動作確認方法

1. **API接続テスト**
   ```bash
   curl -X POST [YOUR_GAS_URL] \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "test=ping"
   ```

2. **PDFアップロードテスト**
   - アプリケーションにアクセス
   - 「ドキュメント」タブを開く
   - PDFファイルをアップロード
   - OCR処理が成功することを確認

## トラブルシューティング

### GAS Web Appが404を返す場合

1. スクリプトが保存されているか確認
2. デプロイが正しく実行されているか確認
3. URLが正しくコピーされているか確認

### CORS エラーが発生する場合

GASスクリプトの`doPost`関数で以下のヘッダーが設定されているか確認：

```javascript
return ContentService.createTextOutput(JSON.stringify(result))
  .setMimeType(ContentService.MimeType.JSON)
  .setHeader('Access-Control-Allow-Origin', '*');
```

### ファイルサイズエラーが発生する場合

GAS側の制限（約50MB）を超えている可能性があります。より小さいファイルでテストしてください。