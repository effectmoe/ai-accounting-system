# Supabase Personal Access Token (PAT) 取得手順

## 手動で行っていただく必要がある作業

### 1. Supabaseダッシュボードにログイン

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. あなたのアカウントでログイン

### 2. Personal Access Tokenの作成

1. 右上のアカウントアイコンをクリック
2. 「Account Settings」を選択
3. 左メニューから「Access Tokens」を選択
4. 「Generate new token」をクリック
5. トークン名: `MCP Server Token`
6. 「Generate token」をクリック
7. **表示されたトークンをコピー**（この画面を閉じると二度と表示されません）

### 3. プロジェクト参照IDの確認

1. Supabaseダッシュボードでプロジェクトを開く
2. URLから参照IDを確認：
   ```
   https://supabase.com/dashboard/project/[この部分がプロジェクト参照ID]
   ```
   
   現在のプロジェクト参照ID: `clqpfmroqcnvyxdzadln`

### 4. 取得した情報

以下の情報をメモしてください：

- **Personal Access Token**: （コピーしたトークン）
- **Project Reference ID**: `clqpfmroqcnvyxdzadln`

これらの情報は、Claude Desktop設定で使用します。