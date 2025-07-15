---
title: Supabase リアルタイム機能の問題と解決方法
created: 2025-07-06 18:10
updated: 2025-07-06 18:10
tags: [Supabase, リアルタイム, トラブルシューティング, 早期アクセス]
category: report
author: Claude & tonychustudio
---

# Supabase リアルタイム機能の問題と解決方法

## TL;DR

Supabaseのリアルタイム機能が動作しない原因は、Replicationタブが「Coming Soon」となっており、早期アクセスの申請が必要なためです。コード実装は正しいが、Supabase側の設定が有効化されていない状態です。

## 目次

- [問題の詳細](#問題の詳細)
- [原因の特定](#原因の特定)
- [解決方法](#解決方法)
- [実装済みのコード](#実装済みのコード)
- [今後の対応](#今後の対応)

## 問題の詳細

### 現在の状況
- ✅ リアルタイムリスナーのコードは正しく実装
- ✅ データの挿入・取得は正常に動作
- ✅ Supabaseクライアントの設定は正しい
- ❌ リアルタイム通知が受信されない
- ❌ ReplicationタブにアクセスできないWeb:enable

### 検証結果
1. `test_ocr_realtime.js` - リスナー起動するが通知受信せず
2. `simple_realtime_test.js` - 同様に通知受信せず
3. データベースへの挿入は成功

## 原因の特定

### スクリーンショットから判明した事実
- **Database → Replication** タブが「Coming Soon」状態
- 「Request Early Access」ボタンが表示されている
- リアルタイム機能の前提条件であるReplicationが未有効

### 技術的な原因
1. PostgreSQLのLogical Replicationが有効化されていない
2. `supabase_realtime` パブリケーションにテーブルを追加できない
3. REPLICA IDENTITYの設定が反映されない

## 解決方法

### 方法1: 早期アクセスの申請（推奨）

1. Supabaseダッシュボードの「Request Early Access」ボタンをクリック
2. 申請フォームに記入
3. 承認を待つ（通常数日）
4. 承認後、Replicationタブから設定

### 方法2: 一時的なポーリング実装

```javascript
// 5秒ごとに新しいデータをチェック
useEffect(() => {
  let lastCheckTime = new Date().toISOString();
  
  const intervalId = setInterval(async () => {
    const { data: newResults } = await supabase
      .from('ocr_results')
      .select('*')
      .gt('created_at', lastCheckTime)
      .order('created_at', { ascending: false });
      
    if (newResults && newResults.length > 0) {
      // 新しいデータを処理
      newResults.forEach(result => {
        toast.success(`新しい書類: ${result.file_name}`);
      });
      
      loadOcrResults();
      lastCheckTime = new Date().toISOString();
    }
  }, 5000);

  return () => clearInterval(intervalId);
}, []);
```

### 方法3: Webhook実装

Google Apps Script側から直接通知を送る：

```javascript
// GAS側
function sendWebhookNotification(ocrResult) {
  const webhookUrl = process.env.WEBHOOK_URL;
  
  UrlFetchApp.fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WEBHOOK_SECRET}`
    },
    payload: JSON.stringify({
      event: 'ocr.completed',
      data: ocrResult
    })
  });
}
```

## 実装済みのコード

### リアルタイムリスナー（動作待ち）
- `/app/documents/page.tsx` - 正しく実装済み
- `/test_ocr_realtime.js` - テストツール完成
- `/simple_realtime_test.js` - シンプルなテスト

### 設定スクリプト
- `/complete_realtime_setup.sql` - 設定用SQL
- `/enable_realtime_direct.sql` - 直接設定用SQL
- `/setup_realtime_ocr.js` - 自動設定ツール

## 今後の対応

### 短期的対応（1-2日）
1. ポーリング実装で一時的に対応
2. 早期アクセスを申請
3. ユーザー体験を損なわない範囲で運用

### 中期的対応（1週間）
1. 早期アクセス承認後、リアルタイム有効化
2. 既存のリアルタイムコードが自動的に動作開始
3. ポーリングコードを削除

### 長期的対応
1. エラーハンドリングの強化
2. 再接続ロジックの実装
3. パフォーマンス最適化

## 関連ファイル
- `/docs/enable-realtime-instructions.md` - 設定手順書
- `/docs/supabase-realtime-alternative.md` - 代替方法
- 画像: `/Users/tonychustudio/Dropbox/TechSmith/Snagit/Snagit-jpg/2025-07-06_18-03-26.jpg`