# UI生成MCPサーバー設定ガイド

## 利用可能なUI生成サービス

### 1. Lovable (旧GPT Engineer)
- **URL**: https://lovable.dev/
- **特徴**: 
  - フルスタックアプリケーションの生成
  - Supabase統合済み
  - リアルタイムプレビュー
  - 日本語対応

### 2. v0.dev (Vercel)
- **URL**: https://v0.dev/
- **特徴**:
  - Next.js/React特化
  - Tailwind CSS対応
  - Shadcn/ui統合
  - コンポーネント単位の生成

### 3. Cline (Claude Engineer)
- **URL**: https://github.com/cline/cline
- **特徴**:
  - VSCode拡張機能
  - ローカルファイル編集
  - AIペアプログラミング

## MCPサーバー設定

### Claude Desktop設定 (mcp-config.json)

```json
{
  "mcpServers": {
    "lovable": {
      "command": "npx",
      "args": ["@lovable/mcp-server"],
      "env": {
        "LOVABLE_API_KEY": "your-lovable-api-key"
      }
    },
    "v0": {
      "command": "npx",
      "args": ["@vercel/v0-mcp-server"],
      "env": {
        "V0_API_KEY": "your-v0-api-key",
        "VERCEL_TOKEN": "your-vercel-token"
      }
    },
    "cline": {
      "command": "node",
      "args": ["/path/to/cline-mcp-server/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-anthropic-api-key"
      }
    }
  }
}
```

## UI生成ワークフロー

### 1. 会計ダッシュボードの生成例

```typescript
// UIエージェントを使用したダッシュボード生成
const dashboard = await uiAgent.execute({
  input: {
    operation: 'create_dashboard',
    dashboardRequest: {
      title: '会計ダッシュボード',
      metrics: [
        {
          name: '今月の売上',
          type: 'number',
          dataSource: 'journal_entries',
          refreshInterval: 30000,
        },
        {
          name: '経費内訳',
          type: 'chart',
          dataSource: 'expense_breakdown',
        },
        {
          name: '請求書一覧',
          type: 'table',
          dataSource: 'invoices',
        },
      ],
      layout: 'grid',
    },
  },
});
```

### 2. レシートアップロードコンポーネント

```typescript
const receiptUploader = await uiAgent.execute({
  input: {
    operation: 'generate_component',
    componentRequest: {
      description: `
        領収書アップロードコンポーネント:
        - ドラッグ&ドロップ対応
        - 複数ファイル同時アップロード
        - 画像プレビュー機能
        - アップロード進捗表示
        - OCR処理状態の表示
      `,
      components: [{
        type: 'component',
        name: 'ReceiptUploader',
        framework: 'nextjs',
        styling: 'tailwind',
      }],
    },
  },
});
```

### 3. 仕訳入力フォーム

```typescript
const journalEntryForm = await uiAgent.execute({
  input: {
    operation: 'generate_component',
    componentRequest: {
      description: `
        複式簿記の仕訳入力フォーム:
        - 借方/貸方の入力フィールド
        - 勘定科目の自動補完
        - 金額の自動バランスチェック
        - 消費税の自動計算
        - 入力履歴からのテンプレート
      `,
      dataSchema: {
        date: 'string',
        debit: { account: 'string', amount: 'number' },
        credit: { account: 'string', amount: 'number' },
        description: 'string',
        taxRate: 'number',
      },
    },
  },
});
```

## 各サービスの使い分け

### Lovable を使う場合
- フルスタックアプリケーション全体を生成したい
- Supabaseとの統合が必要
- 認証機能やリアルタイム機能が必要
- プロトタイプを素早く作りたい

### v0.dev を使う場合
- Next.js/Reactコンポーネントを生成したい
- Vercelへのデプロイを前提としている
- Shadcn/uiのコンポーネントを使いたい
- 細かいコンポーネント単位で作業したい

### Cline を使う場合
- 既存のコードベースを修正したい
- ローカル環境で作業したい
- AIとペアプログラミングしたい
- VSCodeを使用している

## 実装時の注意点

### 1. APIキーの管理
```bash
# .env.local
LOVABLE_API_KEY=xxx
V0_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
```

### 2. 生成されたコードの調整
- TypeScriptの型定義を確認
- 日本語UIの文言を調整
- アクセシビリティの確認
- レスポンシブデザインのテスト

### 3. スタイリングの統一
```typescript
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

## トラブルシューティング

### MCPサーバーが起動しない
1. APIキーが正しく設定されているか確認
2. npmパッケージがインストールされているか確認
3. Claude Desktopを再起動

### 生成されたコードが動かない
1. 依存関係をインストール
   ```bash
   npm install
   ```
2. TypeScriptエラーを修正
3. 環境変数を設定

### スタイルが適用されない
1. Tailwind CSSの設定を確認
2. CSSモジュールのインポートを確認
3. グローバルCSSファイルを確認