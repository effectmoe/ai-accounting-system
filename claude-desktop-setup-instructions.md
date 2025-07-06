# Claude Desktop MCP設定手順

## 手動で行っていただく必要がある作業

### 1. 必要な認証情報の準備

以下の情報を準備してください：

1. **Google Apps Script MCP**
   - `oauth-config.json`を設定済みであること
   - 初回認証を完了していること

2. **Google Drive MCP**
   - CLIENT_ID（OAuth認証情報から）
   - CLIENT_SECRET（OAuth認証情報から）

3. **Supabase MCP**
   - Personal Access Token（Supabaseダッシュボードから取得）

### 2. Claude Desktop設定ファイルの更新

1. 以下のファイルを開く：
   ```
   /Users/tonychustudio/.claude_desktop_config.json
   ```

2. `claude-desktop-config-template.json`の内容をコピーして、以下を置き換え：
   - `YOUR_GDRIVE_CLIENT_ID_HERE` → Google DriveのクライアントID
   - `YOUR_GDRIVE_CLIENT_SECRET_HERE` → Google Driveのクライアントシークレット
   - `YOUR_SUPABASE_PAT_HERE` → SupabaseのPersonal Access Token

### 3. Claude Desktopの再起動

1. Claude Desktopを完全に終了（Cmd+Q）
2. 再度起動

### 4. 接続確認

Claude Desktopで以下のコマンドを試してください：

**GAS MCP**:
```
Google Apps Scriptで新しいプロジェクトを作成して
```

**Google Drive MCP**:
```
Google Driveのファイルを検索して
```

**Supabase MCP**:
```
Supabaseのcompaniesテーブルのデータを表示して
```

## トラブルシューティング

### MCPサーバーが表示されない場合

1. 設定ファイルのJSON構文を確認
2. パスが正しいか確認
3. Claude Desktopのログを確認：
   - Help → Toggle Developer Tools → Console

### 認証エラーの場合

各MCPサーバーの`oauth-setup-instructions.md`を参照して、認証を再実行してください。