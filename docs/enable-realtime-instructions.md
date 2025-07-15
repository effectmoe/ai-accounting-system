---
title: Supabase OCR Resultsテーブルのリアルタイム有効化手順
created: 2025-07-06 17:59
updated: 2025-07-06 17:59
tags: [Supabase, リアルタイム, OCR, 設定手順, トラブルシューティング]
category: guide
author: Claude & tonychustudio
---

# Supabase OCR Resultsテーブルのリアルタイム有効化手順

## TL;DR

Supabaseのocr_resultsテーブルでリアルタイム通知が動作しない問題を解決するための手順書。Supabaseダッシュボードで3つの設定（Replication、SQL実行、RLS無効化）を行うことで、リアルタイム機能が有効になります。所要時間約5分。

## 目次

- [問題の概要](#問題の概要)
- [解決手順](#解決手順)
  - [手順1: Supabaseダッシュボードにログイン](#手順1-supabaseダッシュボードにログイン)
  - [手順2: Replication設定](#手順2-replication設定)
  - [手順3: SQL Editorで設定](#手順3-sql-editorで設定)
  - [手順4: 動作確認](#手順4-動作確認)
- [トラブルシューティング](#トラブルシューティング)
- [本番環境への適用](#本番環境への適用)

## 問題の概要

現在の状況：
- ✅ データの挿入は成功
- ✅ リアルタイムリスナーは正常に起動
- ❌ リアルタイム通知が受信されない

原因：
1. ocr_resultsテーブルがリアルタイムパブリケーションに含まれていない
2. REPLICA IDENTITYが設定されていない
3. RLSが有効でリアルタイムをブロックしている可能性

## 解決手順

### 手順1: Supabaseダッシュボードにログイン

1. [Supabaseダッシュボード](https://app.supabase.com/project/clqpfmroqcnvyxdzadln)にアクセス
2. プロジェクト「clqpfmroqcnvyxdzadln」を確認

### 手順2: Replication設定

1. **Database** → **Replication** タブに移動
2. **supabase_realtime** パブリケーションを選択
3. **Source** セクションを確認
4. **ocr_results** テーブルを探す
   - ✅ チェックされている場合 → 手順3へ
   - ❌ チェックされていない場合 → チェックボックスをオンにして保存

### 手順3: SQL Editorで設定

1. **SQL Editor** タブに移動
2. 新しいクエリウィンドウを開く
3. 以下のSQLを実行：

```sql
-- 1. RLSを一時的に無効化（開発環境のみ）
ALTER TABLE public.ocr_results DISABLE ROW LEVEL SECURITY;

-- 2. REPLICA IDENTITYを設定
ALTER TABLE public.ocr_results REPLICA IDENTITY FULL;

-- 3. パブリケーションに追加（既に追加されている場合はエラーが出るが無視）
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_results;

-- 4. 設定確認
SELECT 
  tablename,
  pubname,
  'Realtime Enabled' as status
FROM pg_publication_tables 
WHERE tablename = 'ocr_results' 
  AND pubname = 'supabase_realtime';
```

4. **Run** ボタンをクリックして実行
5. 結果に `ocr_results | supabase_realtime | Realtime Enabled` が表示されることを確認

### 手順4: 動作確認

1. ターミナルを2つ開く

**ターミナル1（リスナー）:**
```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation
node simple_realtime_test.js
```

**ターミナル2（データ挿入）:**
```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation
node test_ocr_realtime.js --insert
```

2. ターミナル1に以下のような通知が表示されれば成功：
```
🔔 リアルタイムイベントを受信！
イベントタイプ: INSERT
データ: { ... }
```

## トラブルシューティング

### リアルタイム通知が受信されない場合

1. **Supabaseの設定を再確認**
   - Replicationタブでocr_resultsがチェックされているか
   - SQL Editorで設定確認クエリを再実行

2. **ブラウザのキャッシュをクリア**
   - Supabaseダッシュボードをリロード
   - 設定を再度確認

3. **テストスクリプトの再起動**
   - 両方のプロセスを停止（Ctrl+C）
   - 再度実行

### エラーメッセージ別対処法

- `relation "ocr_results" is already part of the publication`
  → 正常。既にパブリケーションに含まれている

- `permission denied`
  → Service Roleキーを使用しているか確認

## 本番環境への適用

開発環境でリアルタイムが動作することを確認後：

1. **RLSを再度有効化**
```sql
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
```

2. **適切なRLSポリシーを作成**
```sql
-- 会社ごとのアクセス制御
CREATE POLICY "company_isolation" ON public.ocr_results
  FOR ALL 
  USING (company_id = auth.jwt() ->> 'company_id');

-- リアルタイム用の読み取り権限
CREATE POLICY "realtime_read" ON public.ocr_results
  FOR SELECT
  USING (true);
```

3. **アプリケーションコードの更新**
- エラーハンドリングの追加
- 再接続ロジックの実装
- 接続状態の監視

## 関連ファイル

- `/simple_realtime_test.js` - シンプルなリアルタイムテスト
- `/test_ocr_realtime.js` - 完全なテストツール
- `/complete_realtime_setup.sql` - 設定用SQLスクリプト
- `/app/documents/page.tsx` - リアルタイム実装済みのページ