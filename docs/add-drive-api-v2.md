# Google Apps ScriptにDrive API v2を追加する手順

## 問題
OCR処理で`Drive.Files.copy`を使用していますが、これはDrive API v2の機能です。

## 解決手順

1. **Google Apps Scriptエディタを開く**

2. **サービスを追加**
   - 左側メニューの「サービス」をクリック
   - 「＋」ボタンをクリック

3. **Drive APIを追加**
   - リストから「Drive API」を選択
   - **重要**: バージョンを「v2」に変更
   - 識別子: `Drive`（デフォルト）
   - 「追加」をクリック

4. **既存のDrive API v3との共存**
   - v3も残しておく場合は、識別子を変更：
     - v2: `Drive` 
     - v3: `DriveV3`

5. **確認**
   - サービス一覧に「Drive API v2」が表示される

## 注意事項
- Drive API v2とv3は異なるAPIです
- OCR機能（`Drive.Files.copy`）はv2でのみ利用可能
- v3は変更通知（プッシュ通知）で使用