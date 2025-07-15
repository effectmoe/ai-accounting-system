---
title: Supabase リアルタイム機能の代替設定方法
created: 2025-07-06 18:05
updated: 2025-07-06 18:05
tags: [Supabase, リアルタイム, 代替方法, SQL Editor]
category: guide
author: Claude & tonychustudio
---

# Supabase リアルタイム機能の代替設定方法

## TL;DR

ReplicationタブがComing Soonの場合でも、SQL Editorから直接リアルタイム機能を有効化できます。また、Supabaseの設定画面でRealtime機能自体が有効になっているか確認が必要です。

## 目次

- [確認すべき項目](#確認すべき項目)
- [SQL Editorでの直接設定](#sql-editorでの直接設定)
- [Realtime設定の確認](#realtime設定の確認)
- [代替ソリューション](#代替ソリューション)

## 確認すべき項目

### 1. API設定でRealtime有効化を確認

1. **Settings** → **API** タブに移動
2. **Realtime** セクションを確認
3. 「Enable Realtime」がオンになっているか確認

### 2. Database設定でRealtime確認

1. **Settings** → **Database** タブに移動
2. 下部の「Realtime」セクションを確認
3. リアルタイムが有効になっているか確認

## SQL Editorでの直接設定

ReplicationタブがComing Soonでも、SQL Editorから直接設定できます：

```sql
-- 1. supabase_realtimeユーザーの権限を確認
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'supabase_realtime_admin'
  AND table_name = 'ocr_results';

-- 2. 権限がない場合は付与
GRANT ALL ON public.ocr_results TO supabase_realtime_admin;

-- 3. リアルタイム用の設定を実行
BEGIN;

-- RLSを一時的に無効化
ALTER TABLE public.ocr_results DISABLE ROW LEVEL SECURITY;

-- REPLICA IDENTITYを設定
ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- 手動でパブリケーションを作成（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  END IF;
END$$;

-- テーブルをパブリケーションに追加
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;

COMMIT;

-- 4. 設定確認
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## Realtime設定の確認

### API Settingsでの確認項目

1. **Project Settings** → **API** に移動
2. 以下を確認：
   - Realtime enabled: ✅
   - Realtime URL: wss://clqpfmroqcnvyxdzadln.supabase.co/realtime/v1
   - Anon public key: 正しく設定されている

### 接続テスト

```javascript
// Realtime接続のデバッグ
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://clqpfmroqcnvyxdzadln.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA',
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// 接続状態を確認
console.log('Realtime URL:', supabase.realtimeUrl);
console.log('Realtime client:', supabase.realtime);
```

## 代替ソリューション

### 1. ポーリング方式（一時的な解決策）

リアルタイムが使えない場合の代替案：

```javascript
// 5秒ごとに新しいデータをチェック
setInterval(async () => {
  const { data } = await supabase
    .from('ocr_results')
    .select('*')
    .gt('created_at', lastCheckTime)
    .order('created_at', { ascending: false });
    
  if (data && data.length > 0) {
    // 新しいデータを処理
  }
}, 5000);
```

### 2. Webhookの活用

Google Apps Script側から直接通知：

```javascript
// GAS側でデータ挿入後にWebhookを送信
function notifyDataInserted(ocrResult) {
  const webhookUrl = 'https://your-app.vercel.app/api/ocr-notification';
  
  UrlFetchApp.fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_SECRET'
    },
    payload: JSON.stringify({
      event: 'ocr.completed',
      data: ocrResult
    })
  });
}
```

### 3. Server-Sent Events (SSE)

Next.js APIルートでSSEを実装：

```javascript
// /api/ocr-events
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const intervalId = setInterval(async () => {
    const { data } = await supabase
      .from('ocr_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
}
```

## 次のステップ

1. **Settings → API** でRealtimeが有効か確認
2. SQL Editorで上記のSQLを実行
3. それでも動作しない場合は、一時的にポーリング方式を実装
4. Supabaseサポートに問い合わせて早期アクセスを申請

## 関連リンク

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Status Page](https://status.supabase.com/)
- Early Access申請: Request Early Accessボタンから申請