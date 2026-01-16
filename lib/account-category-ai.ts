import { OCRResult } from './ocr-processor';
import { getMcpClient } from './mcp-client';
import { problemSolvingAgent } from '@/agents/problem-solving-agent';

import { logger } from '@/lib/logger';
import {
  checkConfirmationNeeded,
  ConfirmationQuestion,
  ConfirmationStatus,
} from './confirmation-config';

export interface AccountCategoryPrediction {
  category: string;
  confidence: number;
  reasoning: string;
  alternativeCategories?: Array<{
    category: string;
    confidence: number;
  }>;
  taxNotes?: string;
  sources?: string[];
  // 確認フロー関連フィールド
  needsConfirmation?: boolean;
  confirmationStatus?: ConfirmationStatus;
  confirmationQuestions?: ConfirmationQuestion[];
  confirmationReasons?: string[];
  pendingCategory?: string;
}

/**
 * AIベースの勘定科目分類システム
 * MCPツール（Perplexity、Firecrawl等）を活用してOCRテキストから勘定科目を高精度で推論
 */
export class AccountCategoryAI {
  private mcpClient: ReturnType<typeof getMcpClient>;
  
  constructor() {
    this.mcpClient = getMcpClient();
  }

  /**
   * OCR結果から勘定科目を推論
   * MCPツールを活用して高精度な分析を実行
   */
  async predictAccountCategory(ocrResult: OCRResult, companyId?: string): Promise<AccountCategoryPrediction> {
    try {
      // 1. OCRテキスト全体から重要な情報を抽出（強化版）
      const extractedInfo = await this.extractInformationFromOCR(ocrResult);
      
      // 2. Perplexityで最新の税務・会計情報を収集
      const searchQuery = this.buildSearchQuery(ocrResult, extractedInfo);
      const accountingInfo = await this.mcpClient.searchAccountingInfo(searchQuery);
      
      // 3. 特定の領収書パターンを高度に分析
      if (this.isParkingReceipt(ocrResult, extractedInfo)) {
        return await this.analyzeParkingReceipt(ocrResult, extractedInfo, accountingInfo);
      }
      
      // 4. Problem Solving Agentを使用して複雑な分析
      const complexAnalysis = await this.performComplexAnalysis(ocrResult, extractedInfo, accountingInfo);
      
      // 5. 学習データと組み合わせて最終判定
      if (companyId && ocrResult.vendor) {
        return await this.improveWithLearningData(complexAnalysis, companyId, ocrResult.vendor);
      }
      
      return complexAnalysis;
      
    } catch (error) {
      logger.error('AI prediction error:', error);
      // エラーの場合は高度なフォールバック
      return this.intelligentFallback(ocrResult);
    }
  }
  
