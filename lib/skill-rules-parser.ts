/**
 * SKILL.mdからルールを読み込むパーサー
 *
 * SKILL.mdが唯一の情報源（Single Source of Truth）
 * コードはSKILL.mdを読み込んでルールを適用する
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';

interface AccountCategoryRules {
  governmentKeywords: string[];  // 公的機関 → 租税公課
  restaurantKeywords: string[];  // 飲食関連（店舗判定用）
  alcoholKeywords: string[];     // お酒あり → 接待交際費
  nonAlcoholKeywords: string[];  // お酒なし → 会議費
  parkingKeywords: string[];     // 駐車場 → 旅費交通費
  convenienceKeywords: string[]; // コンビニ → 消耗品費
  gasStationKeywords: string[];  // ガソリン → 車両費
}

// SKILL.mdのパス
const SKILL_MD_PATH = path.join(
  process.env.HOME || '/Users/tonychustudio',
  '.claude/skills/ai-accounting-system/SKILL.md'
);

// キャッシュ（SKILL.mdを毎回読まないように）
let cachedRules: AccountCategoryRules | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000; // 1分間キャッシュ

/**
 * SKILL.mdからルールを読み込む
 */
export function loadRulesFromSkillMd(): AccountCategoryRules {
  const now = Date.now();

  // キャッシュが有効ならキャッシュを返す
  if (cachedRules && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedRules;
  }

  try {
    const content = fs.readFileSync(SKILL_MD_PATH, 'utf-8');
    cachedRules = parseSkillMd(content);
    cacheTimestamp = now;
    logger.info('[SkillRulesParser] Loaded rules from SKILL.md', {
      governmentKeywords: cachedRules.governmentKeywords.length,
      restaurantKeywords: cachedRules.restaurantKeywords.length,
      alcoholKeywords: cachedRules.alcoholKeywords.length,
      nonAlcoholKeywords: cachedRules.nonAlcoholKeywords.length,
      parkingKeywords: cachedRules.parkingKeywords.length,
      convenienceKeywords: cachedRules.convenienceKeywords.length,
      gasStationKeywords: cachedRules.gasStationKeywords.length,
    });
    return cachedRules;
  } catch (error) {
    logger.error('[SkillRulesParser] Failed to load SKILL.md, using defaults:', error);
    return getDefaultRules();
  }
}

/**
 * SKILL.mdの内容をパースしてルールを抽出
 */
function parseSkillMd(content: string): AccountCategoryRules {
  const rules: AccountCategoryRules = {
    governmentKeywords: [],
    restaurantKeywords: [],
    alcoholKeywords: [],
    nonAlcoholKeywords: [],
    parkingKeywords: [],
    convenienceKeywords: [],
    gasStationKeywords: [],
  };

  // ========================================
  // ルール1: 公的機関 → 租税公課
  // ========================================
  const governmentSection = extractSection(content, '#### 1. 公的機関 → 租税公課', '####');
  if (governmentSection) {
    rules.governmentKeywords = extractKeywordsFromTable(governmentSection);
    logger.debug('[SkillRulesParser] Government keywords:', rules.governmentKeywords);
  }

  // ========================================
  // ルール2: 飲食関連 → 会議費 / 接待交際費
  // ========================================
  const restaurantSection = extractSection(content, '#### 2. 飲食関連 → 会議費 / 接待交際費', '####');
  if (restaurantSection) {
    // 飲食店キーワード（店舗判定用）
    const restaurantSubSection = extractSubSection(restaurantSection, '**飲食店キーワード（店舗判定用）:**', '**');
    if (restaurantSubSection) {
      rules.restaurantKeywords = extractKeywordsFromTable(restaurantSubSection);
      logger.debug('[SkillRulesParser] Restaurant keywords:', rules.restaurantKeywords);
    }

    // お酒ありキーワード
    const alcoholSubSection = extractSubSection(restaurantSection, '**お酒ありキーワード（→ 接待交際費）:**', '**');
    if (alcoholSubSection) {
      rules.alcoholKeywords = extractKeywordsFromTable(alcoholSubSection);
      logger.debug('[SkillRulesParser] Alcohol keywords:', rules.alcoholKeywords);
    }

    // お酒なしキーワード
    const nonAlcoholSubSection = extractSubSection(restaurantSection, '**お酒なしキーワード（→ 会議費）:**', '**');
    if (nonAlcoholSubSection) {
      rules.nonAlcoholKeywords = extractKeywordsFromTable(nonAlcoholSubSection);
      logger.debug('[SkillRulesParser] Non-alcohol keywords:', rules.nonAlcoholKeywords);
    }
  }

  // ========================================
  // ルール3: 駐車場 → 旅費交通費
  // ========================================
  const parkingSection = extractSection(content, '#### 3. 駐車場 → 旅費交通費', '####');
  if (parkingSection) {
    rules.parkingKeywords = extractKeywordsFromTable(parkingSection);
    logger.debug('[SkillRulesParser] Parking keywords:', rules.parkingKeywords);
  }

  // ========================================
  // ルール4: コンビニ → 消耗品費
  // ========================================
  const convenienceSection = extractSection(content, '#### 4. コンビニ → 消耗品費', '####');
  if (convenienceSection) {
    rules.convenienceKeywords = extractKeywordsFromTable(convenienceSection);
    logger.debug('[SkillRulesParser] Convenience keywords:', rules.convenienceKeywords);
  }

  // ========================================
  // ルール5: ガソリンスタンド → 車両費
  // ========================================
  const gasStationSection = extractSection(content, '#### 5. ガソリンスタンド → 車両費', '####');
  if (gasStationSection) {
    rules.gasStationKeywords = extractKeywordsFromTable(gasStationSection);
    logger.debug('[SkillRulesParser] Gas station keywords:', rules.gasStationKeywords);
  }

  // フォールバック: SKILL.mdから読めなかった場合はデフォルト値を使用
  const defaults = getDefaultRules();
  if (rules.governmentKeywords.length === 0) {
    rules.governmentKeywords = defaults.governmentKeywords;
    logger.warn('[SkillRulesParser] Using default government keywords');
  }
  if (rules.restaurantKeywords.length === 0) {
    rules.restaurantKeywords = defaults.restaurantKeywords;
    logger.warn('[SkillRulesParser] Using default restaurant keywords');
  }
  if (rules.alcoholKeywords.length === 0) {
    rules.alcoholKeywords = defaults.alcoholKeywords;
    logger.warn('[SkillRulesParser] Using default alcohol keywords');
  }
  if (rules.nonAlcoholKeywords.length === 0) {
    rules.nonAlcoholKeywords = defaults.nonAlcoholKeywords;
    logger.warn('[SkillRulesParser] Using default non-alcohol keywords');
  }
  if (rules.parkingKeywords.length === 0) {
    rules.parkingKeywords = defaults.parkingKeywords;
    logger.warn('[SkillRulesParser] Using default parking keywords');
  }
  if (rules.convenienceKeywords.length === 0) {
    rules.convenienceKeywords = defaults.convenienceKeywords;
    logger.warn('[SkillRulesParser] Using default convenience keywords');
  }
  if (rules.gasStationKeywords.length === 0) {
    rules.gasStationKeywords = defaults.gasStationKeywords;
    logger.warn('[SkillRulesParser] Using default gas station keywords');
  }

  return rules;
}

