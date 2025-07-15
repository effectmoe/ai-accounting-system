import { KnowledgeService } from '../services/knowledge.service';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const knowledgeService = new KnowledgeService();

// 初期ナレッジデータ
const initialKnowledgeData = [
  {
    title: "インボイス制度の基本概要",
    content: `インボイス制度（適格請求書等保存方式）は、2023年10月1日から開始された消費税の新しい制度です。

## 制度の目的
- 消費税の適正な課税
- 軽減税率制度の適切な運用
- 税収の透明性向上

## 主な変更点
1. 適格請求書の発行が必要
2. 登録番号の記載が必須
3. 税率ごとの税額を明記
4. 一定の記載事項の遵守

## 対象事業者
- 課税事業者で登録を受けた事業者
- 年間売上高1,000万円以上の事業者（原則）
- 任意で登録可能な免税事業者

## 請求書の記載事項
1. 適格請求書発行事業者の氏名または名称
2. 登録番号
3. 取引年月日
4. 取引内容
5. 税率ごとに区分した合計額
6. 適用税率
7. 税率ごとの消費税額等

## 注意点
- 登録番号がない請求書は仕入税額控除の対象外
- 経過措置により段階的に控除額が減少
- 適格請求書の保存が必要`,
    excerpt: "インボイス制度は2023年10月から開始された消費税の新制度で、適格請求書の発行と保存が必要です。",
    sourceUrl: "https://example.com/invoice-system-guide",
    sourceType: "manual" as const,
    authorName: "税務専門チーム",
    publishedDate: new Date("2023-10-01"),
    tags: ["インボイス制度", "消費税", "適格請求書", "税務", "制度改正"],
    categories: ["税務", "消費税"],
    taxonomyTags: {
      taxLaw: ["消費税法", "インボイス制度"],
      accountingType: ["税務処理"],
      businessType: ["全業種"],
      difficulty: "intermediate" as const,
      contentType: "guide" as const
    },
    qualityScore: 95,
    isVerified: true,
    isActive: true,
    metadata: {
      wordCount: 350,
      readingTime: 2,
      imageCount: 0,
      linkCount: 0
    },
    processingStatus: "completed" as const,
    lastUpdated: new Date()
  },
  {
    title: "法人税の基本税率と計算方法",
    content: `法人税は、法人の所得に対して課税される国税です。

## 基本税率（2023年度）
- 普通法人：23.2%
- 中小法人（年800万円以下）：15%
- 中小法人（年800万円超）：23.2%

## 計算の流れ
1. 益金の計算
2. 損金の計算
3. 所得金額の算出（益金 - 損金）
4. 税額の計算（所得金額 × 税率）
5. 税額控除の適用
6. 申告税額の確定

## 中小法人の特例
- 年間所得800万円以下の部分：15%
- 年間所得800万円超の部分：23.2%
- 資本金1億円以下の法人が対象

## 申告・納付期限
- 事業年度終了の日の翌日から2か月以内
- 延長申請により1か月延長可能

## 主な税額控除
- 試験研究費税額控除
- 設備投資税額控除
- 雇用促進税制
- 地方活力向上地域特定業務施設整備計画税額控除

## 注意点
- 欠損金の繰越控除制限あり
- 受取配当金の益金不算入制度
- 同族会社の特別規定に注意`,
    excerpt: "法人税の基本税率は23.2%、中小法人は800万円以下の部分が15%です。",
    sourceUrl: "https://example.com/corporate-tax-guide",
    sourceType: "manual" as const,
    authorName: "税務専門チーム",
    publishedDate: new Date("2023-04-01"),
    tags: ["法人税", "税率", "中小法人", "申告", "税額控除"],
    categories: ["税務", "法人税"],
    taxonomyTags: {
      taxLaw: ["法人税法"],
      accountingType: ["税務処理", "申告処理"],
      businessType: ["法人"],
      difficulty: "intermediate" as const,
      contentType: "guide" as const
    },
    qualityScore: 90,
    isVerified: true,
    isActive: true,
    metadata: {
      wordCount: 280,
      readingTime: 2,
      imageCount: 0,
      linkCount: 0
    },
    processingStatus: "completed" as const,
    lastUpdated: new Date()
  },
  {
    title: "減価償却の方法と仕訳処理",
    content: `減価償却は、固定資産の取得価額を耐用年数にわたって費用配分する会計処理です。

## 減価償却の方法
### 1. 定額法
- 毎年同じ金額を償却
- 計算式：(取得価額 - 残存価額) ÷ 耐用年数
- 最も一般的な方法

### 2. 定率法
- 毎年同じ率で償却
- 計算式：帳簿価額 × 償却率
- 初年度の償却額が大きい

## 主な仕訳処理
### 直接法
仕訳：減価償却費 100,000 / 建物 100,000

### 間接法
仕訳：減価償却費 100,000 / 減価償却累計額 100,000

## 耐用年数の例
- 建物（鉄筋コンクリート）：47年
- 建物（木造）：22年
- 車両運搬具：6年
- 工具器具備品：3～20年
- パソコン：4年

## 税務上の注意点
- 法人税法上の償却限度額
- 少額減価償却資産の特例（30万円未満）
- 一括償却資産の特例（20万円未満）
- 即時償却の特例制度

## 月割計算
- 取得時期に応じた月割償却
- 計算式：年間償却額 × 償却月数 ÷ 12

## 記録・管理のポイント
- 固定資産台帳の作成
- 取得価額の確定
- 耐用年数の決定
- 定期的な見直し`,
    excerpt: "減価償却は固定資産の取得価額を耐用年数で配分する処理で、定額法と定率法があります。",
    sourceUrl: "https://example.com/depreciation-guide",
    sourceType: "manual" as const,
    authorName: "会計専門チーム",
    publishedDate: new Date("2023-04-01"),
    tags: ["減価償却", "固定資産", "仕訳", "定額法", "定率法", "耐用年数"],
    categories: ["会計", "固定資産"],
    taxonomyTags: {
      taxLaw: ["法人税法", "減価償却"],
      accountingType: ["会計処理", "仕訳処理"],
      businessType: ["全業種"],
      difficulty: "intermediate" as const,
      contentType: "guide" as const
    },
    qualityScore: 92,
    isVerified: true,
    isActive: true,
    metadata: {
      wordCount: 320,
      readingTime: 2,
      imageCount: 0,
      linkCount: 0
    },
    processingStatus: "completed" as const,
    lastUpdated: new Date()
  },
  {
    title: "電子帳簿保存法の改正ポイント",
    content: `電子帳簿保存法が2022年1月から改正され、電子取引の保存要件が厳格化されました。

## 改正の背景
- デジタル化の推進
- 税務行政のデジタル・トランスフォーメーション
- 不正防止の強化

## 主な改正点
### 1. 電子取引の保存義務化
- 2024年1月から完全義務化
- 電子で受け取った請求書等は電子保存が必要
- 紙での保存は不可

### 2. 事前承認制度の廃止
- 2022年1月から事前承認が不要
- 届出制に変更

### 3. タイムスタンプ要件の緩和
- 2か月以内→最長2か月と概ね7営業日以内
- 訂正削除の防止措置があれば省略可能

## 保存方法の種類
### 1. 電子帳簿等保存
- 会計ソフトで作成した帳簿の電子保存
- 優良電子帳簿なら過少申告加算税の軽減

### 2. スキャナ保存
- 紙の書類をスキャンして電子保存
- 領収書や請求書が対象

### 3. 電子取引
- 電子メール、EDI、クラウドサービス等
- 2024年1月から保存義務化

## 保存要件
- 真実性の確保
- 可視性の確保
- 検索機能の確保
- データの改ざん防止

## 対応のポイント
1. 現状の取引形態の把握
2. 電子保存システムの選定
3. 社内規程の整備
4. 従業員への教育
5. 定期的な見直し`,
    excerpt: "電子帳簿保存法が2022年に改正され、2024年から電子取引の電子保存が義務化されました。",
    sourceUrl: "https://example.com/electronic-bookkeeping-law",
    sourceType: "manual" as const,
    authorName: "税務専門チーム",
    publishedDate: new Date("2022-01-01"),
    tags: ["電子帳簿保存法", "電子取引", "デジタル化", "保存義務", "改正"],
    categories: ["税務", "電子帳簿"],
    taxonomyTags: {
      taxLaw: ["電子帳簿保存法"],
      accountingType: ["帳簿保存"],
      businessType: ["全業種"],
      difficulty: "intermediate" as const,
      contentType: "regulation" as const
    },
    qualityScore: 88,
    isVerified: true,
    isActive: true,
    metadata: {
      wordCount: 380,
      readingTime: 3,
      imageCount: 0,
      linkCount: 0
    },
    processingStatus: "completed" as const,
    lastUpdated: new Date()
  },
  {
    title: "勘定科目の分類と使い分け",
    content: `勘定科目は、取引の内容を表す会計上の分類項目です。適切な勘定科目の選択が正確な会計処理の基礎となります。

## 勘定科目の5つの分類
### 1. 資産
- 流動資産：現金、売掛金、棚卸資産など
- 固定資産：建物、機械装置、土地など
- 繰延資産：創立費、開業費など

### 2. 負債
- 流動負債：買掛金、短期借入金、未払金など
- 固定負債：長期借入金、社債など

### 3. 純資産
- 資本金、利益剰余金、資本剰余金など

### 4. 収益
- 売上高、受取利息、受取配当金など
- 営業外収益、特別利益

### 5. 費用
- 売上原価、販売費及び一般管理費
- 営業外費用、特別損失

## よく使う勘定科目と使い分け
### 現金・預金関係
- 現金：手許現金
- 普通預金：銀行普通預金
- 当座預金：当座預金口座
- 定期預金：定期預金

### 売上・仕入関係
- 売上高：商品・サービスの売上
- 売掛金：後日入金予定の売上
- 買掛金：後日支払予定の仕入
- 仕入高：商品の仕入

### 経費関係
- 旅費交通費：出張費、交通費
- 通信費：電話代、インターネット料金
- 水道光熱費：電気代、ガス代、水道代
- 消耗品費：10万円未満の備品
- 地代家賃：事務所・店舗の賃料

## 判断に迷う勘定科目
### 消耗品費 vs 備品費
- 消耗品費：10万円未満または使用期間1年未満
- 備品費：10万円以上かつ使用期間1年以上

### 外注費 vs 給料
- 外注費：業務委託、請負契約
- 給料：雇用契約、指揮命令関係あり

### 接待交際費 vs 会議費
- 接待交際費：社外の人との飲食、贈答
- 会議費：社内会議、1人5,000円以下の社外会議

## 注意点
- 継続性の原則（同じ処理を続ける）
- 実質重視の原則（形式より実質）
- 明瞭性の原則（わかりやすい科目選択）`,
    excerpt: "勘定科目は資産・負債・純資産・収益・費用の5つに分類され、適切な選択が正確な会計処理の基礎となります。",
    sourceUrl: "https://example.com/account-classification-guide",
    sourceType: "manual" as const,
    authorName: "会計専門チーム",
    publishedDate: new Date("2023-04-01"),
    tags: ["勘定科目", "会計処理", "分類", "仕訳", "経費", "資産", "負債"],
    categories: ["会計", "勘定科目"],
    taxonomyTags: {
      taxLaw: ["会計基準"],
      accountingType: ["会計処理", "仕訳処理"],
      businessType: ["全業種"],
      difficulty: "beginner" as const,
      contentType: "guide" as const
    },
    qualityScore: 93,
    isVerified: true,
    isActive: true,
    metadata: {
      wordCount: 420,
      readingTime: 3,
      imageCount: 0,
      linkCount: 0
    },
    processingStatus: "completed" as const,
    lastUpdated: new Date()
  }
];