  /**
   * OCRテキストから重要情報を抽出（強化版）
   * 業種別パターンと購入品目を詳細に分析
   */
  private async extractInformationFromOCR(ocrResult: OCRResult): Promise<any> {
    // textフィールドの安全な処理
    const safeText = ocrResult.text && typeof ocrResult.text === 'string' ? ocrResult.text : '';
    const text = safeText.toLowerCase();
    const originalText = safeText; // 元のケースも保持
    
    // 時間関連の情報を抽出（拡張版）
    const timePatterns = {
      parkingTime: /(?:入庫|入場|in)\s*[:：]?\s*(\d{1,2}[:：]\d{2})/,
      exitTime: /(?:出庫|出場|out)\s*[:：]?\s*(\d{1,2}[:：]\d{2})/,
      duration: /(?:駐車|利用|滞在)時間\s*[:：]?\s*(\d+時間\d+分|\d+分)/,
      hourlyRate: /(\d+)円\s*[/／]\s*(\d+)分/,
      businessHours: /(?:営業時間|営業|open)\s*[:：]?\s*(\d{1,2}[:：]\d{2})\s*[-~～]\s*(\d{1,2}[:：]\d{2})/,
      visitTime: /(?:来店|利用|入店)\s*[:：]?\s*(\d{1,2}[:：]\d{2})/,
      lunchTime: /(?:ランチ|昼食|lunch)\s*[:：]?\s*(\d{1,2}[:：]\d{2})/,
      dinnerTime: /(?:ディナー|夕食|dinner)\s*[:：]?\s*(\d{1,2}[:：]\d{2})/,
    };
    
    // 料金体系の情報を抽出（拡張版）
    const pricePatterns = {
      baseRate: /基本料金\s*[:：]?\s*[¥￥]?(\d+)/,
      additionalRate: /追加料金\s*[:：]?\s*[¥￥]?(\d+)/,
      maxDaily: /最大料金\s*[:：]?\s*[¥￥]?(\d+)/,
      nightRate: /夜間料金\s*[:：]?\s*[¥￥]?(\d+)/,
      unitPrice: /単価\s*[:：]?\s*[¥￥]?(\d+)/,
      quantity: /(?:数量|個数|点数)\s*[:：]?\s*(\d+)/,
      subtotal: /(?:小計|合計|計)\s*[:：]?\s*[¥￥]?(\d+)/,
      tax: /(?:消費税|税|tax)\s*[:：]?\s*[¥￥]?(\d+)/,
      discount: /(?:割引|値引|discount)\s*[:：]?\s*[¥￥]?(\d+)/,
    };
    
    // 購入品目のパターン（新規追加）
    const itemPatterns = {
      food: /(?:弁当|おにぎり|サンドイッチ|パン|惣菜|寿司|刺身|肉|魚|野菜|果物|飲料|コーヒー|お茶|ジュース|アルコール|ビール|ワイン|日本酒)/,
      officeSupplies: /(?:ペン|鉛筆|ノート|用紙|コピー用紙|インク|トナー|ファイル|クリップ|ホッチキス|付箋|封筒|はさみ|テープ|のり)/,
      tools: /(?:ドライバー|レンチ|ハンマー|ペンチ|のこぎり|ドリル|ビス|ネジ|釘|金具|工具|器具)/,
      cleaning: /(?:洗剤|せっけん|タオル|ティッシュ|トイレットペーパー|ゴミ袋|掃除|清掃|モップ|雑巾)/,
      electronics: /(?:電池|バッテリー|充電|ケーブル|コード|アダプター|usb|hdmi|lan)/,
    };
    
    // 人数・参加者情報（新規追加）
    const participantPatterns = {
      numberOfPeople: /(?:人数|名様|名|人)\s*[:：]?\s*(\d+)/,
      adultCount: /(?:大人|adult)\s*[:：]?\s*(\d+)/,
      childCount: /(?:子供|child|小人)\s*[:：]?\s*(\d+)/,
      groupSize: /(?:団体|グループ|group)\s*[:：]?\s*(\d+)/,
    };
    
    const extracted = {
      times: {},
      prices: {},
      items: {},
      participants: {},
      keywords: [],
      patterns: [],
      businessType: null,
      context: {},
    };
    
    // 時間情報を抽出
    Object.entries(timePatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        extracted.times[key] = match[1];
        extracted.patterns.push(key);
      }
    });
    
    // 料金情報を抽出
    Object.entries(pricePatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        extracted.prices[key] = parseInt(match[1]);
        extracted.patterns.push(key);
      }
    });
    
    // 業種特定キーワードを抽出（大幅拡張）
    const businessKeywords = {
      // 飲食店
      restaurant: [
        'レストラン', '食堂', 'ダイニング', 'ビストロ', 'トラットリア', 'オステリア',
        '和食', '洋食', '中華', 'イタリアン', 'フレンチ', 'エスニック', '創作料理'
      ],
      cafe: [
        'カフェ', 'coffee', 'コーヒー', '喫茶', 'スターバックス', 'starbucks', 'スタバ',
        'ドトール', 'doutor', 'タリーズ', 'tullys', 'エクセルシオール', 'excelsior',
        'ベローチェ', 'veloce', 'サンマルク', 'コメダ', 'komeda', 'ルノアール', 'renoir',
        'プロント', 'pronto', 'ブルーボトル', 'blue bottle'
      ],
      izakaya: [
        '居酒屋', '酒場', 'バー', 'bar', '串カツ', '串焼', '焼鳥', '焼き鳥',
        '鳥貴族', '和民', 'ワタミ', '魚民', '白木屋', '笑笑', '千年の宴', '月の雫'
      ],
      sushi: [
        '寿司', 'すし', 'sushi', '鮨', '回転寿司', 'スシロー', 'くら寿司', 'はま寿司',
        'かっぱ寿司', '銀のさら', '築地', '魚べい'
      ],
      yakiniku: [
        '焼肉', '焼き肉', 'ホルモン', '牛角', '安楽亭', '叙々苑',
        'ワンカルビ', '焼肉きんぐ', 'カルビ', 'ハラミ'
      ],
      fastfood: [
        'マクドナルド', 'mcdonald', 'マック', 'ケンタッキー', 'kfc', 'モスバーガー',
        'mos', 'バーガーキング', 'サブウェイ', 'subway', '吉野家', 'すき家', '松屋',
        'なか卯', 'ココ壱', 'coco壱番屋'
      ],
      // 小売店
      convenience: [
        'コンビニ', 'convenience', 'cvs', 'セブン', 'seven', 'セブンイレブン',
        '7-11', '７－１１', 'ローソン', 'lawson', 'ファミリーマート', 'familymart',
        'ファミマ', 'ミニストップ', 'ministop', 'デイリー', 'daily', 'ヤマザキ',
        'yamazaki', 'ポプラ', 'セイコーマート'
      ],
      supermarket: [
        'スーパー', 'super', 'マーケット', 'market', 'イオン', 'aeon', 'イトーヨーカドー',
        '西友', 'seiyu', 'ライフ', 'life', 'サミット', 'summit', 'マルエツ', 'maruetsu',
        'オーケー', 'ok', 'ヤオコー', 'いなげや', '東急ストア', 'ベイシア'
      ],
      homecenter: [
        'ホームセンター', 'カインズ', 'cainz', 'コーナン', 'kohnan', 'ビバホーム',
        'viva', 'ケーヨー', 'd2', 'ジョイフル', 'joyful', 'コメリ', 'komeri',
        'ナフコ', 'nafco', 'ムサシ', 'ロイヤル'
      ],
      electronics: [
        'ヤマダ電機', 'yamada', 'ビックカメラ', 'bic', 'ヨドバシ', 'yodobashi',
        'エディオン', 'edion', 'ケーズデンキ', "k's", 'ジョーシン', 'joshin',
        'ノジマ', 'nojima', 'ベスト電器', 'best'
      ],
      drugstore: [
        'ドラッグ', 'drug', '薬局', 'マツキヨ', 'マツモトキヨシ', 'ウエルシア',
        'welcia', 'ツルハ', 'tsuruha', 'サンドラッグ', 'sun', 'スギ薬局', 'sugi',
        'ココカラファイン', 'cocokara', 'クリエイト', 'create'
      ],
      // サービス業
      gasstation: [
        'ガソリン', 'gasoline', 'gas', 'エネオス', 'eneos', 'シェル', 'shell',
        '出光', 'idemitsu', 'コスモ', 'cosmo', 'キグナス', 'エッソ', 'esso',
        'モービル', 'mobil', '昭和シェル', 'ゼネラル'
      ],
      parking: [
        '駐車場', 'パーキング', 'parking', 'park', 'times', 'タイムズ', 'timescar',
        'タイムズカー', 'コインパーキング', 'coin', '月極', 'パーク24', 'リパーク',
        'repark', '三井のリパーク', 'ナビパーク', 'エコロパーク'
      ],
      cleaning: [
        'クリーニング', 'cleaning', '洗濯', 'ランドリー', 'laundry', '白洋舎',
        'ホワイト急便', 'ポニー', 'うさちゃん', 'ノムラ', 'サンクリーン'
      ],
      hairsalon: [
        '美容', '理容', 'ヘアサロン', 'hair', 'カット', 'cut', 'パーマ', 'perm',
        'カラー', 'color', 'qbハウス', 'qb', 'プラージュ', 'アース', 'earth'
      ],
      // 交通機関
      taxi: [
        'タクシー', 'taxi', 'cab', '日本交通', 'km', '国際自動車', '大和',
        'checker', 'チェッカー', 'グリーン', 'green', 'uber', 'ウーバー'
      ],
      train: [
        'jr', 'ｊｒ', '鉄道', '電車', 'railway', 'メトロ', 'metro', '地下鉄',
        'subway', '私鉄', '東急', '小田急', '京王', '西武', '東武', '京成',
        '京急', '相鉄', '東京メトロ', '都営', 'つくばエクスプレス', 'tx'
      ],
      bus: [
        'バス', 'bus', '高速バス', 'highway', '路線バス', '都営バス', '京王バス',
        '小田急バス', '東急バス', '西武バス', '国際興業', '京成バス', '関東バス'
      ],
      airline: [
        '航空', 'air', 'jal', '日本航空', 'ana', '全日空', 'jetstar', 'ジェットスター',
        'peach', 'ピーチ', 'vanilla', 'バニラ', 'skymark', 'スカイマーク',
        'airdo', 'エアドゥ', 'solaseed', 'ソラシド', '空港'
      ]
    };
    
    // キーワードマッチングと業種判定
    const matchedKeywords = [];
    let bestMatchType = null;
    let bestMatchScore = 0;
    
    for (const [businessType, keywords] of Object.entries(businessKeywords)) {
      let score = 0;
      const matched = [];
      
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase()) || 
            (ocrResult.vendor && typeof ocrResult.vendor === 'string' && ocrResult.vendor.toLowerCase().includes(keyword.toLowerCase()))) {
          matched.push(keyword);
          score++;
        }
      }
      
      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatchType = businessType;
      }
      
      if (matched.length > 0) {
        matchedKeywords.push(...matched);
      }
    }
    
    extracted.keywords = matchedKeywords;
    extracted.businessType = bestMatchType;
    
    // 購入品目の分析
    for (const [itemType, pattern] of Object.entries(itemPatterns)) {
      const matches = originalText.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        extracted.items[itemType] = matches;
      }
    }
    
    // 参加人数の分析
    Object.entries(participantPatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        extracted.participants[key] = parseInt(match[1]);
      }
    });
    
    // 文脈情報の抽出
    extracted.context = {
      hasMultiplePeople: extracted.participants.numberOfPeople > 1,
      isLunchTime: this.isLunchTime(extracted.times),
      isDinnerTime: this.isDinnerTime(extracted.times),
      isWeekend: this.isWeekend(ocrResult.date),
      hasAlcohol: /(?:ビール|beer|ワイン|wine|日本酒|sake|焼酎|ウイスキー|whisky|カクテル|cocktail)/.test(text),
      hasMeetingItems: /(?:会議|ミーティング|meeting|打ち合わせ|商談|プレゼン|presentation)/.test(text),
      hasBusinessCards: /(?:名刺|business card|交換)/.test(text),
      hasReceipt: /(?:領収|receipt|レシート)/.test(text),
      hasInvoice: /(?:請求|invoice|納品)/.test(text),
    };
    
    return extracted;
  }
  
  /**
   * ランチタイムかどうかを判定
   */
  private isLunchTime(times: any): boolean {
    if (times.lunchTime) return true;
    if (times.visitTime) {
      const hour = parseInt(times.visitTime.split(':')[0]);
      return hour >= 11 && hour <= 14;
    }
    return false;
  }
  
  /**
   * ディナータイムかどうかを判定
   */
  private isDinnerTime(times: any): boolean {
    if (times.dinnerTime) return true;
    if (times.visitTime) {
      const hour = parseInt(times.visitTime.split(':')[0]);
      return hour >= 17 && hour <= 22;
    }
    return false;
  }
  
  /**
   * 週末かどうかを判定
   */
  private isWeekend(dateStr?: string): boolean {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      const day = date.getDay();
      return day === 0 || day === 6; // 日曜日または土曜日
    } catch {
      return false;
    }
  }
  
  /**
   * 検索クエリを構築
   */
  private buildSearchQuery(ocrResult: OCRResult, extractedInfo: any): string {
    const components = [
      ocrResult.vendor || '',
      ...extractedInfo.keywords,
      extractedInfo.patterns.includes('parkingTime') ? '駐車場 利用料' : '',
      ocrResult.items?.map(item => item.name).join(' ') || '',
      `金額${ocrResult.amount}円`,
    ].filter(Boolean);
    
    return components.join(' ');
  }
  
  /**
   * 駐車場レシートかどうかを判定
   */
  private isParkingReceipt(ocrResult: OCRResult, extractedInfo: any): boolean {
    // 新しいOCRフィールドで既に駐車場として判定されている場合
    if (ocrResult.receiptType === 'parking') {
      return true;
    }
    
    const safeText = ocrResult.text && typeof ocrResult.text === 'string' ? ocrResult.text : '';
    const text = safeText.toLowerCase();
    const vendor = (ocrResult.vendor && typeof ocrResult.vendor === 'string' ? ocrResult.vendor : '').toLowerCase();
    const facilityName = (ocrResult.facilityName && typeof ocrResult.facilityName === 'string' ? ocrResult.facilityName : '').toLowerCase();
    const companyName = (ocrResult.companyName && typeof ocrResult.companyName === 'string' ? ocrResult.companyName : '').toLowerCase();
    
    // 複数の指標でスコアリング
    let score = 0;
    
    // ベンダー名による判定（最重要）
    if (vendor.includes('times') || vendor.includes('タイムズ') || 
        vendor.includes('パーキング') || vendor.includes('駐車場')) {
      score += 0.4;
    }
    
    // 施設名による判定
    if (facilityName.includes('times') || facilityName.includes('タイムズ') || 
        facilityName.includes('パーキング') || facilityName.includes('駐車場')) {
      score += 0.3;
    }
    
    // 運営会社名による判定
    if (companyName.includes('タイムズ24') || companyName.includes('times 24') || 
        companyName.includes('パーク24')) {
      score += 0.3;
    }
    
    // 駐車場専用フィールドの存在による判定
    if (ocrResult.entryTime || ocrResult.exitTime || ocrResult.parkingDuration) {
      score += 0.4;
    }
    
    // 時間情報による判定
    if (extractedInfo.times.parkingTime && extractedInfo.times.exitTime) {
      score += 0.3;
    }
    
    // 駐車場特有のキーワード
    const parkingKeywords = ['入庫', '出庫', '駐車時間', '駐車料金', '利用時間'];
    const keywordCount = parkingKeywords.filter(kw => text.includes(kw)).length;
    score += keywordCount * 0.1;
    
    // 料金体系による判定
    if (extractedInfo.prices.hourlyRate || extractedInfo.prices.maxDaily) {
      score += 0.2;
    }
    
    return score >= 0.5;
  }
  
  /**
   * 駐車場レシートの高度な分析
   */
  private async analyzeParkingReceipt(
    ocrResult: OCRResult, 
    extractedInfo: any,
    accountingInfo: string
  ): Promise<AccountCategoryPrediction> {
    // Perplexityで駐車場利用の会計処理を詳細に調査
    const parkingQuery = `
      駐車場利用料の勘定科目 旅費交通費 
      ${ocrResult.facilityName || ocrResult.vendor || ''} 
      ${ocrResult.parkingDuration || extractedInfo.times.duration || ''} 
      最新の税務処理
    `;
    
    const specificInfo = await this.mcpClient.searchAccountingInfo(parkingQuery);
    
    // 詳細な判定根拠を構築
    const reasoningDetails = [];
    
    if (ocrResult.companyName) {
      reasoningDetails.push(`運営会社: ${ocrResult.companyName}`);
    }
    if (ocrResult.facilityName) {
      reasoningDetails.push(`施設名: ${ocrResult.facilityName}`);
    }
    if (ocrResult.entryTime && ocrResult.exitTime) {
      reasoningDetails.push(`利用時間: ${ocrResult.entryTime} - ${ocrResult.exitTime}`);
    }
    if (ocrResult.parkingDuration) {
      reasoningDetails.push(`駐車時間: ${ocrResult.parkingDuration}`);
    }
    
    return {
      category: '旅費交通費',
      confidence: 0.95,
      reasoning: `
        駐車場利用と判定しました。
        【判定根拠】
        ${reasoningDetails.join('\n        ')}
        1. ベンダー名: ${ocrResult.vendor}
        2. 入出庫時刻の記載: ${extractedInfo.times.parkingTime || 'なし'} - ${extractedInfo.times.exitTime || 'なし'}
        3. 駐車時間: ${extractedInfo.times.duration || '不明'}
        4. 料金体系: 時間単位での課金
        
        【会計処理の根拠】
        ${specificInfo || accountingInfo}
      `.trim(),
      alternativeCategories: [
        { category: '会議費', confidence: 0.03 },
        { category: '接待交際費', confidence: 0.02 }
      ],
      taxNotes: '駐車場利用料は消費税の課税対象。仕入税額控除可能。',
      sources: ['Perplexity AI', '国税庁ガイドライン']
    };
  }
  
  /**
   * Problem Solving Agentを使用した複雑な分析（強化版）
   * 業種と文脈を考慮した高度な判定
   */
  private async performComplexAnalysis(
    ocrResult: OCRResult,
    extractedInfo: any,
    accountingInfo: string
  ): Promise<AccountCategoryPrediction> {
    try {
      // 業種別の判定ロジックを適用
      if (extractedInfo.businessType) {
        return await this.analyzeByBusinessType(
          ocrResult, 
          extractedInfo, 
          accountingInfo
        );
      }
      
      // Problem Solving Agentに分析を依頼（スタブ実装対応）
      try {
        const problemDescription = `
          以下のレシート情報から適切な勘定科目を判定してください：
          
          【基本情報】
          ベンダー: ${ocrResult.vendor || '不明'}
          金額: ${ocrResult.amount || '不明'}円
          日時: ${ocrResult.date || '不明'}
          
          【購入品目】
          ${ocrResult.items?.map(i => `- ${i.name}: ${i.price}円`).join('\n') || 'なし'}
          
          【抽出された情報】
          業種タイプ: ${extractedInfo.businessType || '不明'}
          キーワード: ${extractedInfo.keywords.join(', ')}
          購入品カテゴリ: ${Object.keys(extractedInfo.items).join(', ')}
          参加人数: ${extractedInfo.participants.numberOfPeople || '不明'}
          
          【文脈情報】
          ${JSON.stringify(extractedInfo.context, null, 2)}
          
          【判定の考慮事項】
          1. 業種特性を考慮（飲食店なら時間帯と人数で判定）
          2. 購入品目の内容（事務用品、食品、工具など）
          3. 利用目的の推定（会議資料の有無、複数人での利用など）
          4. 金額の妥当性（少額なら消耗品費、高額なら要検討）
          
          【参考情報】
          ${accountingInfo}
        `;
        
        const solution = await problemSolvingAgent.solve(problemDescription, { 
          type: 'accounting',
          country: 'Japan',
          taxSystem: 'consumption_tax',
          businessType: extractedInfo.businessType
        });
        
        // 解決策から勘定科目を抽出
        return this.parseSolutionToPrediction(solution, ocrResult);
        
      } catch (agentError) {
        logger.warn('Problem Solving Agent not available, falling back to rule-based analysis:', agentError);
        // Problem Solving Agentが利用できない場合は、直接フォールバック分析を実行
        return this.intelligentFallback(ocrResult);
      }
      
    } catch (error) {
      logger.error('Complex analysis failed:', error);
      // フォールバック
      return this.intelligentFallback(ocrResult);
    }
  }
  
  /**
   * Problem Solving Agentの結果を予測形式に変換
   */
  private parseSolutionToPrediction(solution: any, ocrResult: OCRResult): AccountCategoryPrediction {
    // AIの分析結果から勘定科目を抽出
    const analysisText = solution.reasoning || solution.solution || JSON.stringify(solution);
    
    // デフォルトの予測
    let prediction: AccountCategoryPrediction = {
      category: '消耗品費',
      confidence: 0.5,
      reasoning: 'AIによる分析結果',
      alternativeCategories: []
    };
    
    // Problem Solving Agentが失敗した場合のフォールバック
    if (!solution.success) {
      logger.debug('Problem Solving Agent failed, using fallback logic');
      return this.intelligentFallback(ocrResult);
    }
    
    // 分析結果から勘定科目を推定
    const categoryMappings = {
      '旅費交通費': ['交通', '駐車', 'タクシー', '電車', 'バス', 'ガソリン'],
      '会議費': ['カフェ', '喫茶', '打ち合わせ', 'ミーティング'],
      '接待交際費': ['レストラン', '飲食', '接待', '懇親'],
      '消耗品費': ['文房具', '事務用品', '日用品', '消耗品'],
      '通信費': ['電話', 'インターネット', '通信', '携帯'],
    };
    
    Object.entries(categoryMappings).forEach(([category, keywords]) => {
      const matchCount = keywords.filter(kw => 
        analysisText.toLowerCase().includes(kw)
      ).length;
      
      if (matchCount > 0) {
        prediction.category = category;
        prediction.confidence = Math.min(0.7 + matchCount * 0.1, 0.95);
      }
    });
    
    prediction.reasoning = `
      Problem Solving Agentによる総合分析：
      ${solution.reasoning || 'スタブ実装により詳細な分析は現在利用できません'}
      
      分析ステップ：
      ${solution.steps?.join('\n') || ''}
    `.trim();
    
    return prediction;
  }
  
  /**
   * 業種タイプに基づく詳細分析
   */
  private async analyzeByBusinessType(
    ocrResult: OCRResult,
    extractedInfo: any,
    accountingInfo: string
  ): Promise<AccountCategoryPrediction> {
    const businessType = extractedInfo.businessType;
    const amount = ocrResult.amount || 0;
    const context = extractedInfo.context;
    
    // 飲食店の場合の判定ロジック
    if (['restaurant', 'cafe', 'izakaya', 'sushi', 'yakiniku', 'fastfood'].includes(businessType)) {
      return this.analyzeFoodServiceReceipt(ocrResult, extractedInfo, businessType);
    }
    
    // 小売店の場合の判定ロジック
    if (['convenience', 'supermarket', 'homecenter', 'electronics', 'drugstore'].includes(businessType)) {
      return this.analyzeRetailReceipt(ocrResult, extractedInfo, businessType);
    }
    
    // サービス業の場合の判定ロジック
    if (['gasstation', 'parking', 'cleaning', 'hairsalon'].includes(businessType)) {
      return this.analyzeServiceReceipt(ocrResult, extractedInfo, businessType);
    }
    
    // 交通機関の場合の判定ロジック
    if (['taxi', 'train', 'bus', 'airline'].includes(businessType)) {
      return this.analyzeTransportReceipt(ocrResult, extractedInfo, businessType);
    }
    
    // その他の場合はデフォルトの分析を実行
    return this.intelligentFallback(ocrResult);
  }
  
  /**
   * 飲食店レシートの分析
   */
  private analyzeFoodServiceReceipt(
    ocrResult: OCRResult,
    extractedInfo: any,
    businessType: string
  ): AccountCategoryPrediction {
    const amount = ocrResult.amount || 0;
    const participants = extractedInfo.participants.numberOfPeople || 1;
    const context = extractedInfo.context;
    const perPersonAmount = amount / participants;
    
    // カフェの場合
    if (businessType === 'cafe') {
      if (context.hasMeetingItems || (participants <= 4 && perPersonAmount <= 1500)) {
        return {
          category: '会議費',
          confidence: 0.85,
          reasoning: `カフェでの打ち合わせと判定。参加人数${participants}名、一人当たり${perPersonAmount}円。`,
          alternativeCategories: [
            { category: '接待交際費', confidence: 0.10 },
            { category: '福利厚生費', confidence: 0.05 }
          ],
          taxNotes: '会議費として処理する場合は、会議の内容や参加者を記録しておくこと。'
        };
      }
    }
    
    // 居酒屋・レストランの場合
    if (['restaurant', 'izakaya', 'sushi', 'yakiniku'].includes(businessType)) {
      // 高額な場合は接待交際費
      if (perPersonAmount >= 5000 || context.hasAlcohol) {
        return {
          category: '接待交際費',
          confidence: 0.90,
          reasoning: `${this.getBusinessTypeName(businessType)}での飲食。一人当たり${perPersonAmount}円。${context.hasAlcohol ? 'アルコール含む。' : ''}`,
          alternativeCategories: [
            { category: '会議費', confidence: 0.08 },
            { category: '福利厚生費', confidence: 0.02 }
          ],
          taxNotes: '接待交際費は損金算入に制限があるため、相手先と目的を明確に記録すること。'
        };
      }
      // 昼食時間帯で少額の場合
      if (context.isLunchTime && perPersonAmount <= 1500) {
        return {
          category: '会議費',
          confidence: 0.75,
          reasoning: `ランチミーティングと判定。時間帯と金額から判断。`,
          alternativeCategories: [
            { category: '福利厚生費', confidence: 0.20 },
            { category: '接待交際費', confidence: 0.05 }
          ]
        };
      }
    }
    
    // ファストフードの場合
    if (businessType === 'fastfood') {
      if (amount <= 2000) {
        return {
          category: '福利厚生費',
          confidence: 0.70,
          reasoning: `ファストフードでの少額飲食。従業員の食事代と推定。`,
          alternativeCategories: [
            { category: '会議費', confidence: 0.20 },
            { category: '消耗品費', confidence: 0.10 }
          ]
        };
      }
    }
    
    // デフォルト
    return {
      category: '接待交際費',
      confidence: 0.65,
      reasoning: `飲食店での支出。詳細な目的が不明なため接待交際費として処理。`,
      alternativeCategories: [
        { category: '会議費', confidence: 0.25 },
        { category: '福利厚生費', confidence: 0.10 }
      ]
    };
  }
  
  /**
   * 小売店レシートの分析
   */
  private analyzeRetailReceipt(
    ocrResult: OCRResult,
    extractedInfo: any,
    businessType: string
  ): AccountCategoryPrediction {
    const items = extractedInfo.items;
    
    // ホームセンターの場合
    if (businessType === 'homecenter') {
      if (items.tools) {
        const amount = ocrResult.amount || 0;
        if (amount >= 10000) {
          return {
            category: '工具器具備品',
            confidence: 0.85,
            reasoning: `ホームセンターで工具類を購入。金額${amount}円のため資産計上。`,
            alternativeCategories: [
              { category: '消耗品費', confidence: 0.10 },
              { category: '修繕費', confidence: 0.05 }
            ],
            taxNotes: '10万円以上の工具は固定資産として減価償却が必要。'
          };
        } else {
          return {
            category: '消耗品費',
            confidence: 0.80,
            reasoning: `ホームセンターで少額の工具・消耗品を購入。`,
            alternativeCategories: [
              { category: '修繕費', confidence: 0.15 },
              { category: '事務用品費', confidence: 0.05 }
            ]
          };
        }
      }
      if (items.cleaning) {
        return {
          category: '消耗品費',
          confidence: 0.90,
          reasoning: `清掃用品・衛生用品の購入。`,
          alternativeCategories: [
            { category: '福利厚生費', confidence: 0.10 }
          ]
        };
      }
    }
    
    // コンビニの場合
    if (businessType === 'convenience') {
      if (items.officeSupplies) {
        return {
          category: '事務用品費',
          confidence: 0.85,
          reasoning: `コンビニで事務用品を購入。`,
          alternativeCategories: [
            { category: '消耗品費', confidence: 0.15 }
          ]
        };
      }
      if (items.food && extractedInfo.context.hasMeetingItems) {
        return {
          category: '会議費',
          confidence: 0.75,
          reasoning: `会議用の飲食物を購入。`,
          alternativeCategories: [
            { category: '福利厚生費', confidence: 0.20 },
            { category: '消耗品費', confidence: 0.05 }
          ]
        };
      }
    }
    
    // 家電量販店の場合
    if (businessType === 'electronics') {
      const amount = ocrResult.amount || 0;
      if (amount >= 100000) {
        return {
          category: '工具器具備品',
          confidence: 0.90,
          reasoning: `家電量販店で高額機器を購入。資産計上が必要。`,
          alternativeCategories: [
            { category: '消耗品費', confidence: 0.10 }
          ],
          taxNotes: '10万円以上の電子機器は固定資産として計上し、耐用年数に応じて減価償却。'
        };
      }
    }
    
    // デフォルト
    return {
      category: '消耗品費',
      confidence: 0.70,
      reasoning: `小売店での購入。品目詳細から消耗品と判定。`,
      alternativeCategories: [
        { category: '事務用品費', confidence: 0.20 },
        { category: '福利厚生費', confidence: 0.10 }
      ]
    };
  }
  
  /**
   * サービス業レシートの分析
   */
  private analyzeServiceReceipt(
    ocrResult: OCRResult,
    extractedInfo: any,
    businessType: string
  ): AccountCategoryPrediction {
    // ガソリンスタンドの場合
    if (businessType === 'gasstation') {
      return {
        category: '旅費交通費',
        confidence: 0.95,
        reasoning: `ガソリンスタンドでの給油。車両燃料費として処理。`,
        alternativeCategories: [
          { category: '車両費', confidence: 0.05 }
        ],
        taxNotes: '車両の業務使用割合に応じて按分が必要な場合あり。'
      };
    }
    
    // 駐車場の場合（既存のロジックを活用）
    if (businessType === 'parking') {
      return this.analyzeParkingReceipt(ocrResult, extractedInfo, '');
    }
    
    // クリーニングの場合
    if (businessType === 'cleaning') {
      return {
        category: '福利厚生費',
        confidence: 0.80,
        reasoning: `クリーニング代。従業員の制服等のクリーニングと推定。`,
        alternativeCategories: [
          { category: '消耗品費', confidence: 0.15 },
          { category: '雑費', confidence: 0.05 }
        ]
      };
    }
    
    // 理美容の場合
    if (businessType === 'hairsalon') {
      return {
        category: '福利厚生費',
        confidence: 0.60,
        reasoning: `理美容サービス。業務関連性を要確認。`,
        alternativeCategories: [
          { category: '接待交際費', confidence: 0.30 },
          { category: '雑費', confidence: 0.10 }
        ],
        taxNotes: '個人的な支出は経費計上不可。業務との関連性を明確にすること。'
      };
    }
    
    return this.intelligentFallback(ocrResult);
  }
  
  /**
   * 交通機関レシートの分析
   */
  private analyzeTransportReceipt(
    ocrResult: OCRResult,
    extractedInfo: any,
    businessType: string
  ): AccountCategoryPrediction {
    // すべての交通機関は基本的に旅費交通費
    return {
      category: '旅費交通費',
      confidence: 0.95,
      reasoning: `${this.getBusinessTypeName(businessType)}の利用料金。`,
      alternativeCategories: [],
      taxNotes: '出張の場合は出張旅費規程に従って処理。通勤費は非課税限度額に注意。'
    };
  }
  
  /**
   * 業種タイプの日本語名を取得
   */
  private getBusinessTypeName(businessType: string): string {
    const names: { [key: string]: string } = {
      restaurant: 'レストラン',
      cafe: 'カフェ',
      izakaya: '居酒屋',
      sushi: '寿司店',
      yakiniku: '焼肉店',
      fastfood: 'ファストフード',
      convenience: 'コンビニ',
      supermarket: 'スーパー',
      homecenter: 'ホームセンター',
      electronics: '家電量販店',
      drugstore: 'ドラッグストア',
      gasstation: 'ガソリンスタンド',
      parking: '駐車場',
      cleaning: 'クリーニング店',
      hairsalon: '理美容店',
      taxi: 'タクシー',
      train: '鉄道',
      bus: 'バス',
      airline: '航空会社'
    };
    return names[businessType] || businessType;
  }
  
  /**
   * インテリジェントなフォールバック処理
   */
  private intelligentFallback(ocrResult: OCRResult): AccountCategoryPrediction {
    const safeText = ocrResult.text && typeof ocrResult.text === 'string' ? ocrResult.text : '';
    const text = safeText.toLowerCase();
    const vendor = (ocrResult.vendor && typeof ocrResult.vendor === 'string' ? ocrResult.vendor : '').toLowerCase();
    
    // パターンベースの高度な分析
    const patterns = {
      '旅費交通費': {
        keywords: ['駐車', 'パーキング', 'times', 'タクシー', '電車', 'バス', 'ガソリン', '高速'],
        score: 0
      },
      '会議費': {
        keywords: ['カフェ', 'コーヒー', 'スターバックス', 'ドトール', '喫茶'],
        score: 0
      },
      '接待交際費': {
        keywords: ['レストラン', '居酒屋', '寿司', '焼肉', '和食', '中華'],
        score: 0
      },
      '消耗品費': {
        keywords: ['コンビニ', 'ローソン', 'セブン', '文房具', '事務用品'],
        score: 0
      }
    };
    
    // スコアリング
    Object.entries(patterns).forEach(([category, data]) => {
      data.keywords.forEach(keyword => {
        if (vendor.includes(keyword) || text.includes(keyword)) {
          patterns[category].score += 1;
        }
      });
    });
    
    // 最高スコアのカテゴリを選択
    const bestCategory = Object.entries(patterns)
      .sort((a, b) => b[1].score - a[1].score)[0];
    
    const confidence = bestCategory[1].score > 0 
      ? Math.min(0.6 + bestCategory[1].score * 0.1, 0.9)
      : 0.5;
    
    return {
      category: bestCategory[0],
      confidence,
      reasoning: `キーワード分析により${bestCategory[0]}と判定（マッチ数: ${bestCategory[1].score}）`,
      alternativeCategories: Object.entries(patterns)
        .filter(([cat]) => cat !== bestCategory[0] && patterns[cat].score > 0)
        .map(([cat]) => ({
          category: cat,
          confidence: Math.min(0.3 + patterns[cat].score * 0.1, 0.6)
        }))
        .slice(0, 2)
    };
  }

  /**
   * 学習データに基づく推論の改善
   * AccountLearningSystemと連携して、過去の分類結果を参考にする
   */
  async improveWithLearningData(
    prediction: AccountCategoryPrediction,
    companyId: string,
    vendorName: string
  ): Promise<AccountCategoryPrediction> {
    try {
      // 学習システムから過去の分類データを取得
      const { AccountLearningSystem } = await import('./account-learning-system');
      const learningSystem = new AccountLearningSystem();
      
      const learnedPrediction = await learningSystem.predictAccountCategory(
        companyId,
        vendorName
      );
      
      if (learnedPrediction && learnedPrediction.confidence >= 0.8) {
        // 学習データの信頼度が高い場合は、それを優先
        return {
          category: learnedPrediction.category,
          confidence: learnedPrediction.confidence,
          reasoning: `過去の分類実績に基づいて判定しました。${prediction.reasoning}`,
          alternativeCategories: [
            { 
              category: prediction.category, 
              confidence: prediction.confidence * 0.8 
            },
            ...(prediction.alternativeCategories || []).slice(0, 1)
          ],
          taxNotes: prediction.taxNotes,
          sources: [...(prediction.sources || []), '学習データ']
        };
      } else if (learnedPrediction && learnedPrediction.category === prediction.category) {
        // AIの推論と学習データが一致する場合は信頼度を上げる
        return {
          ...prediction,
          confidence: Math.min(prediction.confidence * 1.1, 0.98),
          reasoning: `${prediction.reasoning}\n\n【学習データとの一致】過去の分類実績とも一致しています。`,
          sources: [...(prediction.sources || []), '学習データ（一致）']
        };
      }
    } catch (error) {
      logger.debug('Learning data not available, using AI prediction only');
    }

    return prediction;
  }

  /**
   * 確認フロー付きの勘定科目推論
   * 税金関連や高額取引など、確認が必要なケースを検出し、質問を生成
   * 但し書きや明細の曖昧さ、公的機関との矛盾も検出
   */
  async predictWithConfirmationFlow(
    ocrResult: OCRResult,
    companyId?: string
  ): Promise<AccountCategoryPrediction> {
    // まず通常の推論を実行
    const basePrediction = await this.predictAccountCategory(ocrResult, companyId);

    // 発行者名と金額を取得
    const vendorName = ocrResult.vendor_name || ocrResult.vendor || '';
    const amount = ocrResult.total_amount || ocrResult.amount || 0;

    // 但し書き（notes）を取得
    const notes = (ocrResult as any).notes || '';

    // 明細項目の名前・説明を取得
    const items = (ocrResult as any).items || [];
    const itemDescriptions: string[] = items.map((item: any) => {
      const name = item.itemName || item.name || '';
      const desc = item.description || '';
      return [name, desc].filter(Boolean).join(' ');
    }).filter(Boolean);

    logger.debug('[AccountCategoryAI] 確認フローチェック:', {
      vendorName,
      amount,
      notes,
      itemDescriptions,
    });

    // 確認が必要かどうかをチェック（但し書き・明細も考慮）
    const confirmationCheck = checkConfirmationNeeded(
      vendorName,
      amount,
      basePrediction.category,
      basePrediction.confidence,
      notes,
      itemDescriptions
    );

    if (confirmationCheck.needsConfirmation) {
      logger.info('[AccountCategoryAI] 確認フロートリガー:', {
        vendorName,
        amount,
        notes,
        itemDescriptions,
        reasons: confirmationCheck.reasons,
        questionsCount: confirmationCheck.suggestedQuestions.length,
      });

      return {
        ...basePrediction,
        needsConfirmation: true,
        confirmationStatus: 'pending',
        confirmationQuestions: confirmationCheck.suggestedQuestions,
        confirmationReasons: confirmationCheck.reasons,
        pendingCategory: confirmationCheck.pendingCategory,
        reasoning: `${basePrediction.reasoning}\n\n【確認が必要】${confirmationCheck.reasons.join('、')}`,
      };
    }

    // 確認不要の場合はそのまま返す
    return {
      ...basePrediction,
      needsConfirmation: false,
      confirmationStatus: 'confirmed',
    };
  }

  /**
   * 確認回答を処理して最終的な勘定科目を決定
   */
  processConfirmationAnswers(
    answers: Array<{ questionId: string; answer: string; resultCategory?: string }>
  ): { category: string; reasoning: string } {
    let finalCategory = '未分類';
    const reasoningParts: string[] = [];

    for (const answer of answers) {
      if (answer.resultCategory) {
        finalCategory = answer.resultCategory;
        reasoningParts.push(`質問「${answer.questionId}」への回答「${answer.answer}」に基づき、「${answer.resultCategory}」に分類`);
        break; // 最初に決定したカテゴリを使用
      }
    }

    return {
      category: finalCategory,
      reasoning: reasoningParts.length > 0
        ? `【ユーザー確認済み】${reasoningParts.join('。')}`
        : '確認回答から勘定科目を特定できませんでした',
    };
  }
}