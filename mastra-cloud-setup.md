# Mastra Cloud セットアップガイド

## 1. Mastra Cloudにプロジェクトを作成

### ブラウザで以下の手順を実行：

1. **Mastra Cloudにログイン**
   - https://cloud.mastra.ai にアクセス
   - EFFECT's Teamでログイン

2. **新規プロジェクト作成**
   - 「Add new」ボタンをクリック
   - プロジェクト名：`accounting-automation`
   - 説明：`AI-driven accounting automation system for Japanese tax compliance`

## 2. CLIを使用したプロジェクト作成（代替方法）

```bash
# Mastra CLIのインストール
npm install -g @mastra/cli

# ログイン
mastra login

# プロジェクト作成
mastra project create accounting-automation \
  --description "AI-driven accounting automation system for Japanese tax compliance"
```

## 3. エージェントの登録

### Option A: Web UIでの登録

1. プロジェクトダッシュボードにアクセス
2. 「Agents」タブをクリック
3. 「Add Agent」をクリック
4. 各エージェントを登録：

```
名前: accounting-agent
説明: 会計処理・仕訳作成エージェント
ツール: create_journal, process_transaction, create_invoice, generate_report

名前: customer-agent
説明: 顧客管理エージェント
ツール: create, update, delete, search, analyze

名前: database-agent
説明: データベース操作エージェント
ツール: query, create, update, delete, backup

名前: japan-tax-agent
説明: 日本税制対応エージェント
ツール: calculate_tax, validate_invoice, check_compliance, generate_tax_report

名前: ocr-agent
説明: OCR処理エージェント
ツール: process_image, extract_invoice, extract_receipt, analyze_document

名前: product-agent
説明: 商品管理エージェント
ツール: create, update, delete, search, analyze_inventory

名前: ui-agent
説明: UI操作エージェント
ツール: generate_form, create_dashboard, export_pdf, create_chart
```

### Option B: mastra.yaml を使用した一括登録

`mastra.yaml`ファイルを作成：

```yaml
project: accounting-automation
version: 1.0.0
description: AI-driven accounting automation system

agents:
  - name: accounting-agent
    description: 会計処理・仕訳作成エージェント
    file: ./src/agents/accounting-agent.ts
    
  - name: customer-agent
    description: 顧客管理エージェント
    file: ./src/agents/customer-agent.ts
    
  - name: database-agent
    description: データベース操作エージェント
    file: ./src/agents/database-agent.ts
    
  - name: japan-tax-agent
    description: 日本税制対応エージェント
    file: ./src/agents/japan-tax-agent.ts
    
  - name: ocr-agent
    description: OCR処理エージェント
    file: ./src/agents/ocr-agent.ts
    
  - name: product-agent
    description: 商品管理エージェント
    file: ./src/agents/product-agent.ts
    
  - name: ui-agent
    description: UI操作エージェント
    file: ./src/agents/ui-agent.ts

workflows:
  - name: accounting-workflow
    description: 会計処理ワークフロー
    file: ./src/workflows/accounting-workflow.ts
    
  - name: compliance-workflow
    description: コンプライアンスチェック
    file: ./src/workflows/compliance-workflow.ts
    
  - name: invoice-processing-workflow
    description: 請求書処理
    file: ./src/workflows/invoice-processing-workflow.ts

environment:
  MONGODB_URI: ${MONGODB_URI}
  OPENAI_API_KEY: ${OPENAI_API_KEY}
  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  AZURE_FORM_RECOGNIZER_ENDPOINT: ${AZURE_FORM_RECOGNIZER_ENDPOINT}
  AZURE_FORM_RECOGNIZER_KEY: ${AZURE_FORM_RECOGNIZER_KEY}
```

デプロイコマンド：
```bash
# プロジェクトディレクトリで実行
cd /Users/tonychustudio/Documents/aam-orchestration/accounting-automation

# Mastra Cloudにデプロイ
mastra deploy
```

## 4. 環境変数の設定

Mastra Cloudダッシュボードで：
1. 「Settings」→「Environment Variables」
2. 以下を追加：
   - MONGODB_URI
   - OPENAI_API_KEY
   - ANTHROPIC_API_KEY
   - AZURE_FORM_RECOGNIZER_ENDPOINT
   - AZURE_FORM_RECOGNIZER_KEY

## 5. デプロイとテスト

```bash
# エージェントのテスト
mastra agent test accounting-agent

# 全体のヘルスチェック
mastra health-check

# ログの確認
mastra logs --tail 100
```

## 6. Web UIでの確認

1. https://cloud.mastra.ai/effects-team/dashboard/projects
2. `accounting-automation`プロジェクトが表示されることを確認
3. エージェントタブで7個のエージェントが登録されていることを確認

---

**注意**: Mastra CLIがインストールされていない場合は、Web UIから手動で登録する必要があります。