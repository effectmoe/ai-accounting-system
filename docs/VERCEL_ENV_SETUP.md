# Vercel環境変数設定ガイド

## 概要

問題解決専門エージェントを本番環境で動作させるために、Vercelで環境変数を設定する手順を説明します。

## 必要なAPIキー

### 1. DeepSeek API Key
- **取得先**: https://www.deepseek.com/
- **用途**: Sequential Thinkingによる段階的問題解決
- **環境変数名**: `DEEPSEEK_API_KEY`

### 2. Perplexity API Key
- **取得先**: https://www.perplexity.ai/api
- **用途**: 高度な検索と分析
- **環境変数名**: `PERPLEXITY_API_KEY`

### 3. Firecrawl API Key
- **取得先**: https://www.firecrawl.dev/
- **用途**: Webスクレイピングとデータ抽出
- **環境変数名**: `FIRECRAWL_API_KEY`

### 4. DataForSEO API Key
- **取得先**: https://dataforseo.com/
- **用途**: SEO分析と競合調査
- **環境変数名**: `DATAFORSEO_API_KEY`

### 5. Midscene API Key
- **取得先**: https://midscene.ai/
- **用途**: ビジュアル解析
- **環境変数名**: `MIDSCENE_API_KEY`

### 6. Midscene Chrome Extension ID (オプション)
- **取得方法**: Chrome拡張機能インストール後、拡張機能管理画面で確認
- **用途**: Chrome拡張機能との連携
- **環境変数名**: `MIDSCENE_CHROME_EXTENSION_ID`

## Vercelでの設定手順

### ステップ1: Vercelダッシュボードにアクセス
1. https://vercel.com にログイン
2. `accounting-automation` プロジェクトを選択

### ステップ2: 環境変数の設定
1. プロジェクトダッシュボードで「Settings」タブをクリック
2. 左側メニューから「Environment Variables」を選択
3. 以下の環境変数を追加：

```bash
# DeepSeek AI
DEEPSEEK_API_KEY=[取得したAPIキー]

# Perplexity
PERPLEXITY_API_KEY=[取得したAPIキー]

# Firecrawl
FIRECRAWL_API_KEY=[取得したAPIキー]

# DataForSEO
DATAFORSEO_API_KEY=[取得したAPIキー]

# Midscene
MIDSCENE_API_KEY=[取得したAPIキー]
MIDSCENE_CHROME_EXTENSION_ID=[拡張機能ID（オプション）]

# NLWeb (既存の場合は更新)
NLWEB_API_KEY=[取得したAPIキー]
NLWEB_SITE_URL=[NLWebサイトのURL]

# GitHub (既存の場合は更新)
GITHUB_TOKEN=[GitHubトークン]
```

### ステップ3: 環境変数の適用
1. 各環境変数で以下の環境を選択：
   - ✅ Production
   - ✅ Preview
   - ✅ Development

2. 「Save」ボタンをクリック

### ステップ4: デプロイの再実行
1. 「Deployments」タブに移動
2. 最新のデプロイメントの「...」メニューから「Redeploy」を選択
3. 「Use existing Build Cache」のチェックを外す
4. 「Redeploy」ボタンをクリック

## 環境変数の確認

デプロイ後、以下のエンドポイントで環境変数の設定状況を確認できます：

```bash
curl https://accounting-automation.vercel.app/api/problem-solver
```

レスポンス例：
```json
{
  "success": true,
  "status": {
    "available": true,
    "mcpServers": [
      { "name": "perplexity", "status": "active", "description": "高度な検索と分析" },
      { "name": "sequential-thinking", "status": "active", "description": "段階的問題解決" },
      // ...
    ]
  }
}
```

## セキュリティに関する注意事項

1. **APIキーの管理**
   - APIキーは絶対にコードにハードコーディングしない
   - GitHubにコミットしない
   - 定期的にAPIキーをローテーションする

2. **アクセス制限**
   - 各APIサービスでIPアドレス制限を設定することを推奨
   - 使用量の上限を設定してコストを管理

3. **環境変数のスコープ**
   - 本番環境とステージング環境で異なるAPIキーを使用
   - 開発環境ではモックやサンドボックスAPIを使用

## トラブルシューティング

### APIキーが認識されない場合
1. Vercelのデプロイログを確認
2. 環境変数名が正確に一致しているか確認
3. デプロイの再実行（キャッシュなし）

### 特定のMCPサーバーが動作しない場合
1. 該当するAPIサービスのダッシュボードでAPIキーの状態を確認
2. 使用量制限に達していないか確認
3. APIサービスのステータスページで障害情報を確認

## 無料プランでのテスト

多くのサービスで無料プランや試用版が提供されています：

- **Perplexity**: 無料トライアルあり
- **Firecrawl**: 無料プランあり（月500ページまで）
- **DataForSEO**: 無料トライアルあり
- **Midscene**: 無料プランあり

本番運用前に無料プランでテストすることをお勧めします。