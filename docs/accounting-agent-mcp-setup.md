# 会計エージェント MCPサーバー設定ガイド

## 必要なMCPサーバー一覧

### 1. NLWeb MCP Server（実装済み）
- **パス**: `./docs/nlweb-mcp-server.ts`
- **用途**: 動的な税制判断、勘定科目の自動判定
- **設定済み**: ✅

### 2. Perplexity MCP Server
- **リポジトリ**: https://github.com/modelcontextprotocol/servers/tree/main/src/perplexity
- **用途**: リアルタイムの税制情報取得、最新の会計基準確認
- **インストール**:
  ```bash
  npm install -g @modelcontextprotocol/server-perplexity
  ```

### 3. Supabase MCP Server
- **リポジトリ**: https://github.com/kevinswiber/mcp-server-supabase
- **用途**: 仕訳データの保存、会計データの永続化
- **インストール**:
  ```bash
  npm install -g mcp-server-supabase
  ```

### 4. Google Sheets MCP Server
- **リポジトリ**: https://github.com/xing5/mcp-google-sheets
- **用途**: 会計レポートのスプレッドシート出力
- **インストール**:
  ```bash
  git clone https://github.com/xing5/mcp-google-sheets
  cd mcp-google-sheets
  npm install
  npm run build
  ```

### 5. Excel MCP Server
- **リポジトリ**: https://github.com/negokaz/excel-mcp-server
- **用途**: Excel形式での会計レポート出力
- **インストール**:
  ```bash
  git clone https://github.com/negokaz/excel-mcp-server
  cd excel-mcp-server
  npm install
  npm run build
  ```

## Claude Desktop設定（mcp-config.json）

```json
{
  "mcpServers": {
    "nlweb": {
      "command": "node",
      "args": ["./docs/nlweb-mcp-server.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    },
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-perplexity"],
      "env": {
        "PERPLEXITY_API_KEY": "your-perplexity-api-key"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "mcp-server-supabase",
        "--supabase-url", "https://clqpfmroqcnvyxdzadln.supabase.co",
        "--supabase-api-key", "your-supabase-key"
      ]
    },
    "google-sheets": {
      "command": "node",
      "args": ["/path/to/mcp-google-sheets/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth/callback"
      }
    },
    "excel": {
      "command": "node",
      "args": ["/path/to/excel-mcp-server/dist/index.js"]
    }
  }
}
```

## 環境変数設定

```bash
# .env
# NLWeb
SUPABASE_URL=https://clqpfmroqcnvyxdzadln.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Perplexity
PERPLEXITY_API_KEY=your-perplexity-api-key

# Google Sheets
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# DeepSeek（Mastra用）
DEEPSEEK_API_KEY=your-deepseek-api-key
```

## 初回認証手順

### Google Sheets MCP
1. MCPサーバー起動時にブラウザが開く
2. Googleアカウントでログイン
3. スプレッドシートへのアクセスを許可
4. 認証完了後、トークンが自動保存

### Perplexity MCP
- APIキーのみで動作（認証不要）

### Excel MCP
- ローカルファイルシステムアクセスのみ（認証不要）

## 動作確認

```typescript
// 会計エージェントのテスト
import { accountingAgent } from './docs/accounting-agent';

// 自然言語から仕訳作成
const result = await accountingAgent.execute({
  input: {
    naturalLanguageInput: "タクシー代3,500円を現金で支払った",
    processType: 'journal_entry'
  }
});

// Google Sheetsへレポート出力
const report = await accountingAgent.execute({
  input: {
    processType: 'report_generation',
    reportOptions: {
      type: 'trial_balance',
      period: {
        startDate: '2025-07-01',
        endDate: '2025-07-31'
      },
      format: 'google_sheets'
    }
  }
});
```

## トラブルシューティング

### MCPサーバーが見つからない
```bash
# Claude Desktopを再起動
# または設定ファイルのパスを確認
```

### 認証エラー
- 環境変数が正しく設定されているか確認
- Google OAuthの場合、リダイレクトURIが一致しているか確認

### データベース接続エラー
- Supabase URLとAPIキーを確認
- ネットワーク接続を確認