// 初期ソースデータ
const initialSources = [
  {
    name: "国税庁公式サイト",
    type: "blog" as const,
    url: "https://www.nta.go.jp/",
    description: "国税庁の公式情報サイト",
    isActive: true,
    crawlSettings: {
      frequency: "weekly" as const,
      maxArticles: 50,
      includePatterns: ["/taxes/", "/law/"],
      excludePatterns: ["/about/", "/contact/"]
    },
    categories: ["税務", "法令"],
    tags: ["国税", "税務", "法令", "公式"]
  },
  {
    name: "日本税理士会連合会",
    type: "blog" as const,
    url: "https://www.nichizeiren.or.jp/",
    description: "日本税理士会連合会の情報サイト",
    isActive: true,
    crawlSettings: {
      frequency: "weekly" as const,
      maxArticles: 30,
      includePatterns: ["/guidance/", "/news/"],
      excludePatterns: ["/member/"]
    },
    categories: ["税務", "会計"],
    tags: ["税理士", "税務", "会計", "専門家"]
  },
  {
    name: "企業会計基準委員会",
    type: "blog" as const,
    url: "https://www.asb.or.jp/",
    description: "企業会計基準委員会の公式サイト",
    isActive: true,
    crawlSettings: {
      frequency: "monthly" as const,
      maxArticles: 20,
      includePatterns: ["/standard/", "/news/"],
      excludePatterns: ["/en/"]
    },
    categories: ["会計", "基準"],
    tags: ["会計基準", "企業会計", "基準委員会"]
  }
];

