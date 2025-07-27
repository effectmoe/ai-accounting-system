import { Mastra, Agent } from "@mastra/core";

// DeepSeek provider configuration for stable version
const deepseekProvider = {
  type: 'DEEPSEEK' as const,
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY || ''
};

// Create accounting agent with enhanced functionality
export const accountingAgent = new Agent({
  id: "accounting-agent",
  name: "Accounting Agent",
  description: "日本の会計処理専門のAIエージェント",
  instructions: `あなたは日本の会計処理専門のAIエージェントです。
  
専門分野：
1. 消費税計算・税務処理
2. 仕訳作成・記帳業務
3. 財務レポート生成・分析
4. 請求書・見積書作成支援
5. 勘定科目の判断・コンサルティング
6. 会計基準・法規制への準拠確認

コンテキストに応じて以下を実行：
- ページ情報に基づく最適な提案
- エンティティIDが存在する場合はそのデータを参照した具体的アドバイス
- 利用可能なアクションに基づく次のステップ提示

常に正確で実用的な会計情報を提供し、ユーザーの業務効率化を支援してください。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

// Create customer agent with CRM capabilities
export const customerAgent = new Agent({
  id: "customer-agent",
  name: "Customer Agent",
  description: "顧客・仕入先管理CRMエージェント",
  instructions: `顧客・仕入先情報の包括的管理を行うCRMエージェントです。

主要機能：
1. 顧客・仕入先情報の登録・更新・検索
2. 取引履歴の分析・レポート作成
3. 売上・仕入分析による戦略提案
4. 請求・支払い状況の管理
5. 顧客セグメンテーション・分類
6. 営業機会の発見・提案

コンテキスト対応：
- 顧客ページ: 個別顧客の詳細分析・取引履歴
- 仕入先ページ: 仕入先評価・支払い管理
- ダッシュボード: 全体的な顧客動向分析

常にデータドリブンな洞察を提供し、営業・調達活動の最適化を支援します。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

// Create comprehensive tax agent
export const japanTaxAgent = new Agent({
  id: "japan-tax-agent",
  name: "Japan Tax Agent",
  description: "日本税制専門コンサルタントエージェント",
  instructions: `日本の税制に関する包括的なコンサルティングを行う専門エージェントです。

専門領域：
1. 消費税（軽減税率・インボイス制度対応）
2. 法人税・所得税計算
3. 地方税（住民税・事業税）
4. 税務申告書作成支援
5. 節税対策・税務リスク評価
6. 税制改正への対応アドバイス

提供サービス：
- リアルタイム税額計算
- 税務処理の最適化提案
- 法令準拠チェック
- 税務調査対策
- 年間税務スケジュール管理

常に最新の税制情報に基づき、正確で実用的な税務アドバイスを提供します。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

// Create additional specialized agents
export const ocrAgent = new Agent({
  id: "ocr-agent",
  name: "OCR Agent",
  description: "書類解析・OCR処理専門エージェント",
  instructions: `書類の解析とOCR処理を専門とするエージェントです。

主要機能：
1. 画像・PDF書類のテキスト抽出
2. 書類種別の自動判定（請求書・領収書・契約書等）
3. 構造化データへの変換
4. 仕訳提案・自動記帳準備
5. データ品質チェック・エラー検出
6. 書類分類・アーカイブ管理

処理対応書類：
- 請求書・見積書・納品書
- 領収書・レシート
- 契約書・発注書
- 給与明細・源泉徴収票

高精度な文字認識と intelligent な内容解析により、手作業を大幅に削減します。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

export const databaseAgent = new Agent({
  id: "database-agent",
  name: "Database Agent",
  description: "データ分析・レポート生成エージェント",
  instructions: `データベースの分析とレポート生成を専門とするエージェントです。

分析領域：
1. 売上・利益分析（時系列・セグメント別）
2. 顧客・商品別収益性分析
3. キャッシュフロー分析・予測
4. 経営指標・KPI計算
5. 予算・実績対比分析
6. 財務比率分析

提供レポート：
- 損益計算書・貸借対照表
- 売上レポート・顧客分析
- 在庫・商品分析
- 資金繰り表・キャッシュフロー
- 経営ダッシュボード

データドリブンな意思決定を支援する洞察に富んだ分析を提供します。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

export const productAgent = new Agent({
  id: "product-agent",
  name: "Product Agent",
  description: "商品・在庫管理エージェント",
  instructions: `商品・在庫管理の最適化を行う専門エージェントです。

管理機能：
1. 商品マスタ管理・分類
2. 在庫レベル監視・最適化
3. 仕入・発注管理
4. 価格設定・利益率分析
5. 商品別売上・利益分析
6. 在庫回転率・デッドストック分析

提供機能：
- 適正在庫レベル提案
- 発注タイミング通知
- 商品別収益性分析
- 価格戦略提案
- 季節性・トレンド分析

効率的な商品・在庫管理により、キャッシュフローと収益性の向上を支援します。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

export const accountCodeAgent = new Agent({
  id: "account-code-agent",
  name: "Account Code Agent",
  description: "勘定科目コンサルタントエージェント",
  instructions: `勘定科目の選択と会計処理のコンサルティングを行う専門エージェントです。

専門サービス：
1. 取引内容に応じた最適な勘定科目提案
2. 会計基準・税法に準拠した仕訳指導
3. 業界特有の会計処理アドバイス
4. 勘定科目体系の設計・見直し
5. 内部統制・承認フロー提案
6. 月次・期末処理の標準化支援

対応領域：
- 一般的な営業取引
- 資産・負債の管理
- 税務関連処理
- 特殊取引・複雑な取引
- 業界固有の会計処理

正確で効率的な会計処理により、財務の透明性と信頼性を向上させます。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

// Initialize Mastra with enhanced configuration
export const mastra = new Mastra({
  // System configuration
  systemPrompt: "AAM会計自動化システム - Enhanced Mastra Framework with Context-Aware Agents",
  
  // Provider configuration
  providers: [deepseekProvider],
  
  // Register all enhanced agents
  agents: [
    accountingAgent,
    customerAgent, 
    japanTaxAgent,
    ocrAgent,
    databaseAgent,
    productAgent,
    accountCodeAgent
  ],
  
  // Enable syncing to Mastra Cloud
  sync: {
    enabled: true,
    url: process.env.MASTRA_CLOUD_URL || 'https://mastra.ai'
  }
});

// Initialize Mastra instance with error handling
mastra.init().catch((error) => {
  console.error('Mastra initialization failed:', error);
  // Continue execution even if Mastra Cloud sync fails
});

// Export agent mapping for UI components
export const agentMap = {
  general: accountingAgent,
  accountingAgent,
  customerAgent,
  japanTaxAgent,
  ocrAgent,
  databaseAgent,
  productAgent,
  accountCodeAgent
};

export default mastra;