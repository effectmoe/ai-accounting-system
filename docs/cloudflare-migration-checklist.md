# Cloudflare移行チェックリスト

## Phase 1: 準備作業

### 1.1 アカウント・ツール準備
- [ ] Cloudflareアカウント作成（https://dash.cloudflare.com/sign-up）
- [ ] メールアドレス認証完了
- [ ] Wranglerインストール: `npm install -g wrangler`
- [ ] Wranglerログイン: `wrangler login`

### 1.2 プロジェクト作成
- [ ] Pages プロジェクト作成: `wrangler pages project create ai-accounting-system`
- [ ] KV Namespace作成（本番）: `wrangler kv:namespace create CACHE`
- [ ] KV Namespace作成（プレビュー）: `wrangler kv:namespace create CACHE --preview`
- [ ] Durable Objects有効化（Dashboard → Settings）

### 1.3 環境変数エクスポート
- [ ] 現在の.env.localをバックアップ: `cp .env.local .env.local.backup`
- [ ] 環境変数リスト作成完了（47個）

---

## Phase 2: 環境変数設定

### 2.1 データベース（1個）
- [ ] `MONGODB_URI`

### 2.2 認証・セキュリティ（3個）
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`
- [ ] `SITE_PASSWORD`

### 2.3 Gmail送信（4個）
- [ ] `GMAIL_CLIENT_ID`
- [ ] `GMAIL_CLIENT_SECRET`
- [ ] `GMAIL_REFRESH_TOKEN`
- [ ] `GMAIL_USER`

### 2.4 Google Drive/OCR（9個）
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_CLOUD_PROJECT_ID`
- [ ] `GOOGLE_PRIVATE_KEY`
- [ ] `GOOGLE_PRIVATE_KEY_ID`
- [ ] `GOOGLE_CLIENT_EMAIL`
- [ ] `GOOGLE_DRIVE_OCR_FOLDER_ID`
- [ ] `GAS_OCR_URL`
- [ ] `GAS_SCRIPT_ID`
- [ ] `GAS_WEBHOOK_URL`

### 2.5 AI API（6個）
- [ ] `DEEPSEEK_API_KEY`
- [ ] `OLLAMA_URL`
- [ ] `OLLAMA_MODEL`
- [ ] `OLLAMA_VISION_MODEL`
- [ ] `PERPLEXITY_API_KEY`
- [ ] `MIDSCENE_API_KEY`
- [ ] `MIDSCENE_CHROME_EXTENSION_ID`

### 2.6 外部サービス（7個）
- [ ] `SQUARE_ACCESS_TOKEN`
- [ ] `SQUARE_APPLICATION_ID`
- [ ] `SQUARE_ENVIRONMENT`
- [ ] `FIRECRAWL_API_KEY`
- [ ] `DATAFORSEO_API_KEY`
- [ ] `NLWEB_API_KEY`
- [ ] `NLWEB_SITE_URL`

