# GAS OCR 手動セットアップ手順（5分で完了）

## 1. Google Apps Scriptプロジェクトを作成

1. [script.google.com](https://script.google.com) を開く
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「AI会計OCR Web Apps」に変更
   - 左上の「無題のプロジェクト」をクリック
   - 名前を入力してEnter

## 2. コードを貼り付け

`/docs/gas-ocr-script.gs` の内容を全てコピーして、エディタに貼り付け

## 3. Drive APIを有効化

1. 左サイドバーの「サービス」（＋マーク）をクリック
2. 「Drive API」を見つけてクリック
3. 「追加」ボタンをクリック

## 4. デプロイ

1. 右上の「デプロイ」ボタンをクリック
2. 「新しいデプロイ」を選択
3. 歯車アイコン → 「ウェブアプリ」を選択
4. 設定：
   - 説明: `AI会計OCR API v1.0`
   - 実行ユーザー: `自分`
   - アクセス: `全員`
5. 「デプロイ」をクリック

## 5. URLを取得

デプロイ完了画面の「ウェブアプリ」のURLをコピー

例：
```
https://script.google.com/macros/s/AKfycbwXXXXXXXXXXXXXXXXXXXXXXXXX/exec
```

## 6. 環境変数に設定

Vercelダッシュボード → Settings → Environment Variables
- Key: `GAS_OCR_URL`
- Value: コピーしたURL

これで完了です！