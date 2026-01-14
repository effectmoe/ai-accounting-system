# OCR Queue Worker with Durable Objects

AI会計システムのOCR処理をキュー管理するCloudflare Workersプロジェクト。

## 機能

- **Durable Objects**: ジョブの永続化とキュー管理
- **指数バックオフ**: 失敗時の自動リトライ（2s → 4s → 8s）
- **ステータス追跡**: ジョブの進捗状況をリアルタイム確認
- **ヘルスチェック**: Ollamaの接続状態を監視

## アーキテクチャ

```
Vercel App (Next.js)
  ↓ HTTP Request
Cloudflare Workers (OCR Queue)
  ↓ Durable Objects (キュー管理)
  ↓ HTTP Request
Cloudflare Tunnel
  ↓
Local Ollama (qwen3-vl Vision Model)
```

## API エンドポイント

### POST /submit
OCRジョブを送信

```json
{
  "imageBase64": "base64エンコードされた画像データ",
  "fileName": "optional_filename.jpg"
}
```

Response:
```json
{
  "success": true,
  "jobId": "ocr-abc123-xyz789",
  "message": "Job submitted successfully"
}
```

### GET /status?jobId={jobId}
ジョブのステータスを確認

### GET /result?jobId={jobId}
ジョブの結果を取得（完了時）

### GET /stats
キューの統計情報

### GET /health
ヘルスチェック

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| OLLAMA_URL | Ollama APIのURL | https://local-ollama.otona-off.style |
| CORS_ORIGIN | 許可するオリジン | https://accounting-automation.vercel.app |
| MAX_RETRIES | 最大リトライ回数 | 3 |
| RETRY_DELAY_MS | 初回リトライ待機時間（ms） | 2000 |
| REQUEST_TIMEOUT_MS | リクエストタイムアウト（ms） | 180000 |

## 開発

```bash
# 依存関係インストール
npm install

# ローカル開発
npm run dev

# デプロイ
npm run deploy

# 本番デプロイ
npm run deploy:production

# ログ確認
npm run tail
```

## デプロイ手順

1. Cloudflare Workersにログイン
```bash
wrangler login
```

2. 初回デプロイ（Durable Objectsの作成含む）
```bash
npm run deploy
```

3. Vercel環境変数を設定
```
OCR_QUEUE_URL=https://accounting-ocr-queue.{account}.workers.dev
OCR_QUEUE_ENABLED=true
```

## Vercel側の設定

`lib/ocr-queue-client.ts`を使用してキューにアクセス：

```typescript
import { getOCRQueueClient } from '@/lib/ocr-queue-client';

const client = getOCRQueueClient();

// ジョブ送信と結果待機
const result = await client.processImage(imageBase64, fileName);
```

## トラブルシューティング

### キューが有効にならない
- `OCR_QUEUE_URL`と`OCR_QUEUE_ENABLED`が正しく設定されているか確認
- Workersがデプロイされているか確認

### Ollamaに接続できない
- Cloudflare Tunnelが起動しているか確認
- `local-ollama.otona-off.style`にアクセスできるか確認

### ジョブがタイムアウトする
- `REQUEST_TIMEOUT_MS`を増加
- Ollamaのモデルがロードされているか確認
