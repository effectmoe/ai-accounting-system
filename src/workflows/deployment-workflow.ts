import { MastraOrchestrator } from '../mastra-orchestrator';
import { deploymentAgent } from '../agents/deployment-agent';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface DeploymentConfig {
  projectName: string;
  environmentVariables: Record<string, string>;
  testAfterDeploy?: boolean;
}

export class DeploymentWorkflow {
  private orchestrator: MastraOrchestrator;
  
  constructor() {
    this.orchestrator = new MastraOrchestrator();
    this.orchestrator.agents.set('deployment-agent', deploymentAgent);
  }
  
  async deployToVercel(config: DeploymentConfig): Promise<{
    success: boolean;
    productionUrl?: string;
    error?: string;
  }> {
    try {
      console.log('🚀 Vercelへの自動デプロイを開始します...\n');
      
      // 1. プロジェクト状態確認
      console.log('1️⃣ プロジェクト状態を確認中...');
      const projectStatus = await deploymentAgent.tools.checkProjectStatus.execute({});
      
      if (!projectStatus.success || projectStatus.output?.includes('Error')) {
        console.log('   プロジェクトが見つかりません。新規作成します。');
        const createResult = await deploymentAgent.tools.createNewProject.execute({
          projectName: config.projectName
        });
        
        if (!createResult.success) {
          throw new Error(`プロジェクト作成失敗: ${createResult.error}`);
        }
        console.log('   ✅ プロジェクト作成完了');
      } else {
        console.log('   ✅ 既存プロジェクトを使用');
      }
      
      // 2. 環境変数設定
      console.log('\n2️⃣ 環境変数を設定中...');
      const envResult = await deploymentAgent.tools.setEnvironmentVariables.execute({
        envVars: config.environmentVariables
      });
      
      if (!envResult.success) {
        throw new Error(`環境変数設定失敗: ${envResult.error}`);
      }
      console.log('   ✅ 環境変数設定完了');
      
      // 3. デプロイ実行
      console.log('\n3️⃣ 本番環境へデプロイ中...');
      const deployResult = await deploymentAgent.tools.deployToProduction.execute({});
      
      if (!deployResult.success) {
        throw new Error(`デプロイ失敗: ${deployResult.error}`);
      }
      
      const productionUrl = deployResult.productionUrl || 'https://accounting-automation.vercel.app';
      console.log(`   ✅ デプロイ完了: ${productionUrl}`);
      
      // 4. デプロイテスト（オプション）
      if (config.testAfterDeploy) {
        console.log('\n4️⃣ デプロイをテスト中...');
        const testResult = await deploymentAgent.tools.testDeployment.execute({
          url: productionUrl
        });
        
        if (testResult.success) {
          console.log('   ✅ デプロイテスト成功');
        } else {
          console.log(`   ⚠️  デプロイテスト失敗: HTTP ${testResult.statusCode}`);
        }
      }
      
      console.log('\n✨ デプロイが完了しました！');
      
      return {
        success: true,
        productionUrl: productionUrl
      };
      
    } catch (error) {
      console.error('\n❌ デプロイエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// デプロイ実行関数
export async function deployAccountingSystem() {
  const workflow = new DeploymentWorkflow();
  
  // Azure + MongoDB環境変数を準備
  const environmentVariables: Record<string, string> = {
    // Azure Form Recognizer
    AZURE_FORM_RECOGNIZER_ENDPOINT: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || '',
    AZURE_FORM_RECOGNIZER_KEY: process.env.AZURE_FORM_RECOGNIZER_KEY || '',
    
    // MongoDB Atlas
    MONGODB_URI: process.env.MONGODB_URI || '',
    
    // 新システム有効化
    USE_AZURE_MONGODB: 'true',
    
    // 既存の環境変数も維持
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    
    // その他
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '',
    DATAFORSEO_API_KEY: process.env.DATAFORSEO_API_KEY || '',
  };
  
  // 必須環境変数のチェック
  const requiredVars = [
    'AZURE_FORM_RECOGNIZER_ENDPOINT',
    'AZURE_FORM_RECOGNIZER_KEY',
    'MONGODB_URI'
  ];
  
  const missingVars = requiredVars.filter(v => !environmentVariables[v]);
  if (missingVars.length > 0) {
    console.error('❌ 必須環境変数が設定されていません:', missingVars.join(', '));
    console.log('\n.env.localファイルに以下を設定してください:');
    missingVars.forEach(v => console.log(`${v}=your_value_here`));
    return;
  }
  
  // デプロイ実行
  const result = await workflow.deployToVercel({
    projectName: 'accounting-automation',
    environmentVariables: environmentVariables,
    testAfterDeploy: true
  });
  
  if (result.success) {
    console.log('\n🎉 デプロイ成功！');
    console.log(`📍 URL: ${result.productionUrl}`);
    console.log(`📊 ヘルスチェック: ${result.productionUrl}/api/health`);
    console.log(`🧪 システム状態: ${result.productionUrl}/test-azure-mongodb`);
  } else {
    console.log('\n😞 デプロイに失敗しました');
    console.log(`エラー: ${result.error}`);
  }
}