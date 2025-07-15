# GASコードのフォルダID更新手順

## 更新内容

### 現在の設定（間違い）:
```javascript
const FOLDER_ID = '1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL';
const ARCHIVE_FOLDER_ID = '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ';
```

### 正しい設定:
```javascript
const FOLDER_ID = '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9'; // 修正済み
const ARCHIVE_FOLDER_ID = '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ'; // アーカイブフォルダも要確認
```

## GASエディタでの修正手順

1. GASエディタでコードの14行目付近を探す
2. `const FOLDER_ID = ` の行を見つける
3. 値を `'1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9'` に変更
4. 保存（Cmd+S）

## アーカイブフォルダについて

アーカイブフォルダのIDも確認が必要です。以下のオプションがあります：

### オプション1: アーカイブフォルダを作成
```javascript
// 一時的にアーカイブフォルダを無効化
const ARCHIVE_FOLDER_ID = ''; // 空文字にする
```

### オプション2: 同じフォルダを使用
```javascript
const ARCHIVE_FOLDER_ID = '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9'; // 同じフォルダを使用
```

### オプション3: 新しいアーカイブフォルダを作成
Google Driveで「AAM会計OCR_アーカイブ」フォルダを作成し、そのIDを設定

## 修正後のテスト

1. `checkApiSettings` を実行
2. 「監視フォルダ: ✅」と表示されることを確認
3. `checkRecentFiles` を実行してPDFファイルが表示されることを確認