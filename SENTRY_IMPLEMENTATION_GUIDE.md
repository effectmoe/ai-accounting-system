# Sentry実装ガイド

## 設定済みの内容

### 1. 基本設定
- **DSN**: `https://64aa13757b137e08d605bb378c0bd815@o4509692975316992.ingest.us.sentry.io/4509696359596032`
- **組織**: `effect-cz`
- **プロジェクト**: `mastra-accounting`

### 2. 有効化された機能
- ✅ エラートラッキング
- ✅ パフォーマンストラッキング（トレース）
- ✅ セッションリプレイ
- ✅ コンソールログ統合
- ✅ 実験的ログ機能

## 実装パターン

### 1. エラーキャプチャ

```typescript
import * as Sentry from "@sentry/nextjs";

// 基本的なエラーキャプチャ
try {
  // 処理
} catch (error) {
  Sentry.captureException(error);
}

// コンテキスト付きエラーキャプチャ
Sentry.captureException(error, {
  tags: {
    operation: 'invoice_creation',
    module: 'accounting',
  },
  extra: {
    invoiceId: 'INV-001',
    customerId: 'CUST-123',
  },
});
```

### 2. パフォーマンストラッキング

```typescript
// UIアクション
Sentry.startSpan(
  {
    op: "ui.click",
    name: "Save Invoice Button",
  },
  (span) => {
    span.setAttribute("invoice.id", invoiceId);
    span.setAttribute("invoice.amount", amount);
    // 実際の処理
  }
);

// APIコール
async function fetchInvoices() {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: "GET /api/invoices",
    },
    async () => {
      const response = await fetch("/api/invoices");
      return response.json();
    }
  );
}
```

### 3. ロギング

```typescript
import { logger } from "@/lib/sentry-utils";

// 各種ログレベル
logger.trace("詳細なデバッグ情報", { data: value });
logger.debug(logger.fmt`ユーザー ${userId} がアクセス`);
logger.info("請求書作成完了", { invoiceId: "INV-001" });
logger.warn("API制限に近づいています", { current: 450, limit: 500 });
logger.error("メール送信失敗", { recipient: "user@example.com" });
logger.fatal("データベース接続エラー", { database: "accounting" });
```

## ユーティリティ関数

`/lib/sentry-utils.ts`に以下のヘルパー関数を用意：

### 1. trackUIAction
UIアクション（ボタンクリック等）のトラッキング

```typescript
trackUIAction(
  "Delete Customer",
  { customerId: "CUST-123" },
  () => {
    // 削除処理
  }
);
```

### 2. trackAPICall
APIコールのトラッキング

```typescript
const data = await trackAPICall(
  "POST",
  "/api/invoices",
  async () => {
    const response = await fetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceData),
    });
    return response.json();
  }
);
```

### 3. trackDBOperation
データベース操作のトラッキング

```typescript
const result = await trackDBOperation(
  "update",
  "invoices",
  async () => {
    return await updateInvoice(invoiceId, data);
  }
);
```

### 4. trackBusinessOperation
ビジネスロジックのトラッキング

```typescript
const report = await trackBusinessOperation(
  "Generate Monthly Report",
  { month: "2025-01", format: "pdf" },
  async () => {
    return await generateReport();
  }
);
```

### 5. captureErrorWithContext
コンテキスト付きエラーキャプチャ

```typescript
captureErrorWithContext(error, {
  operation: "invoice_creation",
  userId: currentUser.id,
  entityId: invoiceId,
  entityType: "invoice",
});
```

## 実装例

実装例は `/components/sentry-examples.tsx` を参照してください。

## ベストプラクティス

1. **意味のある操作名を使用**
   - ✅ `"Save Invoice"`, `"Delete Customer"`
   - ❌ `"button click"`, `"api call"`

2. **適切な属性を追加**
   - エンティティID（invoiceId, customerId等）
   - 操作のコンテキスト（amount, status等）
   - ユーザー情報

3. **エラーには十分なコンテキストを**
   - 何が失敗したか
   - どのエンティティで失敗したか
   - ユーザーは誰か

4. **パフォーマンスの監視**
   - 重要な操作にスパンを追加
   - 遅い操作には警告ログを出力

5. **ログレベルの適切な使用**
   - `trace`: 詳細なデバッグ情報
   - `debug`: 開発時の情報
   - `info`: 重要なビジネスイベント
   - `warn`: 注意が必要な状況
   - `error`: エラーだが処理は継続
   - `fatal`: 致命的なエラー

## トラブルシューティング

### Sentryにデータが送信されない
1. DSNが正しく設定されているか確認
2. ネットワークタブでSentryへのリクエストを確認
3. `debug: true`を設定して詳細ログを確認

### パフォーマンスデータが表示されない
1. `tracesSampleRate`が0より大きいか確認
2. スパンが正しく閉じられているか確認

### ログが表示されない
1. `_experiments.enableLogs`が`true`か確認
2. `consoleLoggingIntegration`が設定されているか確認