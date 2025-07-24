# Mastra Cloud プロジェクト登録用プロンプト

以下のプロンプトをClaude Desktopにコピーして実行してください：

---

## プロンプト

Mastra Cloudに新しいプロジェクトとエージェントを登録してください。以下の手順を正確に実行してください：

### 1. ブラウザ操作

```
1. Chromeで https://cloud.mastra.ai を開く
2. EFFECT's Teamアカウントでログイン済みであることを確認
3. ダッシュボードが表示されたら「Add new」ボタンをクリック
```

### 2. プロジェクト作成

以下の情報を正確に入力：
```
Project Name: accounting-automation
Description: AI-driven accounting automation system for Japanese tax compliance
Version: 1.0.0
Runtime: Node.js
Region: Asia Northeast 1 (Tokyo)
```

「Create Project」をクリックして作成

### 3. エージェント登録

プロジェクトが作成されたら、「Agents」タブをクリックして、以下の7個のエージェントを順番に登録：

#### エージェント1
```
Name: accounting-agent
Description: 会計処理・仕訳作成エージェント
File Path: ./src/agents/accounting-agent.ts
Tools: create_journal, process_transaction, create_invoice, generate_report
```

#### エージェント2
```
Name: customer-agent
Description: 顧客管理エージェント
File Path: ./src/agents/customer-agent.ts
Tools: create, update, delete, search, analyze
```

#### エージェント3
```
Name: database-agent
Description: データベース操作エージェント
File Path: ./src/agents/database-agent.ts
Tools: query, create, update, delete, backup
```

#### エージェント4
```
Name: japan-tax-agent
Description: 日本税制対応エージェント
File Path: ./src/agents/japan-tax-agent.ts
Tools: calculate_tax, validate_invoice, check_compliance, generate_tax_report
```

#### エージェント5
```
Name: ocr-agent
Description: OCR処理エージェント
File Path: ./src/agents/ocr-agent.ts
Tools: process_image, extract_invoice, extract_receipt, analyze_document
```

#### エージェント6
```
Name: product-agent
Description: 商品管理エージェント
File Path: ./src/agents/product-agent.ts
Tools: create, update, delete, search, analyze_inventory
```

#### エージェント7
```
Name: ui-agent
Description: UI操作エージェント
File Path: ./src/agents/ui-agent.ts
Tools: generate_form, create_dashboard, export_pdf, create_chart
```

### 4. ワークフロー登録

「Workflows」タブをクリックして、以下の3つのワークフローを登録：

#### ワークフロー1
```
Name: accounting-workflow
Description: 会計処理ワークフロー
File Path: ./src/workflows/accounting-workflow.ts
Agents Used: accounting-agent, database-agent, japan-tax-agent
```

#### ワークフロー2
```
Name: compliance-workflow
Description: コンプライアンスチェック
File Path: ./src/workflows/compliance-workflow.ts
Agents Used: japan-tax-agent, database-agent
```

#### ワークフロー3
```
Name: invoice-processing-workflow
Description: 請求書処理
File Path: ./src/workflows/invoice-processing-workflow.ts
Agents Used: ocr-agent, accounting-agent, database-agent
```

### 5. 環境変数設定

「Settings」→「Environment Variables」に移動して、以下の環境変数を追加：

```
MONGODB_URI=（MongoDBの接続文字列）
MONGODB_DB_NAME=accounting
OPENAI_API_KEY=（OpenAIのAPIキー）
ANTHROPIC_API_KEY=（AnthropicのAPIキー）
AZURE_FORM_RECOGNIZER_ENDPOINT=（AzureのエンドポイントURL）
AZURE_FORM_RECOGNIZER_KEY=（Azureのキー）
MASTRA_API_SECRET=（ランダムな文字列を生成）
NODE_ENV=production
MASTRA_API_PORT=3001
```

### 6. インテグレーション設定

「Integrations」タブで以下を設定：

- MongoDB: Enable
- OpenAI: Enable (GPT-4 Turbo)
- Anthropic: Enable (Claude 3 Opus)
- Azure: Enable (Form Recognizer)

### 7. デプロイ設定

「Deploy」タブで以下を設定：

```
Deployment Target: Vercel
Auto Deploy: Enable
Branch: main
Build Command: npm run build
Output Directory: .next
```

### 8. 最終確認

1. すべてのエージェントが「Active」ステータスになっていることを確認
2. プロジェクトURLをメモ：`https://accounting-automation.mastra.cloud`
3. API エンドポイントをメモ：`https://api.mastra.ai/v1/projects/accounting-automation`

### 9. スクリーンショット

各ステップ完了後、以下のスクリーンショットを撮影：
1. プロジェクトダッシュボード
2. エージェント一覧（7個すべて表示）
3. ワークフロー一覧（3個すべて表示）
4. 環境変数設定画面
5. 最終的なプロジェクト概要

完了したら「Mastra Cloudへの登録が完了しました」と報告してください。

---

**重要**: 
- 各入力は正確にコピー＆ペーストしてください
- エラーが発生した場合は、エラーメッセージを含めて報告してください
- 環境変数の実際の値は、セキュリティのため後で別途設定します