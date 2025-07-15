---
title: GAS MCP サーバーのセットアップ手順
created: 2025-07-06 18:30
updated: 2025-07-06 18:30
tags: [GAS, MCP, 自動化, セットアップ]
category: guide
author: Claude & tonychustudio
---

# GAS MCP サーバーのセットアップ手順

## TL;DR

gas_mcp（よりシンプル）をインストールして、Claude DesktopからGASを直接操作できるようにします。これによりOCRスクリプトの再デプロイやテストが自動化できます。

## 目次

- [選択するMCPサーバー](#選択するmcpサーバー)
- [gas_mcpのセットアップ](#gas_mcpのセットアップ)
- [Claude Desktop設定](#claude-desktop設定)
- [動作確認](#動作確認)

## 選択するMCPサーバー

### 2つのオプション

1. **gas_mcp** (推奨)
   - よりシンプルで軽量
   - 基本的なGAS操作に特化
   - セットアップが簡単

2. **google-appscript-mcp-server**
   - より高機能
   - 16個のツール
   - OAuth設定が複雑

今回は**gas_mcp**を使用します。

## gas_mcpのセットアップ

### 1. インストール

```bash
cd /Users/tonychustudio/gas_mcp
npm install
```

### 2. 設定確認

```bash
# package.jsonを確認
cat package.json | grep -E "(name|version|main)"
```

### 3. ビルド（TypeScriptの場合）

```bash
# TypeScriptプロジェクトの場合
npm run build
```

## Claude Desktop設定

### 1. 設定ファイルの場所

macOSの場合：
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 2. 設定を追加

```json
{
  "mcpServers": {
    "gas": {
      "command": "node",
      "args": ["/Users/tonychustudio/gas_mcp/dist/index.js"],
      "env": {
        "GOOGLE_SCRIPT_ID": "AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ"
      }
    }
  }
}
```

### 3. Claude Desktopを再起動

1. Claude Desktopを完全に終了
2. 再度起動
3. MCPアイコンに「gas」が表示されることを確認

## 動作確認

### 利用可能なツール

gas_mcpが提供するツール：
- **script_create**: 新しいGASプロジェクトを作成
- **script_get**: プロジェクト情報を取得
- **script_update**: スクリプトを更新
- **script_run**: 関数を実行
- **script_deploy**: デプロイを管理

### テストコマンド

Claude Desktopで以下を試す：

```
「GASプロジェクト AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ の情報を取得して」
```

## OCR処理の自動化

MCPが設定できたら：

1. **スクリプトの更新**
   ```
   「GASのOCRスクリプトを更新して、テスト関数を追加」
   ```

2. **再デプロイ**
   ```
   「GASプロジェクトを新しいバージョンとして再デプロイ」
   ```

3. **テスト実行**
   ```
   「checkApiSettings関数を実行」
   ```

## トラブルシューティング

### エラー: command not found

```bash
# node.jsのパスを確認
which node
# 結果を設定に使用
```

### エラー: module not found

```bash
cd /Users/tonychustudio/gas_mcp
npm run build
# または
npm install
```

### 認証エラー

Google Cloud ConsoleでApps Script APIが有効か確認