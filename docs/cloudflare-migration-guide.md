# Cloudflare移行ガイド

## 概要

AI会計システムをVercel（Hobby）からCloudflareへ移行するための完全ガイド

---

## なぜCloudflareへ移行するのか？

### 現在の課題（Vercel Hobby）
- ⏱️ **実行時間制限**: 10秒（OCR処理が限界）
- 💰 **コスト**: Pro必須（$20/月）で60秒に拡張可能
- 🤖 **AI機能制限**: 会計AI（22-57秒）、税務AI（42-107秒）が実装不可

### Cloudflareのメリット
- ⏱️ **柔軟な時間制限**: Workers 30秒/ステップ、Durable Objectsでステップ分割
- 💰 **コスト削減**: Free Tier 10万リクエスト/日、有料でも$12-15/月
- 🤖 **AI対応**: Workers AI + Durable Objectsで長時間処理可能
- 🌍 **グローバルCDN**: 300+エッジロケーション
- 🔒 **セキュリティ**: DDoS対策、WAF標準搭載

---

## 移行アーキテクチャ

### Phase 1: フロントエンド移行（Cloudflare Pages）
```
Next.js 14 → Cloudflare Pages
- SSG/ISR対応
- Edge Rendering
- 自動デプロイ（Git連携）
```

### Phase 2: APIルート移行（Cloudflare Workers）
```
Next.js API Routes → Cloudflare Workers
- MongoDB接続維持
- Hono/Workers API対応
- 30秒/リクエスト
```

### Phase 3: 長時間処理（Durable Objects）
```
OCR処理 → OCRProcessor Durable Object
会計AI → AccountingAI Durable Object
税務AI → TaxAI Durable Object
```

### データベース（変更なし）
```
MongoDB Atlas Free Tier (512MB)
- トランザクション対応維持
- 接続文字列変更なし
```

---

## 移行手順

### ステップ1: Cloudflareアカウント作成

1. **Cloudflareアカウント登録**
   - URL: https://dash.cloudflare.com/sign-up
   - メールアドレス認証

2. **Wranglerインストール**（Cloudflare CLI）
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **プロジェクト作成**
   ```bash
   # Cloudflare Pages作成
   wrangler pages project create ai-accounting-system

   # KV Namespace作成（キャッシュ用）
   wrangler kv:namespace create CACHE
   wrangler kv:namespace create CACHE --preview
   ```

4. **Durable Objects有効化**
   - Dashboard → Workers & Pages → ai-accounting-system
   - Settings → Durable Objects → Enable

---

### ステップ2: 環境変数設定

#### 必須環境変数（47個）

**データベース**
- `MONGODB_URI`

**認証・セキュリティ**
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `SITE_PASSWORD`

**Gmail送信**
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_USER`

**Google Drive/OCR**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PRIVATE_KEY_ID`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_DRIVE_OCR_FOLDER_ID`
- `GAS_OCR_URL`
- `GAS_SCRIPT_ID`
- `GAS_WEBHOOK_URL`

**AI API**
- `DEEPSEEK_API_KEY`
- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `OLLAMA_VISION_MODEL`
- `PERPLEXITY_API_KEY`
- `MIDSCENE_API_KEY`
- `MIDSCENE_CHROME_EXTENSION_ID`

**外部サービス**
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_APPLICATION_ID`
- `SQUARE_ENVIRONMENT`
- `FIRECRAWL_API_KEY`
- `DATAFORSEO_API_KEY`
- `NLWEB_API_KEY`
- `NLWEB_SITE_URL`

**Supabase**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**監視・分析**
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `TRACKING_WORKER_URL`

**GitHub連携**
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`

**その他**
- `ENABLE_OCR`
- `NEXT_PUBLIC_USE_AZURE_MONGODB`
- `VERCEL_OIDC_TOKEN`

#### 環境変数設定方法

**方法1: Wrangler CLI（推奨）**
```bash
# Secret変数（暗号化）
wrangler secret put MONGODB_URI
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GOOGLE_PRIVATE_KEY
# ... その他のsecret変数

# 通常の環境変数
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
wrangler pages secret put NEXT_PUBLIC_SENTRY_DSN
```

**方法2: Cloudflare Dashboard**
1. Dashboard → Workers & Pages → ai-accounting-system
2. Settings → Environment Variables
3. Add variable → Production/Preview選択

---

### ステップ3: Next.js設定調整

#### `next.config.mjs` 修正

```javascript
/** @type {import('next').NextConfig} */

const nextConfig = {
  // Cloudflare Pages用: standaloneからstaticに変更
  output: 'export', // 静的エクスポート

  // 画像最適化: Cloudflare Images使用
  images: {
    unoptimized: true, // Cloudflare側で最適化
  },

  // トレーリングスラッシュ（Cloudflare推奨）
  trailingSlash: true,

  // その他の設定は維持
  swcMinify: true,
  reactStrictMode: true,
  // ... 省略
};

export default nextConfig;
```

#### `package.json` スクリプト追加

```json
{
  "scripts": {
    "build:cloudflare": "next build",
    "deploy:cloudflare": "wrangler pages deploy .next",
    "deploy:preview": "wrangler pages deploy .next --branch=preview"
  }
}
```

---

### ステップ4: APIルート → Workers移行

#### 現在のAPIルート構造
```
app/api/
├── invoices/
├── quotes/
├── customers/
├── receipts/
├── upload/
└── send-email/
```

#### Workers移行パターン

**新規ファイル構成**
```
workers/
├── api/
│   ├── invoices.ts
│   ├── quotes.ts
│   ├── customers.ts
│   ├── receipts.ts
│   └── send-email.ts
├── lib/
│   ├── mongodb.ts
│   └── pdf-generator.ts
└── index.ts  # メインルーター
```

**サンプル実装（Hono使用）**
```typescript
// workers/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import invoicesRouter from './api/invoices';
import quotesRouter from './api/quotes';

