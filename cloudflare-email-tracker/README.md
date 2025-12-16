# AI会計システム - メールトラッキングサービス

Cloudflare Workers + D1 を使用したメール開封率・クリック率トラッキングサービス

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
cd cloudflare-email-tracker
npm install
```

### 2. Cloudflare へログイン

```bash
npx wrangler login
```

### 3. D1 データベースの作成

```bash
npx wrangler d1 create accounting-email-events
```

出力されたdatabase_idを`wrangler.toml`に設定:

```toml
[[d1_databases]]
binding = "DB"
database_name = "accounting-email-events"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 4. データベースマイグレーション

```bash
# ローカル開発用
npx wrangler d1 execute accounting-email-events --local --file=./schema.sql

# 本番用
npx wrangler d1 execute accounting-email-events --file=./schema.sql
```

### 5. デプロイ

```bash
npx wrangler deploy
```

## エンドポイント

| パス | メソッド | 説明 |
|------|---------|------|
| `/pixel?id=xxx` | GET | 開封トラッキングピクセル |
| `/click?id=xxx&url=xxx` | GET | クリックトラッキング（リダイレクト） |
| `/record` | POST | メール送信記録 |
| `/stats?id=xxx` | GET | 統計取得 |
| `/events?quoteId=xxx` | GET | イベント一覧取得 |
| `/health` | GET | ヘルスチェック |

## 使用例

### メール送信時（Next.js側から呼び出し）

```typescript
// メール送信後にトラッキング登録
await fetch('https://YOUR_WORKER.workers.dev/record', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trackingId: 'unique-tracking-id',
    messageId: 'gmail-message-id',
    quoteId: 'quote-object-id',
    recipientEmail: 'customer@example.com',
    subject: 'お見積書 - Q-2024-001'
  })
});
```

### HTMLメールにトラッキングピクセルを埋め込み

```html
<img src="https://YOUR_WORKER.workers.dev/pixel?id=unique-tracking-id"
     width="1" height="1" style="display:none" alt="" />
```

### クリックトラッキング付きリンク

```html
<a href="https://YOUR_WORKER.workers.dev/click?id=unique-tracking-id&url=https%3A%2F%2Fexample.com">
  詳細を見る
</a>
```

## カスタムドメイン設定（オプション）

`tracker.effect.moe` などのサブドメインを使用する場合:

1. Cloudflareダッシュボードでドメインを追加
2. `wrangler.toml`のroutesを設定
3. DNSレコードを設定

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `CORS_ORIGIN` | CORSで許可するオリジン |

## ローカル開発

```bash
npm run dev
```

`http://localhost:8787` でアクセス可能
