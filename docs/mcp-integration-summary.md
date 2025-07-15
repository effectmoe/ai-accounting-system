---
title: MCP統合まとめ - AI会計システム
created: 2025-07-05 13:00
updated: 2025-07-05 13:00
tags: [MCP, 統合, Claude Desktop, AI会計, まとめ]
category: guide
author: Claude & tonychustudio
---

# MCP統合まとめ - AI会計システム

## TL;DR

AI会計システム（Mastra Kaikei）で利用可能なMCP統合の一覧と設定状況をまとめました。Supabase、Google Drive、GCPの各MCPサーバーを統合することで、会計処理の完全自動化が実現できます。

## 目次

- [実装済みMCP](#実装済みmcp)
- [設定ガイド作成済みMCP](#設定ガイド作成済みmcp)
- [GAS統合の現状](#gas統合の現状)
- [推奨設定順序](#推奨設定順序)
- [統合後の活用例](#統合後の活用例)

## 実装済みMCP

### 1. GAS OCR API（Web Apps形式）

**ファイル**: `/docs/gas-ocr-script.gs`

**機能**:
- PDF/画像のOCR処理
- 日本語対応
- 無料で利用可能

**使用方法**:
```javascript
// 環境変数 GAS_OCR_URL 経由で利用
const response = await fetch(process.env.GAS_OCR_URL, {
  method: 'POST',
  body: formData
});
```

## 設定ガイド作成済みMCP

### 1. Supabase MCP

**ガイド**: `/docs/supabase-mcp-setup.md`

**機能**:
- データベースへの自然言語クエリ
- 仕訳データの読み書き
- レポート生成

**設定例**:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=YOUR_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_PAT_TOKEN"
      }
    }
  }
}
```

### 2. Google Drive MCP

**ガイド**: `/docs/gdrive-mcp-setup.md`

**機能**:
- ファイル検索・読み取り
- スプレッドシート操作
- ドキュメント変換

**設定例**:
```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@isaacphi/mcp-gdrive"],
      "env": {
        "CLIENT_ID": "YOUR_CLIENT_ID",
        "CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "GDRIVE_CREDS_DIR": "/path/to/config"
      }
    }
  }
}
```

### 3. GCP MCP

**ガイド**: `/docs/claude-desktop-mcp-setup.md`

**機能**:
- Cloud Storage管理
- BigQuery分析
- Cloud Run管理

**設定例**:
```json
{
  "mcpServers": {
    "gcp": {
      "command": "uv",
      "args": [
        "run",
        "--with", "google-cloud-storage>=2.10.0",
        "--with", "mcp[cli]",
        "mcp",
        "run",
        "/path/to/gcp-mcp-server/main.py"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/key.json",
        "GCP_PROJECT_ID": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

## GAS統合の現状

### 現在の実装

1. **GAS OCR API**
   - Web Apps形式で実装済み
   - `/api/ocr/gas/route.ts` から呼び出し可能
   - MCP形式ではないが、HTTPエンドポイントとして利用可能

2. **Google Drive MCP経由での連携**
   - スプレッドシートの読み書きが可能
   - GASで作成したファイルへのアクセスも可能

### GAS専用MCPについて

現時点でGAS専用のMCPサーバーは存在しません。理由：

1. GASはWebアプリとして公開することが前提
2. MCPはローカルプロセスとの通信が基本
3. Google Drive MCPで多くの機能がカバー可能

## 推奨設定順序

### フェーズ1: 基本設定（30分）

1. **Supabase MCP**
   - データベースアクセスの基盤
   - 仕訳・取引データの管理

2. **GAS OCR API**
   - レシート・請求書の読み取り
   - すでに実装済み

### フェーズ2: 拡張設定（45分）

3. **Google Drive MCP**
   - ファイル管理
   - スプレッドシート連携

4. **GCP MCP**（オプション）
   - 高度な分析
   - バックアップ管理

## 統合後の活用例

### 完全自動化ワークフロー

```
「Google Driveの請求書フォルダを監視して、
新しいPDFがアップロードされたら：
1. GAS OCRで内容を読み取り
2. Supabaseに仕訳データを保存
3. Google Sheetsの月次集計表を更新
4. Cloud Storageにバックアップを作成」
```

### 月次決算処理

```
「今月の全取引データをSupabaseから取得して：
1. 勘定科目別に集計
2. Google Sheetsで試算表を作成
3. BigQueryで前年同月比を分析
4. レポートをGoogle Driveに保存」
```

### インテリジェント検索

```
「先月の交際費が5万円を超える取引を検索して、
領収書画像をGoogle Driveから取得し、
詳細をスプレッドシートにまとめて」
```

## セキュリティ考慮事項

1. **認証情報の管理**
   - 各サービスの認証情報は別々に管理
   - 定期的なトークンローテーション

2. **アクセス権限**
   - 最小権限の原則を適用
   - Read-onlyモードの活用

3. **監査ログ**
   - 全ての操作を記録
   - 異常検知の設定

## 次のアクション

1. **必須**: Supabase MCPの設定（データベース連携）
2. **推奨**: Google Drive MCPの設定（ファイル管理）
3. **オプション**: GCP MCPの設定（高度な機能）

各設定ガイドに従って、段階的に統合を進めてください。