const app = new Hono();

app.use('/*', cors());

app.route('/api/invoices', invoicesRouter);
app.route('/api/quotes', quotesRouter);

export default app;
```

---

### ステップ5: Durable Objects実装

#### OCRProcessor Durable Object

```typescript
// workers/durable-objects/OCRProcessor.ts
export class OCRProcessor {
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const { file, receiptId } = await request.json();

    // ステップ1: ファイルアップロード（Google Drive）
    await this.uploadToGoogleDrive(file);
    this.state.storage.put('status', 'uploaded');

    // ステップ2: OCR実行（GAS経由）
    const ocrResult = await this.executeOCR(file);
    this.state.storage.put('status', 'ocr_completed');

    // ステップ3: 結果保存（MongoDB）
    await this.saveOCRResult(receiptId, ocrResult);
    this.state.storage.put('status', 'completed');

    return new Response(JSON.stringify({ status: 'completed', result: ocrResult }));
  }

  // 各ステップは30秒以内に完了
  private async uploadToGoogleDrive(file: File) { /* ... */ }
  private async executeOCR(file: File) { /* ... */ }
  private async saveOCRResult(id: string, result: any) { /* ... */ }
}
```

#### wrangler.toml 設定追加

```toml
[[durable_objects.bindings]]
name = "OCR_PROCESSOR"
class_name = "OCRProcessor"
script_name = "ai-accounting-system"

[[migrations]]
tag = "v1"
new_classes = ["OCRProcessor"]
```

---

### ステップ6: デプロイ

#### 初回デプロイ

```bash
# 1. ビルド
npm run build:cloudflare

# 2. デプロイ（Pages）
wrangler pages deploy .next

# 3. Workers デプロイ
wrangler deploy workers/index.ts

# 4. Durable Objects デプロイ
wrangler deploy workers/durable-objects/OCRProcessor.ts
```

#### 自動デプロイ設定（GitHub Actions）

```yaml
# .github/workflows/cloudflare-deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:cloudflare
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy .next --project-name=ai-accounting-system
```

---

## コスト比較

### Vercel Pro（現在の必須プラン）
- **月額**: $20
- **実行時間**: 60秒
- **帯域幅**: 1TB
- **ビルド時間**: 6000分

### Cloudflare Workers + Pages
- **Free Tier**:
  - リクエスト: 10万/日（300万/月）
  - Durable Objects: 100万リクエスト/月
  - Pages: 500ビルド/月
  - 帯域幅: 無制限

- **Paid Plan**:
  - Workers: $5/月（基本料金）+ $0.50/100万リクエスト
  - Durable Objects: $5/月 + $0.15/100万リクエスト
  - **合計**: $12-15/月（想定）

**節約額**: $5-8/月（年間 $60-96）

---

## 移行スケジュール

### Week 1: 準備
- [ ] Cloudflareアカウント作成
- [ ] Wranglerインストール・認証
- [ ] 環境変数エクスポート・移行

### Week 2: フロントエンド移行
- [ ] Next.js設定調整
- [ ] ビルド・テスト
- [ ] Cloudflare Pagesデプロイ

### Week 3: API移行
- [ ] Workers実装
- [ ] MongoDB接続テスト
- [ ] APIエンドポイント移行

### Week 4: Durable Objects実装
- [ ] OCRProcessor実装
- [ ] AccountingAI実装（将来）
- [ ] TaxAI実装（将来）

### Week 5: 本番切り替え
- [ ] 統合テスト
- [ ] 本番データ最終バックアップ
- [ ] DNS切り替え
- [ ] 監視設定

---

## トラブルシューティング

### 問題1: ビルドエラー（Node.js互換性）
**原因**: Cloudflare WorkersはNode.js APIの一部が未対応

**解決方法**:
```toml
# wrangler.toml
compatibility_flags = ["nodejs_compat"]
node_compat = true
```

### 問題2: MongoDB接続タイムアウト
**原因**: Workers 30秒制限

**解決方法**:
- コネクションプーリング使用
- タイムアウト設定: 25秒以内

### 問題3: 環境変数が読み込めない
**原因**: Cloudflare環境変数はprocess.envではなくenvオブジェクト

**解決方法**:
```typescript
// Before (Vercel)
const mongoUri = process.env.MONGODB_URI;

// After (Cloudflare)
export default {
  async fetch(request: Request, env: Env) {
    const mongoUri = env.MONGODB_URI;
  }
}
```

---

## セキュリティ上の注意

### 1. 環境変数の暗号化
- Cloudflare Dashboardで設定した環境変数は自動暗号化
- `wrangler secret put`で追加した変数も暗号化

### 2. MongoDB Atlas IP制限
- Cloudflare WorkersのIPアドレスは動的
- MongoDB AtlasのIP Access Listで「0.0.0.0/0」許可（推奨しない）
- 代替: MongoDB Atlas Data APIまたはPrivate Endpoints使用

### 3. CORS設定
```typescript
// workers/index.ts
app.use('/*', cors({
  origin: ['https://your-domain.com'],
  credentials: true,
}));
```

---

## 次のステップ

✅ **完了した作業**:
- MongoDBバックアップ設定
- Cloudflare設定ファイル作成（wrangler.toml）
- 移行ガイドドキュメント作成

⏭️ **次の作業**:
1. Cloudflareアカウント作成・ログイン
2. 環境変数のエクスポート・移行
3. Next.js設定調整（next.config.mjs）
4. 初回ビルド・デプロイテスト

---

**最終更新**: 2025-01-07
