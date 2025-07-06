# Claude Desktop MCP設定 最終版

## 設定ファイルの場所
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## 1. 設定ファイルを開く

```bash
# Macの場合
open ~/Library/Application\ Support/Claude/
```

## 2. 設定内容

以下の内容で `claude_desktop_config.json` を作成または更新：

```json
{
  "mcpServers": {
    "gas": {
      "command": "node",
      "args": [
        "/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server/dist/index.js"
      ],
      "env": {
        "GOOGLE_CREDENTIALS_PATH": "/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server/oauth-config.json"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_PAT_HERE"
      }
    }
  }
}
```

## 3. 必要な置き換え

- `YOUR_SUPABASE_PAT_HERE`: Supabaseダッシュボードで取得したPersonal Access Token

## 4. Claude Desktopを再起動

1. Claude Desktopを完全に終了
2. 再度起動

## 5. 接続確認

Claude Desktopで以下を確認：
- 左下のMCPアイコンが表示される
- クリックすると `gas` と `supabase` が接続済みと表示される

## トラブルシューティング

### GAS MCPが接続できない場合
```bash
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation/gas-mcp-server
npm start
```
初回認証を完了してから再起動

### Supabase MCPが接続できない場合
- Personal Access Tokenが正しいか確認
- トークンに適切な権限があるか確認