# MCP（Model Context Protocol）統合ガイド

## 概要

AAM会計システムは、6つのMCPサーバーと統合され、Mastraエージェントの能力を大幅に拡張しています。

## 統合されたMCPサーバー

### 1. filesystem
- **機能**: ファイル・ディレクトリ操作
- **用途**: 領収書整理、バックアップ、レポート保存

### 2. github
- **機能**: GitHubリポジトリ管理
- **用途**: コードバックアップ、バージョン管理、Issue管理

### 3. mcp-gsearch (Brave Search)
- **機能**: Web検索・ニュース検索
- **用途**: 税制情報収集、最新情報調査

### 4. vercel-v0-mcp
- **機能**: Vercelデプロイメント管理
- **用途**: アプリケーションのデプロイ、環境変数管理

### 5. perplexity
- **機能**: AI駆動の高度な検索
- **用途**: 税法の詳細調査、複雑な問題の解決

### 6. playwright
- **機能**: ブラウザ自動化
- **用途**: e-Tax連携、Webスクレイピング、自動入力

## セットアップ

### 1. 環境変数の設定

```bash
# .env.localに以下を追加
GITHUB_TOKEN=your_github_personal_access_token
BRAVE_API_KEY=your_brave_search_api_key
VERCEL_TOKEN=your_vercel_api_token
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### 2. 依存関係のインストール

```bash
npm install
```

## 使用方法

### コマンドライン（kaikeiエイリアス）

```bash
# 領収書を整理
kaikei "領収書フォルダ /path/to/receipts を年月別に整理してください"

# 税制情報を調査
kaikei "インボイス制度について最新情報を調査してください"

# e-Taxから情報取得
kaikei-tax "e-Taxから最新の税率情報を取得してください"
```

### APIエンドポイント

```bash
# MCPツールのデモ
curl -X POST http://localhost:3000/api/mastra/demo/mcp-tools \
  -H "Content-Type: application/json" \
  -d '{
    "demo_type": "search_tax_info",
    "params": {
      "topic": "電子帳簿保存法",
      "save_directory": "/tmp"
    }
  }'
```

### プログラムから

```typescript
import { mastra } from '@/src/mastra';

// 会計エージェントで領収書整理
const result = await mastra.agents.accountingAgent.execute({
  prompt: `organize_receipts ツールを使用して、
  /Documents/receipts フォルダの領収書を年月別に整理してください`
});
```

## 高度なMCPツール

### 会計エージェント専用

1. **organize_receipts**
   - 領収書ファイルを日付で自動整理
   - 年月別フォルダを自動作成

2. **search_and_save_tax_info**
   - 税制情報をWeb検索
   - Perplexityで詳細分析
   - レポートとして保存

3. **backup_accounting_documents**
   - 会計書類をGitHubにバックアップ
   - 日付別に整理して保存

### 税務エージェント専用

1. **scrape_etax_info**
   - e-Taxサイトから情報取得
   - スクリーンショット保存可能

2. **research_tax_law**
   - 税法の詳細調査
   - 具体的な質問に対する回答取得

3. **auto_fill_tax_form**
   - 税務申告フォームへの自動入力
   - 送信前の確認スクリーンショット

## テスト方法

```bash
# MCPツールのテスト
npm run test:mcp-tools

# 実際のAPI呼び出しテスト（要環境変数）
TEST_MCP_TOOLS=true npm run test:mcp-tools
```

## トラブルシューティング

### MCPサーバーが接続できない場合

1. 環境変数を確認
2. `~/.config/claude/claude_desktop_config.json`の設定を確認
3. MCPサーバーがインストールされているか確認

### ツールが実行できない場合

1. エージェントにツールが登録されているか確認
2. 必要な権限があるか確認
3. ログを確認: `tail -f logs/mastra.log`

## 今後の拡張予定

- 銀行API連携MCPサーバー
- 会計ソフト連携MCPサーバー
- カスタムMCPサーバーの作成