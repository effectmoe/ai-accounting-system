import { Mastra } from '@mastra/core';

// 全エージェントのインポート
import { accountingAgent } from './agents/accounting-agent';
import { constructionAgent } from './agents/construction-agent';
import { customerAgent } from './agents/customer-agent';
import { databaseAgent } from './agents/database-agent';
import { deploymentAgent } from './agents/deployment-agent';
import { japanTaxAgent } from './agents/japan-tax-agent';
import { ocrAgent } from './agents/ocr-agent';
import { problemSolvingAgent } from './agents/problem-solving-agent';
import { productAgent } from './agents/product-agent';
import { refactorAgent } from './agents/refactor-agent';
import { uiAgent } from './agents/ui-agent';

// 完全な会計システム設定
const mastra = new Mastra({
  agents: {
    // 会計関連エージェント
    accountingAgent,
    japanTaxAgent,
    
    // データ管理エージェント
    databaseAgent,
    customerAgent,
    productAgent,
    
    // OCR・処理エージェント
    ocrAgent,
    problemSolvingAgent,
    
    // UI・デプロイエージェント
    uiAgent,
    deploymentAgent,
    refactorAgent,
    
    // 特殊エージェント
    constructionAgent,
  },
  workflows: {
    // ワークフローは後で追加
  },
});

// 両方の形式でエクスポート
export { mastra };
export default mastra;
