# Google Apps Script OCR Web Apps 本番デプロイ手順

## 1. GASプロジェクトの準備

### 現在のプロジェクト情報
- **プロジェクト名**: AI会計OCR Web Apps
- **スクリプトID**: AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ
- **Web App URL**: https://script.google.com/macros/s/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/exec

## 2. デプロイ前のチェックリスト

- [x] OCR処理が正常に動作することを確認
- [x] Supabaseへのデータ保存が成功
- [x] ファイルのアーカイブが正常に動作
- [x] Drive APIサービスが有効化されている
- [x] スクリプトプロパティが正しく設定されている

## 3. 本番デプロイ手順

### 3.1 GASエディタでの設定

1. [GASプロジェクトを開く](https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit)

2. **デプロイメニューから新しいデプロイを作成**
   - 「デプロイ」→「新しいデプロイ」をクリック
   - 種類: 「ウェブアプリ」を選択
   - 説明: 「本番環境 - AI会計OCR v1.0」
   - 実行ユーザー: 「自分」
   - アクセスできるユーザー: 「全員」
   - 「デプロイ」をクリック

3. **Web App URLを取得**
   - デプロイ完了後に表示されるURLをコピー
   - このURLがWebhookエンドポイントになります

### 3.2 環境変数の更新

```bash
# Vercelの環境変数を更新
GAS_WEBHOOK_URL=https://script.google.com/macros/s/[新しいデプロイID]/exec
```

## 4. Google Driveの設定

### 4.1 フォルダ構造
```
OCR処理フォルダ (ID: 1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9)
├── アップロードフォルダ（新規ファイル）
└── アーカイブ_2025年/
    ├── 01月/
    ├── 02月/
    └── ...
```

### 4.2 フォルダの権限設定
- OCR処理フォルダ: 編集権限
- アーカイブフォルダ: 自動作成される

## 5. 動作確認

### 5.1 テストファイルのアップロード
1. アプリケーションからPDFファイルをアップロード
2. Google Driveにファイルが作成されることを確認
3. GAS実行ログでOCR処理を確認

### 5.2 データの確認
1. Supabaseダッシュボードでocr_resultsテーブルを確認
2. アーカイブフォルダでファイルの移動を確認

## 6. トラブルシューティング

### よくあるエラーと対処法

#### Drive API エラー
```
Error: Drive.Files.insert is not a function
```
→ Drive APIサービスが追加されていない
→ サービス → Drive API v2を追加

#### Supabase 認証エラー
```
Error: Invalid API key
```
→ スクリプトプロパティのSUPABASE_ANON_KEYを確認

#### ファイル権限エラー
```
Error: You do not have permission to access this file
```
→ Google Driveのフォルダ権限を確認

## 7. 本番環境の監視

### 7.1 GASダッシュボード
- 実行回数の監視
- エラー率の確認
- 実行時間の最適化

### 7.2 Supabaseダッシュボード
- データの整合性確認
- ストレージ使用量の監視

## 8. セキュリティ設定

- GAS Web Appは「全員」アクセス可能だが、実際のOCR処理にはファイルIDが必要
- Supabaseのアクセスキーは環境変数で管理
- 処理済みファイルは自動的にアーカイブされる