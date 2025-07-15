# 問題解決専門エージェント (Problem Solving Agent)

## 概要

問題解決専門エージェントは、7つのMCPサーバーを統合して複雑な問題を解決する高度なAIエージェントです。Web検索、ビジュアル解析、データ収集、ブラウザ自動化など、多様な機能を組み合わせて総合的な問題解決を実現します。

## 統合されたMCPサーバー

### 1. Perplexity MCP
- **機能**: 高度な検索と分析
- **用途**: 最新情報の取得、学術的な調査、ニュース検索
- **設定**: `PERPLEXITY_API_KEY`

### 2. Sequential Thinking
- **機能**: 段階的な問題分解と解決
- **用途**: 複雑な問題を小さなステップに分解して解決
- **設定**: `DEEPSEEK_API_KEY`を使用

### 3. Midscene
- **機能**: ビジュアル解析とUI自動化
- **特徴**: Chrome拡張機能との連携対応
- **用途**: スクリーンショット分析、UI要素の検出、アクセシビリティチェック
- **設定**: 
  - `MIDSCENE_API_KEY`
  - `MIDSCENE_CHROME_EXTENSION_ID`

### 4. Firecrawl
- **機能**: Webスクレイピングとデータ抽出
- **用途**: Webサイトの構造化データ取得、複数ページのクロール
- **設定**: `FIRECRAWL_API_KEY`

### 5. DataForSEO
- **機能**: SEO分析と競合調査
- **用途**: キーワード分析、バックリンク調査、SERP分析
- **設定**: `DATAFORSEO_API_KEY`

### 6. Playwright
- **機能**: ブラウザ自動化とテスト
- **用途**: Webアプリケーションのテスト、フォーム入力の自動化
- **対応ブラウザ**: Chromium, Firefox, WebKit

### 7. Filesystem
- **機能**: ローカルファイルシステム操作
- **用途**: ファイルの読み書き、ディレクトリ管理
- **セキュリティ**: `/Users/tonychustudio/Documents/`配下のみアクセス可能

## 使用方法

### 基本的な問題解決

```typescript
// Mastra Orchestrator経由での使用
const result = await orchestrator.executeProblemSolvingWorkflow({
  problem: "競合他社のWebサイトを分析して、改善点を提案してください",
  domain: "https://example-competitor.com",
  requiresWebSearch: true,
  requiresDataAnalysis: true,
});
```

### 個別ツールの使用

```typescript
// Web検索
const searchResult = await problemSolvingAgent.tools.searchWithPerplexity.execute({
  query: "最新のAI会計システムのトレンド",
  searchDepth: "advanced",
  focus: "internet",
});

// ビジュアル分析（Chrome拡張機能連携）
const visualResult = await problemSolvingAgent.tools.visualAnalysis.execute({
  chromeExtension: {
    enabled: true,
    action: "analyze",
  },
  analysisType: "ui",
  extractText: true,
});

// SEO分析
const seoResult = await problemSolvingAgent.tools.seoAnalysis.execute({
  domain: "example.com",
  analysisType: "competitors",
  location: "Japan",
  language: "ja",
});
```

## Chrome拡張機能の設定

Midscene Chrome拡張機能を使用する場合：

1. Chrome拡張機能をインストール
2. 拡張機能IDを取得
3. 環境変数に設定: `MIDSCENE_CHROME_EXTENSION_ID=your_extension_id`
4. WebSocketポートの確認（デフォルト: 9222）

## セキュリティ考慮事項

- ファイルシステムアクセスは制限されたディレクトリのみ
- APIキーは環境変数で管理
- Chrome拡張機能との通信はWebSocket経由
- 外部APIへのアクセスは認証が必要

## トラブルシューティング

### APIキーエラー
```
Error: PERPLEXITY_API_KEY is not set
```
→ `.env`ファイルに必要なAPIキーを設定してください

### Chrome拡張機能の接続エラー
```
Error: Failed to connect to Chrome extension
```
→ 拡張機能がインストールされ、有効になっていることを確認してください

### ファイルアクセスエラー
```
Error: Access denied: Path must be within allowed directory
```
→ アクセス可能なディレクトリ内のファイルのみ操作できます