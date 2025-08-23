#!/usr/bin/env node

/**
 * Mastra Cloudへエージェントとワークフローを登録するスクリプト
 * 注意: Mastra Cloud APIトークンが必要です
 */

const agents = [
  {
    name: 'accounting-agent',
    description: '会計処理・仕訳作成・請求書処理・財務レポート生成を行う日本税制対応エージェント',
    capabilities: ['create_journal', 'process_transaction', 'create_invoice', 'generate_report', 'calculate_balance', 'export_data']
  },
  {
    name: 'customer-agent',
    description: '顧客データの管理・分析・CRM機能を提供するエージェント',
    capabilities: ['create', 'update', 'delete', 'search', 'analyze', 'export']
  },
  {
    name: 'database-agent',
    description: 'MongoDBデータベース操作・バックアップ・復元を行うエージェント',
    capabilities: ['query', 'create', 'update', 'delete', 'backup', 'restore']
  },
  {
    name: 'deployment-agent',
    description: 'CI/CD・自動デプロイ・ビルド管理を行うエージェント',
    capabilities: ['deploy_vercel', 'run_tests', 'build_project', 'check_health']
  },
  {
    name: 'japan-tax-agent',
    description: '日本の税制に完全対応した税金計算エージェント',
    capabilities: ['calculate_consumption_tax', 'calculate_income_tax', 'calculate_corporate_tax', 'generate_tax_report']
  },
  {
    name: 'ocr-agent',
    description: '請求書・領収書のOCR処理とデータ抽出を行うエージェント',
    capabilities: ['process_invoice', 'process_receipt', 'extract_text', 'analyze_document']
  },
  {
    name: 'problem-solving-agent',
    description: 'エラー診断・問題解決・修正提案を行うエージェント',
    capabilities: ['diagnose_error', 'suggest_fix', 'analyze_logs']
  },
  {
    name: 'product-agent',
    description: '商品管理・在庫管理・商品分析を行うエージェント',
    capabilities: ['create', 'update', 'delete', 'search', 'analyze_inventory']
  },
  {
    name: 'refactor-agent',
    description: 'コード最適化・リファクタリング支援エージェント',
    capabilities: ['analyze_code', 'suggest_improvements', 'refactor']
  },
  {
    name: 'ui-agent',
    description: 'UI生成・フォーム作成・ダッシュボード生成エージェント',
    capabilities: ['generate_form', 'create_dashboard', 'export_pdf', 'create_chart']
  },
  {
    name: 'construction-agent',
    description: '建設業特有の会計処理・工事進行基準対応エージェント',
    capabilities: ['process_construction_accounting', 'calculate_progress', 'manage_projects', 'generate_reports']
  },
  {
    name: 'web-scraper-agent',
    description: 'Webデータ収集・スクレイピング・分析エージェント',
    capabilities: ['scrape_website', 'extract_data', 'analyze_content']
  }
];

const workflows = [
  {
    name: 'accounting-workflow',
    description: '会計処理の完全自動化ワークフロー（取引入力→仕訳→税計算→レポート生成）',
    steps: ['validate_input', 'process_documents', 'categorize_transaction', 'calculate_tax', 'create_journal_entry', 'save_to_database']
  },
  {
    name: 'compliance-workflow',
    description: 'コンプライアンスチェック・監査対応ワークフロー',
    steps: ['check_regulations', 'validate_transactions', 'generate_audit_trail', 'create_compliance_report']
  },
  {
    name: 'invoice-processing-workflow',
    description: '請求書OCRから仕訳作成まで一括処理ワークフロー',
    steps: ['ocr_processing', 'data_extraction', 'validation', 'journal_creation', 'approval_flow']
  },
  {
    name: 'deployment-workflow',
    description: 'テスト・ビルド・デプロイ自動化ワークフロー',
    steps: ['run_tests', 'build_application', 'deploy_to_vercel', 'health_check', 'notify_status']
  }
];

// Mastra Cloud API設定
const MASTRA_CLOUD_API = process.env.MASTRA_CLOUD_API || 'https://api.mastra.ai';
const MASTRA_API_TOKEN = process.env.MASTRA_API_TOKEN;

async function registerToCloud() {
  console.log('🚀 Mastra Cloudへの登録を開始します...\n');
  
  if (!MASTRA_API_TOKEN) {
    console.log('⚠️  MASTRA_API_TOKENが設定されていません');
    console.log('📝 Web UIから手動で登録してください: https://cloud.mastra.ai\n');
    
    console.log('=== 登録するエージェント一覧 ===');
    agents.forEach((agent, i) => {
      console.log(`${i + 1}. ${agent.name}`);
      console.log(`   説明: ${agent.description}`);
      console.log(`   機能: ${agent.capabilities.join(', ')}\n`);
    });
    
    console.log('=== 登録するワークフロー一覧 ===');
    workflows.forEach((workflow, i) => {
      console.log(`${i + 1}. ${workflow.name}`);
      console.log(`   説明: ${workflow.description}`);
      console.log(`   ステップ: ${workflow.steps.join(' → ')}\n`);
    });
    
    console.log('📋 合計: エージェント12個、ワークフロー4個を登録してください');
    return;
  }
  
  // API経由での登録（APIトークンがある場合）
  try {
    // エージェント登録
    for (const agent of agents) {
      const response = await fetch(`${MASTRA_CLOUD_API}/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MASTRA_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agent)
      });
      
      if (response.ok) {
        console.log(`✅ ${agent.name} を登録しました`);
      } else {
        console.log(`❌ ${agent.name} の登録に失敗しました`);
      }
    }
    
    // ワークフロー登録
    for (const workflow of workflows) {
      const response = await fetch(`${MASTRA_CLOUD_API}/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MASTRA_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflow)
      });
      
      if (response.ok) {
        console.log(`✅ ${workflow.name} を登録しました`);
      } else {
        console.log(`❌ ${workflow.name} の登録に失敗しました`);
      }
    }
    
    console.log('\n✅ 登録完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// 実行
registerToCloud();