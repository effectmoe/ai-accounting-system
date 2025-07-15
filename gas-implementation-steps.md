---
title: GAS実装手順
created: 2025-07-06 19:05
updated: 2025-07-06 19:05
tags: [GAS, 実装, 手順]
category: guide
author: Claude & tonychustudio
---

# GAS実装手順

## 実装するファイル
`/gas-src/complete-ocr-system.gs` の内容をGASエディタに実装

## 手順

### 1. GASプロジェクトを開く
```
https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit
```

### 2. 既存コードのバックアップ
- 現在のコードを別ファイルにコピー（念のため）

### 3. 新しいコードの実装
- 全コードを削除
- complete-ocr-system.gs の内容を貼り付け
- 保存（Cmd+S または Ctrl+S）

### 4. Drive API v2の確認
- 左側メニュー「サービス」
- Drive API (v2) が追加されているか確認
- なければ追加

### 5. 再デプロイ
- デプロイ → デプロイを管理
- 編集（鉛筆アイコン）
- バージョン：新しいバージョン
- 説明：完全版OCRシステム v2.0
- デプロイ

### 6. 動作テスト
以下の関数を順番に実行：
1. checkApiSettings() - API設定確認
2. checkRecentFiles() - ファイル確認
3. testSupabaseConnection() - DB接続確認
4. manualOcrTest() - OCR手動テスト