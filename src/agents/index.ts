// Mastra エージェントのエクスポート

// Azure Form Recognizer OCRエージェント（新）
export { ocrAgent as ocrAgentAzure } from './ocr-agent-azure';

// MongoDB データベースエージェント（新）
export { databaseAgentMongoDB } from './database-agent-mongodb';

// 既存のエージェント（HandwritingOCR機能保持のため）
export { ocrAgent } from './ocr-agent';
export { databaseAgent } from './database-agent';

// その他のエージェント
export { accountingAgent } from './accounting-agent';
export { customerAgent } from './customer-agent';
export { productAgent } from './product-agent';
export { japanTaxAgent } from './japan-tax-agent';
export { uiAgent } from './ui-agent';
export { nlwebAgent } from './nlweb-agent';
export { taxReturnAgent } from './tax-return-agent';
export { gasDeployAgent } from './gas-deploy-agent';
export { gasOcrDeployAgent } from './gas-ocr-deploy-agent';
export { gasTestAgent } from './gas-test-agent';
export { gasUpdateAgent } from './gas-update-agent';
export { problemSolvingAgent } from './problem-solving-agent';

// データベースセットアップエージェント
export { databaseSetupAgent } from './database-setup-agent';