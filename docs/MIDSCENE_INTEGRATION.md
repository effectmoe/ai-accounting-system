# Midscene.js 統合ガイド

## Midscene.jsとは

Midscene.jsは、AIを活用したブラウザ自動化ライブラリです。Puppeteer、Playwright、Androidと統合して、自然言語でブラウザを操作できます。

**重要**: Midscene.jsは独自のAPIキーは不要ですが、バックエンドで使用するAIサービス（OpenAI、Anthropic、DeepSeekなど）のAPIキーが必要です。

## 特徴

1. **自然言語コマンド**
   ```javascript
   await agent.ai('検索ボックスに「会計ソフト」と入力して検索ボタンをクリック');
   ```

2. **AIベースのデータ抽出**
   ```javascript
   const price = await agent.aiQuery('この商品の価格を教えて');
   ```

3. **複数のブラウザエンジン対応**
   - Puppeteer
   - Playwright
   - Android (Appium)

## 現在の実装状況

問題解決専門エージェントでは、Midscene.jsの機能を以下のツールとして実装しています：

### 1. midsceneAutomation
- AIコマンドによるブラウザ操作
- スクリーンショット取得
- データ抽出

### 2. midsceneQuery
- AIを使用したWebページからのデータ抽出
- 価格、リスト、テキストなどの構造化データ取得

## 使用方法

### ブラウザ自動化
```typescript
const result = await problemSolvingAgent.tools.midsceneAutomation.execute({
  url: 'https://example.com',
  aiCommand: '商品一覧から最も安い商品を見つけてクリック',
  mode: 'playwright',
  screenshot: true,
  extractData: true
});
```

### データ抽出
```typescript
const data = await problemSolvingAgent.tools.midsceneQuery.execute({
  query: 'このページの全ての商品価格をリストで取得',
  url: 'https://example.com/products',
  format: 'json'
});
```

## 必要な設定

1. **AIプロバイダーの設定**
   - 既に設定済みの`DEEPSEEK_API_KEY`を使用
   - または`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`など

2. **ブラウザドライバー**
   - Puppeteer: 自動インストール
   - Playwright: `npx playwright install`

## 今後の拡張

実際にMidscene.jsを完全統合する場合：

1. **npmパッケージのインストール**
   ```bash
   npm install @midscene/web @midscene/puppeteer
   ```

2. **実装の更新**
   ```typescript
   import { MidsceneAgent } from '@midscene/web';
   
   const agent = new MidsceneAgent({
     aiProvider: 'deepseek',
     apiKey: process.env.DEEPSEEK_API_KEY
   });
   ```

3. **高度な機能の追加**
   - 自動テストスクリプト生成
   - ビジュアルアサーション
   - マルチステップワークフロー

## 現在利用可能な機能

MidsceneのAPIキーなしでも、以下の機能が利用可能です：

- ✅ **Perplexity**: 高度な検索
- ✅ **DeepSeek**: 段階的問題解決
- ✅ **Firecrawl**: Webスクレイピング
- ✅ **DataForSEO**: SEO分析
- ✅ **Playwright**: ブラウザ自動化（直接統合）
- ✅ **Filesystem**: ファイル操作

これらの組み合わせで、Midscene.jsと同等の機能を実現できます。