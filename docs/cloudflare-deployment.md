# Cloudflare Pages デプロイ手順

**最終更新**: 2026-01-07

---

## デプロイ方法

Cloudflare PagesへのデプロイはGit連携を使用します（公式推奨）。

### 前提条件

- ✅ Cloudflareアカウント作成済み
- ✅ Cloudflare Pagesプロジェクト作成済み (`ai-accounting-system`)
- ✅ KV Namespace作成済み
- ✅ 環境変数設定済み（46個）
- ✅ GitHubリポジトリ作成済み

---

## ステップ1: GitHubリポジトリにコードをPush

```bash
# プロジェクトディレクトリに移動
cd /Users/tonychustudio/ai-accounting-system

# Gitの状態確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "feat: Cloudflare Pages対応の設定追加

- next.config.mjs: images.unoptimized = true 追加
- package.json: build:cloudflare スクリプト追加
- wrangler.toml: KV Namespace設定完了
- 環境変数: 46個のシークレット設定完了"

# GitHubにプッシュ
git push origin main
```

---

## ステップ2: Cloudflare DashboardでGit連携設定

### 2-1. Cloudflare Dashboardにアクセス

1. https://dash.cloudflare.com にアクセス
2. ログイン（info@effect.moe）

### 2-2. Pagesプロジェクトを開く

1. 左サイドバー → **Workers & Pages**
2. **ai-accounting-system** プロジェクトをクリック

### 2-3. Git連携を設定

1. **Settings** タブをクリック
2. **Builds & deployments** セクションに移動
3. **Connect to Git** ボタンをクリック

### 2-4. GitHubリポジトリを接続

1. **GitHub** を選択
2. リポジトリ一覧から **tonychustudio/ai-accounting-system** を選択
3. **Install & Authorize** をクリック

### 2-5. ビルド設定

| 設定項目 | 値 |
|---------|-----|
| **Framework preset** | Next.js |
| **Build command** | `npm run build:cloudflare` |
| **Build output directory** | `.next` |
| **Root directory** | `/` |
| **Branch** | `main` |

**環境変数**: 既に設定済み（ステップ1で設定した46個）

### 2-6. 設定を保存してデプロイ

1. **Save and Deploy** ボタンをクリック
2. 初回ビルドが開始されます（5-10分）

---

## ステップ3: デプロイ状況の確認

### 3-1. ビルドログを確認

1. **Deployments** タブをクリック
2. 最新のデプロイをクリック
3. ビルドログを確認

**成功した場合:**
```
✓ Build completed successfully
✓ Deploying to production
✓ Deployment complete
```

**本番URL**: https://ai-accounting-system.pages.dev

### 3-2. エラーが発生した場合

#### エラー1: ビルドタイムアウト
```
Error: Build exceeded 20 minutes
```

**原因**: ビルドに時間がかかりすぎる
**解決策**:
```bash
# package.jsonのビルドコマンドを最適化
"build:cloudflare": "NODE_OPTIONS='--max-old-space-size=2048' next build"
```

#### エラー2: 環境変数が見つからない
```
Error: MONGODB_URI is not defined
```

**原因**: 環境変数の設定漏れ
**解決策**:
1. Settings → Environment variables
2. 不足している変数を追加
3. Retry deployment

#### エラー3: Node.jsバージョンエラー
```
Error: Node.js version mismatch
```

**原因**: Cloudflareのデフォルトバージョンが古い
**解決策**:
1. Settings → Environment variables
2. 環境変数を追加:
   - Name: `NODE_VERSION`
   - Value: `20.0.0`

---

## ステップ4: カスタムドメインの設定（オプション）

### 4-1. カスタムドメインを追加

1. **Custom domains** タブをクリック
2. **Set up a custom domain** ボタンをクリック
3. ドメイン名を入力（例: `accounting.example.com`）
4. **Continue** をクリック

### 4-2. DNS設定

Cloudflareが表示するCNAMEレコードをDNSプロバイダーに追加：

```
Type: CNAME
Name: accounting
Target: ai-accounting-system.pages.dev
```

---

## ステップ5: 動作確認

### 5-1. 本番URLにアクセス

https://ai-accounting-system.pages.dev

### 5-2. 確認項目

- [ ] トップページが表示される
- [ ] ログインできる
- [ ] 請求書一覧が表示される
- [ ] PDF生成が動作する
- [ ] メール送信が動作する
- [ ] MongoDBに接続できる

### 5-3. エラーが発生した場合

**API Routesが動作しない:**

1. **Functions** タブをクリック
2. API Routeのログを確認
3. エラーメッセージを確認

**MongoDBに接続できない:**

1. `MONGODB_URI` 環境変数を確認
2. MongoDBのIPホワイトリストにCloudflareのIPを追加:
   - MongoDB Atlas → Network Access
   - Allow access from anywhere: `0.0.0.0/0`

---

## 継続的デプロイ（CI/CD）

Git連携を設定すると、`main`ブランチへのプッシュで自動デプロイされます。

### ワークフロー

```
開発 → Gitコミット → GitHubプッシュ → Cloudflare自動ビルド → デプロイ完了
```

### プレビューデプロイ

プルリクエストを作成すると、自動的にプレビュー環境が作成されます：

```
https://[pr-number].ai-accounting-system.pages.dev
```

---

## トラブルシューティング

### ビルドが失敗する

**原因1: メモリ不足**
```bash
# package.jsonで最大メモリを増やす
NODE_OPTIONS='--max-old-space-size=4096'
```

**原因2: 依存関係の問題**
```bash
# 依存関係を再インストール
npm ci
```

### デプロイ後にサイトが表示されない

**確認項目:**
1. ビルドが成功しているか（Deploymentsタブ）
2. カスタムドメインのDNS設定が正しいか
3. Cloudflare Cacheをクリア:
   - Dashboard → Caching → Purge Everything

### API Routesがタイムアウトする

**原因**: Cloudflare Workersのタイムアウト（30秒/ステップ）

**解決策**:
1. 長時間処理をDurable Objectsに移行
2. または処理を分割して複数のAPI呼び出しに分ける

---

## 参考資料

- **Cloudflare Pages公式ドキュメント**: https://developers.cloudflare.com/pages/
- **Next.jsガイド**: https://developers.cloudflare.com/pages/framework-guides/nextjs/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

**作成日**: 2026-01-07
**次回作業**: 初回デプロイ実行 → 動作確認 → Notion文書化