// カテゴリデータ
const initialCategories = [
  {
    name: "税務",
    slug: "tax",
    description: "税務に関する情報",
    level: 1,
    isActive: true,
    icon: "📊",
    color: "#3B82F6",
    sortOrder: 1
  },
  {
    name: "会計",
    slug: "accounting",
    description: "会計処理に関する情報",
    level: 1,
    isActive: true,
    icon: "📋",
    color: "#10B981",
    sortOrder: 2
  },
  {
    name: "法令",
    slug: "law",
    description: "法令・規制に関する情報",
    level: 1,
    isActive: true,
    icon: "⚖️",
    color: "#8B5CF6",
    sortOrder: 3
  },
  {
    name: "システム",
    slug: "system",
    description: "システム・ITに関する情報",
    level: 1,
    isActive: true,
    icon: "💻",
    color: "#F59E0B",
    sortOrder: 4
  }
];

async function initKnowledgeData() {
  try {
    console.log('Initializing knowledge data...');
    
    await knowledgeService.connect();
    
    // インデックスを作成
    console.log('Creating database indexes...');
    await knowledgeService.createIndexes();
    
    // カテゴリを作成
    console.log('Creating categories...');
    for (const categoryData of initialCategories) {
      try {
        await knowledgeService.createCategory(categoryData);
        console.log(`Created category: ${categoryData.name}`);
      } catch (error) {
        console.log(`Category ${categoryData.name} already exists or error:`, error);
      }
    }
    
    // ソースを作成
    console.log('Creating sources...');
    for (const sourceData of initialSources) {
      try {
        await knowledgeService.createSource(sourceData);
        console.log(`Created source: ${sourceData.name}`);
      } catch (error) {
        console.log(`Source ${sourceData.name} already exists or error:`, error);
      }
    }
    
    // 記事を作成
    console.log('Creating articles...');
    for (const articleData of initialKnowledgeData) {
      try {
        await knowledgeService.createArticle(articleData);
        console.log(`Created article: ${articleData.title}`);
      } catch (error) {
        console.log(`Article ${articleData.title} already exists or error:`, error);
      }
    }
    
    console.log('Knowledge data initialization completed!');
    
  } catch (error) {
    console.error('Error initializing knowledge data:', error);
  } finally {
    await knowledgeService.disconnect();
  }
}

// スクリプトとして実行
if (require.main === module) {
  initKnowledgeData();
}

export { initKnowledgeData };