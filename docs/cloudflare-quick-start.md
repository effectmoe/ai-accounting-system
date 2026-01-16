# Cloudflare移行 クイックスタート

**目的**: 今すぐ実行可能な最初のステップを明確にする

---

## 今日やるべきこと（30分）

### ステップ1: Wranglerインストール（5分）

```bash
# Node.jsバージョン確認（20以上必要）
node --version

# Wranglerグローバルインストール
npm install -g wrangler

# バージョン確認
wrangler --version

# Cloudflareログイン（ブラウザが開く）
wrangler login
```

**成功確認**: `Successfully logged in.` と表示される

---

### ステップ2: Cloudflareアカウント確認（5分）

1. ブラウザで https://dash.cloudflare.com を開く
2. ログイン確認
3. Workers & Pages → Overview → 使用状況確認

**成功確認**: Dashboardが表示され、Free Planであることを確認

---

### ステップ3: プロジェクト作成（10分）

```bash
# プロジェクトディレクトリに移動
cd /Users/tonychustudio/ai-accounting-system

# Pages プロジェクト作成
wrangler pages project create ai-accounting-system

# ✅ 以下の質問に回答:
# - Production branch: main
# - Preview branch pattern: *
```

**成功確認**: `✨ Successfully created the 'ai-accounting-system' project.`

---

### ステップ4: KV Namespace作成（5分）

```bash
# 本番用KV作成
wrangler kv:namespace create CACHE

# プレビュー用KV作成
wrangler kv:namespace create CACHE --preview
```

**成功確認**: 2つのNamespace IDが表示される

**重要**: 表示されたIDをメモ！wrangler.tomlに記載が必要
```
✨ id = "abc123..." ← 本番ID
✨ preview_id = "xyz789..." ← プレビューID
```

---

### ステップ5: wrangler.toml 更新（5分）

KV Namespace IDを`wrangler.toml`に追記：

```toml
# wrangler.toml

# ... 既存設定 ...

# KV Namespace (ステップ4で取得したIDを記載)
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_PRODUCTION_ID_HERE"  # ← ステップ4の本番IDを貼り付け
preview_id = "YOUR_PREVIEW_ID_HERE"  # ← ステップ4のプレビューIDを貼り付け
```

**成功確認**: ファイル保存完了

---

## 今日のゴール達成チェック ✅

- [ ] Wranglerインストール完了
- [ ] Cloudflareアカウント確認完了
- [ ] ai-accounting-system プロジェクト作成完了
- [ ] KV Namespace作成完了（本番・プレビュー）
- [ ] wrangler.toml 更新完了

**全てチェック済み？** → **準備完了！明日以降の作業に進めます**

---

## 明日以降の作業プレビュー

### 次回（1時間）: 環境変数設定

```bash
# 環境変数を1つずつ設定（例）
wrangler secret put MONGODB_URI
# → 貼り付けプロンプトが表示される

wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GOOGLE_PRIVATE_KEY
# ... 合計47個
```

**所要時間**: 1-2時間（コピペ作業）

### 次々回（2時間）: Next.js設定調整 + ビルドテスト

```bash
# next.config.mjs編集（output: 'export'）
# ビルドテスト実行
npm run build
```

**所要時間**: 2時間（トラブルシューティング含む）

### 最終（1時間）: 初回デプロイ

```bash
# デプロイ実行
wrangler pages deploy .next

# 成功すると → https://ai-accounting-system.pages.dev
```

**所要時間**: 1時間（確認・調整含む）

---

## トラブルシューティング（よくある問題）

### Q1: `wrangler login` でブラウザが開かない

**A**: 手動でURLを開く
```bash
# 表示されたURLをコピーしてブラウザで開く
# 例: https://dash.cloudflare.com/oauth2/auth?...
```

### Q2: `wrangler: command not found`

**A**: PATHを確認
```bash
# npm global bin の場所を確認
npm config get prefix

# ~/.zshrc または ~/.bash_profile に追加
export PATH="$PATH:/usr/local/bin"
source ~/.zshrc
```

### Q3: KV Namespace作成でエラー

**A**: Cloudflare Dashboardから手動作成
1. Dashboard → Workers & Pages → KV
2. Create namespace → 名前: `CACHE`
3. IDをコピーしてwrangler.tomlに記載

---

## サポート情報

### Cloudflare公式ドキュメント
- Workers: https://developers.cloudflare.com/workers/
- Pages: https://developers.cloudflare.com/pages/
- Wrangler: https://developers.cloudflare.com/workers/wrangler/

### 質問・相談先
- Cloudflare Community: https://community.cloudflare.com/
- Cloudflare Discord: https://discord.gg/cloudflaredev

---

**作成日**: 2025-01-07
**想定完了時間**: 30分
**次回作業**: 環境変数設定（1-2時間）
