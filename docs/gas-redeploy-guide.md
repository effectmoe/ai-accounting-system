---
title: GAS再デプロイ手順とDrive API設定確認
created: 2025-07-06 18:20
updated: 2025-07-06 18:20
tags: [GAS, デプロイ, Drive API, 設定確認]
category: guide
author: Claude & tonychustudio
---

# GAS再デプロイ手順とDrive API設定確認

## TL;DR

GASのコードを変更した後は必ず再デプロイが必要です。また、Drive API v2とv3の両方を有効にする必要があります。以下の手順で設定を確認してください。

## 目次

- [再デプロイ手順](#再デプロイ手順)
- [Drive APIバージョン確認](#drive-apiバージョン確認)
- [動作テスト手順](#動作テスト手順)

## 再デプロイ手順

### 1. デプロイ管理画面を開く

1. GASエディタで「デプロイ」→「デプロイを管理」をクリック
2. 現在のデプロイ一覧が表示される

### 2. 新しいデプロイを作成

1. 右上の「編集」アイコン（鉛筆マーク）をクリック
2. 「バージョン」のドロップダウンから「新しいバージョン」を選択
3. 説明欄に変更内容を記入：
   ```
   OCR処理の完全版実装（820行版）
   ```
4. 「デプロイ」ボタンをクリック

### 3. 重要な設定確認

- **実行ユーザー**: 「自分」
- **アクセスできるユーザー**: 「全員」
- **種類**: 「ウェブアプリ」

### 4. 新しいURLの確認

デプロイ後、新しいURLが表示されます：
```
https://script.google.com/macros/s/[新しいデプロイID]/exec
```

このURLをコピーして保存してください。

## Drive APIバージョン確認

### 現在必要なAPI

1. **Drive API v2** - OCR処理用（Drive.Files.copy）
2. **Drive API v3** - ファイル操作用（Drive.Files.list）
3. **Gmail API** - メール送信用（オプション）

### 設定確認手順

1. GASエディタで「サービス」（＋マーク）をクリック
2. 以下を確認：

#### Drive API v2の追加
```
サービス: Drive API
識別子: Drive
バージョン: v2
```

#### Drive API v3の追加（必要な場合）
```
サービス: Drive API
識別子: DriveV3
バージョン: v3
```

### 現在のコードで使用しているAPI

```javascript
// Drive API v2を使用
Drive.Files.copy({
  title: newFileName,
  parents: [{ id: archiveFolderId }]
}, fileId);

// これはv2のメソッド
```

## 動作テスト手順

### 1. 手動実行テスト

GASエディタで以下の関数を実行：

```javascript
function testOcrProcessing() {
  console.log('Drive API v2が有効か確認...');
  try {
    const files = Drive.Files.list({
      q: "'1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL' in parents",
      maxResults: 1
    });
    console.log('✅ Drive API v2は正常に動作しています');
    console.log('ファイル数:', files.items.length);
    
    // OCR処理のテスト
    checkAndProcessRecentFiles();
  } catch (error) {
    console.error('❌ Drive APIエラー:', error);
    console.log('サービスからDrive API v2を追加してください');
  }
}
```

### 2. Webhook URLの更新

新しいデプロイURLを使用して、Google Driveの通知設定を更新：

```bash
# 環境変数を更新
export GAS_WEBHOOK_URL="https://script.google.com/macros/s/[新しいデプロイID]/exec"

# または.env.localファイルを更新
```

### 3. 実際のファイルでテスト

1. Google Driveの指定フォルダにPDFをアップロード
2. 2-3分待つ
3. Supabaseで結果を確認：

```javascript
// ブラウザのコンソールで実行
const checkResults = async () => {
  const response = await fetch('/api/ocr/results');
  const data = await response.json();
  console.log('最新のOCR結果:', data);
};
checkResults();
```

## トラブルシューティング

### エラー: Drive is not defined

→ サービスからDrive API v2を追加

### エラー: 権限が不十分です

→ デプロイ時の実行ユーザーを「自分」に設定

### OCR処理が実行されない

→ 新しいデプロイURLでWebhookを再設定

## まとめ

1. **コード変更後は必ず再デプロイ**
2. **Drive API v2が必要**（現在のコードでは）
3. **新しいURLでテスト実行**