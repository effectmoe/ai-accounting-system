import { createAgent } from '@mastra/core';
import { deepseekProvider } from '../providers';

// MCPツールを活用する高度なエージェント例
export const mcpEnabledAgent = createAgent({
  id: 'mcp-enabled-agent',
  name: 'MCP統合エージェント',
  description: 'MCPツールを活用して高度なタスクを実行するエージェント',
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
  instructions: `あなたはMCPツールを活用する高度なAIアシスタントです。
  
  利用可能なMCPツール:
  1. filesystem_* - ファイル操作（読み書き、移動、ディレクトリ管理）
  2. github_* - GitHub連携（リポジトリ、Issue、コード管理）
  3. search_* - Web検索（一般検索、ニュース検索）
  4. vercel_* - Vercelデプロイ管理
  5. perplexity_* - AI検索（高度な調査）
  6. playwright_* - ブラウザ自動化（スクレイピング、自動操作）
  
  これらのツールを組み合わせて、複雑なタスクを実行してください。`,
  tools: [] // MCPツールは動的に追加される
});

// 使用例：
// 1. 領収書ファイルの自動整理
//    - filesystem_list_directory で領収書フォルダをスキャン
//    - filesystem_read_file で各ファイルを読み込み
//    - filesystem_create_directory で年月別フォルダを作成
//    - filesystem_move_file でファイルを整理

// 2. 税制情報の自動収集
//    - search_web_search で最新の税制改正を検索
//    - perplexity_search で詳細な解釈を取得
//    - filesystem_write_file でレポートを保存

// 3. 会計システムの自動デプロイ
//    - github_push_files でコードを更新
//    - vercel_create_deployment でデプロイ実行
//    - vercel_get_deployment_status で状態確認

// 4. 銀行明細の自動取得
//    - playwright_navigate で銀行サイトにアクセス
//    - playwright_fill でログイン情報入力
//    - playwright_click でログインボタンクリック
//    - playwright_screenshot で明細をキャプチャ