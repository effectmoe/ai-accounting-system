# Mastra Cloud デプロイメント情報

## デプロイメント概要
Mastra Cloudへのデプロイメントを準備し、GitHub連携による自動デプロイを設定しました。

## 実装内容

### 1. ディレクトリ構造
Mastra Cloudが要求する構造に従って配置：
```
src/mastra/
├── agents/       # 11個のMastraエージェント
├── tools/        # エージェントツール実装
├── workflows/    # 4つのワークフロー
└── index.ts      # Mastraインスタンス定義
```

### 2. 実装済みエージェント（11個）
1. **accountingAgent** - 会計処理エージェント（6つのツール実装済み）
2. **customerAgent** - 顧客管理エージェント（6つのツール実装済み）
3. **databaseAgent** - データベース管理エージェント
4. **deploymentAgent** - デプロイメント管理エージェント
5. **japanTaxAgent** - 日本税制対応エージェント
6. **ocrAgent** - OCR処理エージェント
7. **problemSolvingAgent** - 問題解決エージェント
8. **productAgent** - 商品管理エージェント
9. **refactorAgent** - リファクタリングエージェント
10. **uiAgent** - UI操作エージェント
11. **constructionAgent** - 建設業会計エージェント

### 3. 実装済みワークフロー（4個）
1. **accountingWorkflow** - 会計処理ワークフロー
2. **complianceWorkflow** - コンプライアンスチェック
3. **invoiceProcessingWorkflow** - 請求書処理
4. **deploymentWorkflow** - デプロイメント自動化

### 4. GitHub連携設定
- リポジトリ: https://github.com/effectmoe/ai-accounting-system
- ブランチ: main
- 自動デプロイ: プッシュ時に自動トリガー

## Mastra Cloudコンソールでの確認手順

1. **Mastra Cloudにアクセス**
   - URL: https://cloud.mastra.ai
   - アカウント: EFFECT's Team

2. **プロジェクトの確認**
   - プロジェクト名: `accounting-automation`
   - GitHub連携: `effectmoe/ai-accounting-system`

3. **デプロイメントステータス確認**
   - Deploymentsタブで最新のデプロイメントを確認
   - ログで成功/失敗を確認

4. **環境変数の設定**
   必要に応じて以下を設定：
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `MONGODB_URI`
   - `AZURE_FORM_RECOGNIZER_ENDPOINT`
   - `AZURE_FORM_RECOGNIZER_KEY`

## 現在の状態
- ✅ Vercelデプロイメント: https://accounting-automation.vercel.app
- 🔄 Mastra Cloudデプロイメント: GitHub連携によりデプロイ中

## 次のステップ
1. Mastra Cloudコンソールでデプロイメント状態を確認
2. エラーがある場合はログを確認して修正
3. 成功したらエンドポイントURLを記録
4. APIテストを実施

## トラブルシューティング
- **Readiness probe failed**: HTTPサーバーが適切に起動していない
- **No deployer found**: Mastra v0.10.15のdeployコマンドは非推奨
- **Module not found**: ビルド設定の問題

---
更新日: 2025-07-26