# Mastra Accounting Automation Integration Tests

## 概要

このディレクトリには、Mastra会計自動化システムの統合テストが含まれています。

## テストの種類

### 1. ヘルスチェックテスト
- オーケストレーターの状態確認
- 全エージェントの起動確認
- API設定の検証

### 2. 個別エージェントテスト
- OCRエージェント
- 会計エージェント
- データベースエージェント
- 顧客管理エージェント
- 商品管理エージェント
- 日本税務エージェント
- UIエージェント
- NLWebエージェント

### 3. 完全ワークフローテスト
- 領収書処理の全工程
- OCR → 会計分析 → 税務計算 → DB保存
- オプション: GitHub→Vercelデプロイ

### 4. エラーハンドリングテスト
- 無効なファイルパス
- 不正な操作
- 必須パラメータの欠落

## セットアップ

### 1. 環境変数の設定

```bash
# .env.testをコピーして編集
cp .env.test .env
```

最低限必要な設定:
- `DEEPSEEK_API_KEY`: DeepSeek APIキー（必須）

オプション設定:
- `SUPABASE_*`: データベーステスト用
- `GOOGLE_APPLICATION_CREDENTIALS`: 実際のOCR処理用
- `GITHUB_TOKEN`, `VERCEL_TOKEN`: デプロイメントテスト用

### 2. 依存関係のインストール

```bash
npm install
```

## テストの実行

### 基本的な統合テスト（デプロイなし）

```bash
npm run test:integration
```

### デプロイメントを含む完全テスト

```bash
npm run test:integration:deploy
```

### 個別テストの実行

```typescript
// integration-test.ts内の特定の関数を直接実行
tsx tests/integration-test.ts
```

## テスト結果の見方

テストは以下の形式で結果を表示します:

```
🚀 Starting Mastra Accounting Automation Integration Tests
============================================================

📍 Health Check Test
✅ Orchestrator is healthy
✅ DeepSeek API is configured
...

📍 Individual Agent Tests
ℹ️  Testing OCR Agent...
✅ OCR Agent: Operational
...

📍 Complete Workflow Test
✅ Workflow completed successfully
✓ OCR processing completed
✓ Accounting analysis completed
...

============================================================
📊 Integration Test Summary
============================================================

Test Suites:
  healthCheck: PASSED
  individualAgents: PASSED
  completeWorkflow: PASSED
  errorHandling: PASSED

Overall: 4/4 test suites passed
Duration: 12.34 seconds

🎉 All integration tests passed!
```

## トラブルシューティング

### "DeepSeek API key is missing"
→ `.env`ファイルに`DEEPSEEK_API_KEY`を設定してください

### "MCP Server exited with code 1"
→ MCPサーバーの起動に失敗しています。依存関係を確認してください

### "Workflow test failed"
→ 個別のエージェントテストを確認し、どのコンポーネントが失敗しているか特定してください

### タイムアウトエラー
→ `TEST_CONFIG.testTimeout`の値を増やすか、ネットワーク接続を確認してください

## カスタマイズ

### テスト設定の変更

`integration-test.ts`の`TEST_CONFIG`オブジェクトを編集:

```typescript
const TEST_CONFIG = {
  sampleReceiptPath: path.join(__dirname, 'fixtures/sample-receipt.jpg'),
  testTimeout: 60000, // タイムアウト時間（ミリ秒）
  deploymentTest: false, // デプロイメントテストの有効/無効
};
```

### 新しいテストケースの追加

1. 新しいテスト関数を作成
2. `runIntegrationTests`関数内で呼び出し
3. `testResults`オブジェクトに結果を追加

## CI/CD統合

GitHub Actionsでの実行例:

```yaml
- name: Run Integration Tests
  env:
    DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
    TEST_MODE: true
    SKIP_EXTERNAL_APIS: true
  run: npm run test:integration
```