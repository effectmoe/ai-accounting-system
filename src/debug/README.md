# AAM Accounting Mastraデバッグシステム

## 概要

AAM Accountingシステムに統合されたMastraデバッグシステムです。実存MCPサーバーとカスタムデバッグMCPサーバーを組み合わせて、システム全体の監視・分析・最適化を実現します。

## 主な機能

### 1. **統合デバッグコーディネーター** (`aam-debug-coordinator`)
- 全システムの健康状態監視
- Mastraエージェント統合状況の追跡
- パフォーマンス分析とコスト最適化
- 実装ギャップの特定と移行パス提案

### 2. **OCRエージェント監視** (`aam-ocr-monitor`)
- Azure Form Recognizerのパフォーマンス監視
- GAS OCRフォールバック分析
- AI勘定科目分類の精度測定
- 日付抽出精度（和暦・漢数字対応）の分析

## セットアップ

### 1. 依存関係のインストール

```bash
# プロジェクトルートから実行
npm run mcp:debug:install
```

### 2. 環境変数の設定

`.env`ファイルに以下を追加：

```bash
# GitHub連携用（必須）
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# 既存の環境変数も必要
# MONGODB_URI
# AZURE_FORM_RECOGNIZER_KEY
# AZURE_FORM_RECOGNIZER_ENDPOINT
# OPENAI_API_KEY
# DEEPSEEK_API_KEY
# GAS_OCR_URL
```

### 3. Claude Desktopの設定

Claude Desktopで`.vscode/mcp.json`の設定が自動的に読み込まれます。

## 使用方法

### Claude Desktopから実行可能なコマンド

#### 全システム監視
```
"AAM Accountingの全システム健康状態をチェック"
"Mastraエージェント統合状況を評価"
"システム最適化レポートを生成"
```

#### OCR監視・分析
```
"OCRサービスの現在の状態を監視"
"Azure Form Recognizerのパフォーマンスを詳細分析"
"GAS OCRフォールバック使用率を確認"
"AI勘定科目分類の精度を測定"
"日付抽出精度を分析（和暦・漢数字含む）"
"OCR総合レポートを生成"
```

#### 問題診断・修正
```
"Azure Form Recognizerの応答遅延を分析"
"エージェント間通信のボトルネックを特定"
"データベース接続問題を診断"
```

### 開発者向けコマンド

```bash
# デバッグコーディネーターの単体実行
npm run mcp:debug:coordinator

# OCR監視の単体実行
npm run mcp:debug:ocr

# 標準MCPサーバーのテスト
npx @eslint/mcp@latest --help
npx -y @modelcontextprotocol/server-github --help
```

## アーキテクチャ

```
AAM Accounting System
├── 実存MCPサーバー
│   ├── ESLint MCP (コード品質)
│   ├── Filesystem MCP (ファイル操作)
│   ├── Git MCP (バージョン管理)
│   ├── GitHub MCP (PR/Issue)
│   └── Node.js Debugger MCP
│
├── カスタムMCPサーバー
│   ├── AAM Debug Coordinator
│   └── OCR Agent Monitor
│
└── Mastraエージェント
    ├── 実装済み
    │   └── DeploymentAgent
    ├── スタブ
    │   └── ProblemSolvingAgent
    └── バックアップ（要統合）
        ├── AccountingAgent
        ├── JapanTaxAgent
        └── その他
```

## 現在の課題と推奨事項

### 即座に対応すべき事項
1. **OCRProcessorエージェントの実装**
   - 既存のOCR機能をMastraエージェントとして統合
   - Azure/GAS OCRの統一インターフェース

2. **バックアップエージェントの復元**
   - AccountingAgentとJapanTaxAgentを優先的に復元
   - mastra.config.tsの参照を修正

3. **エラーログ集約システム**
   - 全エージェントのエラーを一元管理
   - リアルタイム通知機能

### 中期的な改善事項
1. **エージェント間メッセージング**
   - イベント駆動アーキテクチャの実装
   - 非同期処理の最適化

2. **パフォーマンスメトリクス**
   - Prometheusベースの監視
   - Grafanaダッシュボード

3. **CI/CD統合**
   - エージェントテストの自動化
   - デプロイメントパイプライン

## トラブルシューティング

### MCPサーバーが起動しない場合
1. Node.jsバージョンを確認（v18以上必要）
2. 環境変数が正しく設定されているか確認
3. `npm run mcp:debug:install`を再実行

### Claude Desktopで認識されない場合
1. Claude Desktopを再起動
2. `.vscode/mcp.json`のパスが正しいか確認
3. コマンドのシンタックスを確認

### エラーログの確認
```bash
# デバッグモードで実行
DEBUG=* npm run mcp:debug:coordinator
```

## 貢献ガイドライン

1. 新しいMCPサーバーを追加する場合は、`src/debug/mcp-servers/`に配置
2. `.vscode/mcp.json`に設定を追加
3. READMEに使用方法を記載
4. テストを作成して動作確認

## ライセンス

このデバッグシステムはAAM Accountingシステムの一部として提供されています。