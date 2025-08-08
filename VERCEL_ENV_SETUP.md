# Vercel本番環境 環境変数設定手順

## 必要な環境変数

以下の環境変数をVercelのダッシュボードから設定してください。

### Resend関連（必須）

1. **RESEND_API_KEY**
   - 値: `re_KFUUbVaW_Jokf7aMFXaLayZMmSq2gVS8w`
   - 説明: Resend APIキー

2. **RESEND_FROM_EMAIL**
   - 値: `accounting@effect.moe`
   - 説明: 送信元メールアドレス

3. **EMAIL_FROM_NAME**
   - 値: `株式会社EFFECT`
   - 説明: 送信者名

## 設定手順

1. [Vercelダッシュボード](https://vercel.com) にログイン
2. プロジェクト `accounting-automation` を選択
3. 「Settings」タブをクリック
4. 左メニューから「Environment Variables」を選択
5. 上記の環境変数を追加：
   - Key: 環境変数名
   - Value: 上記の値
   - Environment: Production, Preview, Development すべてにチェック
6. 「Save」をクリック

## デプロイ確認

環境変数設定後、自動的に再デプロイが行われます。

### 動作確認方法

1. 本番環境でメール送信をテスト
2. 送信元アドレスが `accounting@effect.moe` になっていることを確認
3. 送信者名が「株式会社EFFECT」になっていることを確認

## トラブルシューティング

### メールが送信されない場合

1. VercelのFunction Logsを確認
2. 環境変数が正しく設定されているか確認
3. Resend管理画面でAPIキーの使用状況を確認

### 送信元アドレスが反映されない場合

1. ブラウザのキャッシュをクリア
2. Vercelで手動再デプロイを実行
3. 環境変数の値に改行や余分なスペースがないか確認

## 関連ファイル

- `/app/api/send-email/route.ts` - メール送信API
- `/types/collections.ts` - 顧客データモデル（emailRecipientPreference）
- `/app/customers/new/page.tsx` - 顧客新規作成画面
- `/app/customers/[id]/edit/page.tsx` - 顧客編集画面

## セキュリティ注意事項

- RESEND_API_KEYは機密情報のため、このファイルをpublicリポジトリにプッシュしないでください
- 本番環境のAPIキーは定期的にローテーションすることを推奨します