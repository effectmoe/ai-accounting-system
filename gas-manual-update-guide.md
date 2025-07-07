# Google Apps Script プロジェクト手動更新ガイド

## 📋 更新概要
- **プロジェクトID**: 1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5
- **Service Account**: accounting-ocr@claudemcp-451912.iam.gserviceaccount.com
- **更新ファイル**: complete-ocr-system.gs (452行)
- **Drive API v2**: 設定必須

## 🔧 手動更新手順

### 1. GASエディタを開く
```
https://script.google.com/d/1MznJUkM6ki8--le-vwlpG4A3H1-JXsA2TjvDdHSf3aEymrlKmmRCjHV5/edit
```

### 2. Code.gsファイルを更新

#### 2.1 既存コードの削除
- 左側パネルで「Code.gs」をクリック
- エディタ内の全コードを選択（Ctrl+A / Cmd+A）
- 削除（Delete）

#### 2.2 新しいコードの貼り付け
- 以下のファイルのコードを全てコピー:
  `/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-src/complete-ocr-system.gs`
- GASエディタに貼り付け（Ctrl+V / Cmd+V）
- 保存（Ctrl+S / Cmd+S）

### 3. Drive API v2 サービスを追加

#### 3.1 サービスの追加
1. 左側パネルで「サービス」の「+」をクリック
2. 「Drive API」を検索して選択
3. バージョン「v2」を選択
4. 識別子「Drive」を確認
5. 「追加」をクリック

### 4. appsscript.jsonの確認・更新

#### 4.1 appsscript.jsonファイルを開く
- 左側パネルで「appsscript.json」をクリック

#### 4.2 設定内容の確認
以下の設定が含まれていることを確認:
```json
{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v2"
      }
    ]
  },
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

## 🧪 テスト実行

### 5. 基本テスト関数の実行

#### 5.1 API設定確認
1. 関数選択ドロップダウンで「checkApiSettings」を選択
2. 実行ボタンをクリック
3. 権限許可が求められた場合は承認
4. 実行ログを確認

#### 5.2 Supabase接続テスト
1. 関数選択ドロップダウンで「testSupabaseConnection」を選択
2. 実行ボタンをクリック
3. 実行ログでSupabase接続成功を確認

#### 5.3 最新ファイル確認
1. 関数選択ドロップダウンで「checkRecentFiles」を選択
2. 実行ボタンをクリック
3. 監視フォルダのファイル一覧を確認

### 6. 手動OCRテスト

#### 6.1 テストファイルの準備
- 監視フォルダ（ID: 1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL）にPDFファイルをアップロード

#### 6.2 手動OCR実行
1. 関数選択ドロップダウンで「manualOcrTest」を選択
2. 実行ボタンをクリック
3. OCR処理結果を確認

## 🌐 Web App公開（必要に応じて）

### 7. Web Appとして公開

#### 7.1 デプロイ設定
1. 「デプロイ」ボタンをクリック
2. 「新しいデプロイ」を選択
3. 種類: 「ウェブアプリ」
4. 説明: 「AI会計OCR Web Apps v2.0.0」
5. 実行ユーザー: 「自分」
6. アクセス権限: 「全員」
7. 「デプロイ」をクリック

#### 7.2 Webhook URLの取得
- デプロイ完了後、Web App URLを控える
- このURLがWebhook URLとして使用される

## 📊 監視とメンテナンス

### 8. プッシュ通知の設定

#### 8.1 プッシュ通知の初期設定
1. 関数選択ドロップダウンで「setupPushNotifications」を選択
2. 実行ボタンをクリック
3. 設定完了を確認

### 9. 定期的な確認事項

#### 9.1 日次確認
- 実行ログの確認
- エラーメッセージの確認
- 処理済みファイル数の確認

#### 9.2 週次確認
- Supabaseデータベースの確認
- アーカイブフォルダの確認
- システムパフォーマンスの確認

## 🔧 トラブルシューティング

### よくある問題と解決策

#### 問題1: Drive API v2が認識されない
**解決策**:
1. サービスの追加を再実行
2. エディタの再読み込み
3. 権限の再許可

#### 問題2: OCR処理が失敗する
**解決策**:
1. ファイルサイズの確認（25MB以下）
2. ファイル形式の確認（PDF、JPG、PNG）
3. 権限設定の確認

#### 問題3: Supabase接続エラー
**解決策**:
1. SUPABASE_URLの確認
2. SUPABASE_ANON_KEYの確認
3. ネットワーク接続の確認

## 📝 更新履歴

### Version 2.0.0 - 2025-07-06
- プッシュ通知によるリアルタイム処理
- 改善されたOCR処理
- 自動アーカイブ機能
- テスト関数の充実
- エラーハンドリングの強化

## 📞 サポート

問題が発生した場合:
1. 実行ログを確認
2. エラーメッセージを記録
3. テスト関数で個別機能を確認
4. 必要に応じて手動処理を実行

---

**重要**: 更新完了後は必ず全てのテスト関数を実行し、正常動作を確認してください。