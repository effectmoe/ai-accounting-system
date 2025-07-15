# 環境変数クイックセットアップガイド

## 🚀 自動セットアップ（推奨）

問題解決専門エージェント用の環境変数をVercelに自動設定するツールを用意しました。

### 前提条件

1. Vercel CLIがインストールされていること
   ```bash
   npm i -g vercel
   ```

2. Vercelアカウントにログインしていること
   ```bash
   vercel login
   ```

### セットアップ実行

```bash
npm run setup:vercel-env
```

### 実行フロー

1. **プロジェクトリンク確認**
   - Vercelプロジェクトにリンクされていない場合は自動でリンク

2. **APIキー入力**
   - 各APIキーの説明と例が表示されます
   - 必須項目と任意項目が明示されます
   - 空欄でEnterを押すとスキップできます

3. **確認と設定**
   - 入力した環境変数の一覧が表示されます
   - 確認後、Vercelに自動設定されます

4. **ローカル環境設定（オプション）**
   - `.env.local`ファイルの自動生成も可能

## 📝 必要なAPIキー一覧

### 必須項目

1. **DEEPSEEK_API_KEY**
   - 取得先: https://www.deepseek.com/
   - 用途: Sequential Thinking（段階的問題解決）

2. **PERPLEXITY_API_KEY**
   - 取得先: https://www.perplexity.ai/api
   - 用途: 高度な検索と分析

3. **FIRECRAWL_API_KEY**
   - 取得先: https://www.firecrawl.dev/
   - 用途: Webスクレイピング

4. **DATAFORSEO_API_KEY**
   - 取得先: https://dataforseo.com/
   - 形式: `email:password`をBase64エンコード
   - 用途: SEO分析と競合調査

5. **MIDSCENE_API_KEY**
   - 取得先: https://midscene.ai/
   - 用途: ビジュアル解析

### 任意項目

6. **MIDSCENE_CHROME_EXTENSION_ID**
   - Chrome拡張機能管理画面で確認
   - 用途: Chrome拡張機能連携

7. **NLWEB_API_KEY** / **NLWEB_SITE_URL**
   - 既存のNLWebシステムとの連携用

8. **GITHUB_TOKEN**
   - GitHub設定から取得
   - 用途: 自動デプロイ

## 🔍 設定確認

### Vercelダッシュボードで確認
1. https://vercel.com にアクセス
2. プロジェクトを選択
3. Settings → Environment Variables

### APIエンドポイントで確認
```bash
curl https://accounting-automation.vercel.app/api/problem-solver
```

## ⚡ トラブルシューティング

### Vercel CLIエラー
```bash
# Vercel CLIの再インストール
npm uninstall -g vercel
npm install -g vercel@latest
vercel login
```

### 環境変数が反映されない
1. Vercelダッシュボードで再デプロイ
2. 「Redeploy」→「Use existing Build Cache」のチェックを外す

### APIキーエラー
- 各APIサービスのダッシュボードでキーの有効性を確認
- 使用量制限に達していないか確認

## 📌 次のステップ

1. **動作確認**
   ```
   https://accounting-automation.vercel.app/mastra-admin
   ```
   問題解決専門エージェントセクションで動作確認

2. **使用量モニタリング**
   - 各APIサービスのダッシュボードで使用量を確認
   - 必要に応じて有料プランへアップグレード

3. **本番運用準備**
   - IPアドレス制限の設定
   - APIキーのローテーション計画
   - アラート設定