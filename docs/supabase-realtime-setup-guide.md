---
title: Supabase リアルタイム機能設定ガイド - OCR Results テーブル
created: 2025-07-06 15:00
updated: 2025-07-06 15:00
tags: [Supabase, Realtime, OCR, Database, PostgreSQL]
category: guide
author: Claude & tonychustudio
---

# Supabase リアルタイム機能設定ガイド - OCR Results テーブル

## TL;DR

ocr_resultsテーブルでリアルタイム機能を有効にするための完全ガイド。3つの主要設定（Replication、Publication、RLS）を正しく構成することで、OCR処理結果の即座な通知を実現。所要時間：約10分。

## 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [ステップ1: Supabaseダッシュボードにアクセス](#ステップ1-supabaseダッシュボードにアクセス)
- [ステップ2: Replication設定](#ステップ2-replication設定)
- [ステップ3: SQL Editorでの設定](#ステップ3-sql-editorでの設定)
- [ステップ4: RLSポリシーの確認](#ステップ4-rlsポリシーの確認)
- [ステップ5: 動作確認](#ステップ5-動作確認)
- [トラブルシューティング](#トラブルシューティング)
- [実装例](#実装例)

## 概要

Supabaseのリアルタイム機能を使用すると、データベースの変更を即座にクライアントに通知できます。OCR処理結果をリアルタイムで監視することで、以下が実現できます：

- 📸 新しいOCR処理の即座な通知
- 🔄 処理状態の自動更新
- ⚡ UIの自動リフレッシュ
- 🔔 エラー発生時の即座な通知

## 前提条件

- Supabaseプロジェクトへのアクセス権限
- ocr_resultsテーブルが作成済み
- Service RoleキーまたはAnon Keyを保有

## ステップ1: Supabaseダッシュボードにアクセス

1. ブラウザで以下のURLにアクセス：
   ```
   https://app.supabase.com/project/clqpfmroqcnvyxdzadln
   ```

2. ログイン後、プロジェクトダッシュボードが表示されることを確認

## ステップ2: Replication設定

### 2.1 Database → Replication に移動

1. 左側のメニューから「Database」をクリック
2. サブメニューから「Replication」を選択

### 2.2 supabase_realtimeパブリケーションの確認

1. 「Publications」タブを確認
2. 「supabase_realtime」という名前のパブリケーションを探す
3. 存在しない場合は、新規作成が必要

### 2.3 ocr_resultsテーブルを追加

1. 「supabase_realtime」パブリケーションをクリック
2. 「Tables」セクションで「Add tables」ボタンをクリック
3. 検索ボックスに「ocr_results」と入力
4. public.ocr_resultsを選択
5. 「Save」をクリック

## ステップ3: SQL Editorでの設定

### 3.1 SQL Editorを開く

1. 左側のメニューから「SQL Editor」をクリック
2. 「New query」をクリック

### 3.2 必要なSQLを実行

以下のSQLを順番に実行します：

```sql
-- 1. Replica Identityを設定（リアルタイムに必要）
ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- 2. パブリケーションへの追加を確認
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'ocr_results';

-- 3. もし結果が空の場合、以下を実行
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;

-- 4. 設定の確認
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE tablename = 'ocr_results';
```

### 3.3 実行結果の確認

各SQLの実行後、以下を確認：
- エラーメッセージが表示されていないこと
- 最後のSELECT文で「supabase_realtime」が表示されること

## ステップ4: RLSポリシーの確認

### 4.1 現在のRLS状態を確認

```sql
-- RLSが有効かどうかを確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'ocr_results' 
AND schemaname = 'public';
```

### 4.2 必要に応じてRLSポリシーを設定

```sql
-- RLSを有効化（まだの場合）
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーのみアクセス可能にする例
CREATE POLICY "authenticated_users_only" ON public.ocr_results
    FOR ALL 
    TO authenticated
    USING (true);

-- Service Roleは全アクセス可能
CREATE POLICY "service_role_all_access" ON public.ocr_results
    FOR ALL 
    TO service_role
    USING (true);
```

## ステップ5: 動作確認

### 5.1 テスト用のリアルタイムリスナーを実装

```javascript
// test-realtime.js として保存
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🎧 リアルタイムリスナーを開始します...');

const channel = supabase
  .channel('ocr-results-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'ocr_results'
    },
    (payload) => {
      console.log('\n🔔 リアルタイム変更を検出！');
      console.log('イベントタイプ:', payload.eventType);
      console.log('データ:', JSON.stringify(payload, null, 2));
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ リアルタイム接続が確立されました！');
      console.log('📝 別のターミナルでデータを挿入してテストしてください。');
    } else {
      console.log('接続状態:', status);
    }
  });

// 接続を維持
process.on('SIGINT', () => {
  console.log('\n👋 接続を終了します...');
  supabase.removeChannel(channel);
  process.exit();
});
```

### 5.2 テストデータの挿入

別のターミナルで以下を実行：

```javascript
// insert-test.js として保存
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5Nzc0MSwiZXhwIjoyMDY3MjczNzQxfQ.n_FSZbe3xNSPGUVuWEXG4VohGQeCAe6tKAmAQbzX2LQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertTestData() {
  const testData = {
    file_name: `realtime_test_${Date.now()}.pdf`,
    file_size: 2048,
    file_type: 'application/pdf',
    file_url: 'https://example.com/test.pdf',
    extracted_text: 'リアルタイムテスト実行中',
    confidence: 0.99,
    vendor_name: 'リアルタイムテスト店舗',
    receipt_date: new Date().toISOString().split('T')[0],
    total_amount: Math.floor(Math.random() * 10000),
    tax_amount: Math.floor(Math.random() * 1000),
    status: 'completed'
  };

  const { data, error } = await supabase
    .from('ocr_results')
    .insert([testData])
    .select();

  if (error) {
    console.error('❌ エラー:', error);
  } else {
    console.log('✅ テストデータを挿入しました:', data[0]);
  }
}

insertTestData();
```

## トラブルシューティング

### エラー: リアルタイム通知が届かない

**原因と対策：**

1. **Replicationが有効になっていない**
   ```sql
   -- 確認
   SELECT * FROM pg_publication_tables WHERE tablename = 'ocr_results';
   
   -- 修正
   ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;
   ```

2. **Replica Identityが設定されていない**
   ```sql
   -- 修正
   ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;
   ```

3. **RLSポリシーがブロックしている**
   ```sql
   -- 一時的に無効化してテスト
   ALTER TABLE public.ocr_results DISABLE ROW LEVEL SECURITY;
   ```

### エラー: WebSocket接続エラー

**原因と対策：**

1. **ファイアウォール/プロキシの問題**
   - WebSocket (wss://) 接続が許可されているか確認
   - ポート443が開いているか確認

2. **認証トークンの期限切れ**
   - 新しいトークンを取得して再接続

## 実装例

### React Componentでの使用例

```jsx
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function OcrResultsRealtime() {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('接続中...');

  useEffect(() => {
    // 初期データの取得
    const fetchInitialData = async () => {
      const { data } = await supabase
        .from('ocr_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setResults(data);
    };

    fetchInitialData();

    // リアルタイムサブスクリプション
    const channel = supabase
      .channel('ocr-results-ui')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ocr_results'
        },
        (payload) => {
          setResults(prev => [payload.new, ...prev]);
          setStatus(`新規OCR: ${payload.new.file_name}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ocr_results'
        },
        (payload) => {
          setResults(prev => 
            prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            )
          );
          setStatus(`更新: ${payload.new.file_name}`);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('リアルタイム接続中');
        }
      });

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <p>状態: {status}</p>
      <ul>
        {results.map(result => (
          <li key={result.id}>
            {result.file_name} - {result.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## まとめ

以上の設定により、ocr_resultsテーブルのリアルタイム機能が有効になります。これにより、OCR処理の進行状況をリアルタイムで監視し、ユーザーに即座にフィードバックを提供できるようになります。

設定後は必ず動作確認を行い、本番環境では適切なRLSポリシーを設定してセキュリティを確保してください。