### 2.7 Supabase（3個）
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### 2.8 監視・分析（4個）
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`
- [ ] `TRACKING_WORKER_URL`

### 2.9 GitHub連携（4個）
- [ ] `GITHUB_TOKEN`
- [ ] `GITHUB_OWNER`
- [ ] `GITHUB_REPO`
- [ ] `GITHUB_BRANCH`

### 2.10 その他（3個）
- [ ] `ENABLE_OCR`
- [ ] `NEXT_PUBLIC_USE_AZURE_MONGODB`
- [ ] `VERCEL_OIDC_TOKEN`

---

## Phase 3: Next.js設定調整

### 3.1 next.config.mjs 修正
- [ ] `output: 'export'` に変更
- [ ] `images.unoptimized: true` 追加
- [ ] `trailingSlash: true` 追加

### 3.2 package.json スクリプト追加
- [ ] `build:cloudflare` 追加
- [ ] `deploy:cloudflare` 追加
- [ ] `deploy:preview` 追加

### 3.3 ビルドテスト
- [ ] ローカルビルド成功: `npm run build:cloudflare`
- [ ] ビルドエラー修正完了
- [ ] 静的ファイル生成確認（.next/out/）

---

## Phase 4: フロントエンド移行（Cloudflare Pages）

### 4.1 初回デプロイ
- [ ] デプロイ実行: `wrangler pages deploy .next`
- [ ] デプロイ成功確認
- [ ] プレビューURL確認

### 4.2 動作確認
- [ ] トップページ表示
- [ ] 請求書一覧表示
- [ ] 見積書一覧表示
- [ ] 顧客一覧表示
- [ ] 画像表示（最適化）
- [ ] ルーティング動作

### 4.3 本番ドメイン設定
- [ ] カスタムドメイン設定（Dashboard）
- [ ] DNS設定完了
- [ ] SSL証明書発行確認

---

## Phase 5: APIルート → Workers移行

### 5.1 Workers実装
- [ ] workers/index.ts 作成（Honoルーター）
- [ ] workers/lib/mongodb.ts 作成（DB接続）
- [ ] workers/api/invoices.ts 作成
- [ ] workers/api/quotes.ts 作成
- [ ] workers/api/customers.ts 作成
- [ ] workers/api/receipts.ts 作成
- [ ] workers/api/send-email.ts 作成

### 5.2 MongoDB接続テスト
- [ ] Workers → MongoDB Atlas接続成功
- [ ] タイムアウト設定（25秒以内）
- [ ] コネクションプーリング実装

### 5.3 デプロイ・テスト
- [ ] Workers デプロイ: `wrangler deploy workers/index.ts`
- [ ] APIエンドポイントテスト（Postman/curl）
- [ ] エラーハンドリング確認

---

## Phase 6: OCR処理 → Durable Objects実装

### 6.1 OCRProcessor実装
- [ ] workers/durable-objects/OCRProcessor.ts 作成
- [ ] ステップ1: ファイルアップロード実装
- [ ] ステップ2: OCR実行実装
- [ ] ステップ3: 結果保存実装
- [ ] 状態管理（state.storage）実装

### 6.2 wrangler.toml 設定
- [ ] Durable Objects binding追加
- [ ] Migration設定追加

### 6.3 デプロイ・テスト
- [ ] OCRProcessor デプロイ
- [ ] OCR処理テスト（実ファイル）
- [ ] 処理時間計測（30秒以内/ステップ）

---

## Phase 7: 会計処理AI設計（将来実装）

### 7.1 AccountingAI Durable Object
- [ ] workers/durable-objects/AccountingAI.ts 作成
- [ ] ステップ分割設計（22-57秒 → 複数ステップ）
- [ ] AI API統合（DeepSeek/Ollama）
- [ ] 状態管理実装

### 7.2 デプロイ・テスト
- [ ] AccountingAI デプロイ
- [ ] 会計処理テスト
- [ ] 処理時間計測

---

## Phase 8: 税務相談AI設計（将来実装）

### 8.1 TaxAI Durable Object
- [ ] workers/durable-objects/TaxAI.ts 作成
- [ ] ステップ分割設計（42-107秒 → 複数ステップ）
- [ ] AI API統合
- [ ] 状態管理実装

### 8.2 デプロイ・テスト
- [ ] TaxAI デプロイ
- [ ] 税務相談テスト
- [ ] 処理時間計測

---

## Phase 9: 本番環境テスト・切り替え

### 9.1 統合テスト
- [ ] フロントエンド → Workers API連携確認
- [ ] Workers → Durable Objects連携確認
- [ ] 全APIエンドポイント動作確認
- [ ] エラーハンドリング確認
- [ ] パフォーマンステスト

### 9.2 データ移行準備
- [ ] 本番データ最終バックアップ実行
- [ ] バックアップ検証（リストアテスト）
- [ ] バックアップファイル安全保管

### 9.3 監視設定
- [ ] Cloudflare Analytics設定
- [ ] Sentry統合確認
- [ ] アラート設定（エラー率、レスポンス時間）

### 9.4 本番切り替え
- [ ] DNS切り替え（Cloudflareへ）
- [ ] SSL証明書確認
- [ ] 旧環境（Vercel）データ削除保留（1週間監視後）

### 9.5 切り替え後確認
- [ ] 全機能動作確認（本番環境）
- [ ] パフォーマンス確認
- [ ] エラーログ確認（24時間）
- [ ] ユーザー動作確認

---

## 緊急時ロールバック手順

### ロールバック条件
- [ ] 重大なバグ発生
- [ ] データ損失の恐れ
- [ ] パフォーマンス著しく低下

### ロールバック手順
1. [ ] DNS設定をVercelに戻す
2. [ ] Vercelデプロイを最新に更新
3. [ ] 問題の調査・修正
4. [ ] 再デプロイ準備

---

## 完了確認

### 最終チェック
- [ ] 全APIエンドポイント正常動作
- [ ] OCR処理正常動作
- [ ] メール送信正常動作
- [ ] PDF生成正常動作
- [ ] データベース操作正常動作
- [ ] パフォーマンス目標達成（応答時間 < 3秒）
- [ ] エラー率 < 1%
- [ ] 監視・アラート正常動作

### コスト確認
- [ ] Cloudflare利用料金確認
- [ ] MongoDB Atlas利用状況確認
- [ ] 予算内（$15/月以下）

### ドキュメント更新
- [ ] README.md更新（デプロイ手順）
- [ ] CLAUDE.md更新（プロジェクト構成）
- [ ] 環境変数リスト更新

---

**進捗状況**: 2/9 フェーズ完了（Phase 1-2）

**最終更新**: 2025-01-07
