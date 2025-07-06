# Google Apps Script デプロイメント手順

## プロジェクト情報
- **プロジェクト名**: AI会計OCR Web Apps
- **スクリプトID**: AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ
- **更新日時**: 2025-07-06

## 手動デプロイ手順

### 1. Google Apps Scriptエディタを開く
以下のURLにアクセスしてください:
```
https://script.google.com/d/AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ/edit
```

### 2. 既存のコードをバックアップ
念のため、現在のコードをコピーして保存してください。

### 3. 新しいコードをコピー
`/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/docs/gas-ocr-webhook.gs` の内容を全てコピーしてください。

### 4. コードを貼り付け
Google Apps Scriptエディタで全てのコードを選択（Cmd+A）し、新しいコードを貼り付けてください（Cmd+V）。

### 5. プロジェクトを保存
- ファイル → 保存（または Cmd+S）をクリック

### 6. スクリプトプロパティの確認
プロジェクト設定 → スクリプトプロパティで以下が設定されていることを確認:
- `SUPABASE_URL`: https://clqpfmroqcnvyxdzadln.supabase.co
- `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- `WEBHOOK_URL`: https://accounting-automation-i3mnej3yv-effectmoes-projects.vercel.app/api/webhook/ocr
- `FOLDER_ID`: 1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9

### 7. デプロイ
1. デプロイ → 新しいデプロイ をクリック
2. 種類を選択: 「ウェブアプリ」を選択
3. 設定:
   - 説明: "OCR Webhook v1.0.0"
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
4. デプロイをクリック

### 8. テスト実行

#### testOCRManually() の実行
1. エディタで `testOCRManually` 関数を選択
2. 実行ボタン（▶）をクリック
3. 初回実行時は権限を承認
4. 実行ログを確認

#### testLatestFileInFolder() の実行
1. エディタで `testLatestFileInFolder` 関数を選択
2. 実行ボタン（▶）をクリック
3. 実行ログを確認

## 実装された主な機能

### 1. OCR処理機能
- PDFや画像ファイルを自動的にOCR処理
- 日本語対応
- 処理後のファイルを自動アーカイブ

### 2. ドキュメント分析機能
- 書類タイプの自動判定（領収書、請求書、納品書など）
- ベンダー名の抽出
- 日付の抽出（複数フォーマット対応）
- 金額・税額の抽出

### 3. データ保存機能
- Supabaseへの自動保存
- 構造化されたデータ形式

### 4. Webhook機能
- Google Driveの変更通知を受信
- Vercelアプリへの通知送信

### 5. ファイル管理機能
- 年月ごとのアーカイブフォルダ作成
- ファイル名の自動リネーム（日付_書類タイプ_ベンダー名_タイムスタンプ.pdf）

## トラブルシューティング

### エラー: "ファイルが見つかりません"
- FOLDER_IDが正しく設定されているか確認
- 対象フォルダにアクセス権限があるか確認

### エラー: "Supabase保存エラー"
- SUPABASE_URLとSUPABASE_ANON_KEYが正しいか確認
- Supabaseのテーブル構造が正しいか確認

### エラー: "OCR処理エラー"
- ファイルがPDFまたは画像形式か確認
- Google Drive APIが有効になっているか確認

## 次のステップ

1. **定期実行の設定**
   - トリガーを設定して定期的にフォルダをチェック

2. **Webhookの設定**
   - Google Drive APIでプッシュ通知を設定
   - リアルタイムでファイル変更を検知

3. **エラー通知の追加**
   - 処理エラー時のメール通知
   - Slackへの通知機能

## 関連ファイル
- ソースコード: `/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/docs/gas-ocr-webhook.gs`
- Vercel Webhook: `/api/webhook/ocr`
- Supabaseテーブル: `ocr_results`