/**
 * 指定されたセクションを抽出
 */
function extractSection(content: string, startMarker: string, endMarker: string): string | null {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return null;

  const afterStart = content.substring(startIndex + startMarker.length);
  const endIndex = afterStart.indexOf(endMarker);

  if (endIndex === -1) {
    return afterStart;
  }
  return afterStart.substring(0, endIndex);
}

/**
 * サブセクションを抽出（**見出し**形式）
 */
function extractSubSection(section: string, startMarker: string, endMarker: string): string | null {
  const startIndex = section.indexOf(startMarker);
  if (startIndex === -1) return null;

  const afterStart = section.substring(startIndex + startMarker.length);
  // 次の**マーカーまたはセクション終端まで
  const endIndex = afterStart.indexOf(endMarker);

  if (endIndex === -1) {
    return afterStart;
  }
  return afterStart.substring(0, endIndex);
}

/**
 * Markdownテーブルからキーワードを抽出
 */
function extractKeywordsFromTable(section: string): string[] {
  const keywords: string[] = [];
  const lines = section.split('\n');

  for (const line of lines) {
    // テーブル行を検出（| で始まる行）
    if (line.trim().startsWith('|') && !line.includes('---')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 1) {
        // 最初のセル（キーワード列）を取得
        const keyword = cells[0];
        if (keyword && keyword !== 'キーワード') {
          keywords.push(keyword);
        }
      }
    }
  }

  return keywords;
}

/**
 * デフォルトルール（SKILL.md読み込み失敗時のフォールバック）
 */
function getDefaultRules(): AccountCategoryRules {
  return {
    governmentKeywords: [
      '福祉事務所', '市役所', '区役所', '町役場', '村役場',
      '税務署', '法務局', '県庁', '都庁', '府庁',
      '国税', '地方税', '収入印紙', '印紙税', '登録免許税', '自動車税', '固定資産税',
    ],
    restaurantKeywords: [
      'レストラン', 'カフェ', '喫茶', '食堂', '定食', 'ランチ',
      'ラーメン', 'そば', 'うどん', '焼肉', 'ステーキ', '寿司',
      'ピザ', 'パスタ', 'イタリアン', '中華', 'カレー', 'ハンバーグ',
      'マクドナルド', 'スターバックス', 'ドトール', 'サイゼリヤ', 'ガスト',
    ],
    alcoholKeywords: [
      '居酒屋', 'バー', 'スナック', 'クラブ', 'パブ',
      'ビール', '日本酒', '焼酎', 'ワイン', 'カクテル', 'ハイボール',
      '飲み放題', '宴会', '二次会', '打ち上げ',
    ],
    nonAlcoholKeywords: [
      'コーヒー', '紅茶', 'ジュース', 'お茶', 'ソフトドリンク',
    ],
    parkingKeywords: [
      '駐車場', 'パーキング', 'コインパーキング', '駐車料金',
      'タイムズ', 'リパーク', 'NPC24',
    ],
    convenienceKeywords: [
      'セブンイレブン', 'ファミリーマート', 'ローソン',
      'ミニストップ', 'デイリーヤマザキ', 'セイコーマート',
    ],
    gasStationKeywords: [
      'ガソリン', '給油', '燃料', '軽油',
      'エネオス', 'ENEOS', '出光', 'コスモ', 'シェル',
    ],
  };
}

/**
 * キャッシュをクリア（SKILL.md更新後に強制リロード）
 */
export function clearRulesCache(): void {
  cachedRules = null;
  cacheTimestamp = 0;
  logger.info('[SkillRulesParser] Cache cleared');
}

export type { AccountCategoryRules };
