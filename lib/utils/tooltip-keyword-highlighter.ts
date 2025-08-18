/**
 * ツールチップキーワードハイライト用ユーティリティ
 * Created: 2025-08-18
 * 特定のキーワードのみをハイライトして他のテキストはそのまま表示する共通関数
 */

// ツールチップ辞書の定義
export const TOOLTIP_DICTIONARY = new Map<string, string>([
  ['LLMO', '大規模言語モデル最適化技術'],
  ['SaaS', 'Software as a Service - クラウド経由で提供されるソフトウェア'],
  ['API', 'Application Programming Interface - システム間の連携インターフェース'],
  ['UI/UX', 'ユーザーインターフェース/ユーザー体験 - 使いやすさとデザイン'],
  ['レスポンシブ', 'PC・スマホ・タブレットなど、あらゆる画面サイズに対応'],
  ['SEO', 'Search Engine Optimization - 検索エンジン最適化'],
  ['ROI', 'Return on Investment - 投資収益率'],
  ['KPI', 'Key Performance Indicator - 重要業績評価指標'],
  ['リードタイム', '発注から納品までの期間'],
  ['LLMOモニタリング', 'AIを活用したWebサイトの最適化とモニタリングサービス。サイトのパフォーマンス、検索順位、ユーザー行動を継続的に分析し、改善提案を行います'],
  ['モニタリング', 'サイトのパフォーマンスや検索順位を継続的に監視・分析するサービス'],
  ['最適化', 'システムやプロセスをより効率的に改善すること'],
  ['パフォーマンス', 'システムの処理能力や応答速度の性能'],
  ['システム', 'コンピュータとソフトウェアを組み合わせた仕組み'],
  ['開発', 'ソフトウェアやシステムを設計・構築すること'],
  ['構築', 'システムやWebサイトを作り上げること'],
  ['設計', 'システムの設計図を作成すること'],
  ['保守', 'システムの維持・管理・改善作業'],
  ['運用', 'システムを日常的に運用・管理すること'],
  ['メンテナンス', 'システムの保守点検・改良作業'],
  ['アップデート', 'ソフトウェアやシステムの更新・改善'],
  ['カスタマイズ', 'お客様のご要望に合わせた独自の調整・改修'],
  ['サポート', '技術支援・問題解決・使い方指導']
]);

/**
 * HTMLエスケープ処理
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 正規表現用の特殊文字をエスケープ
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * テキストからツールチップ辞書のキーワードを検索して最初にマッチしたものを返す
 */
export function findMatchingKeyword(
  text: string,
  dictionary: Map<string, string> = TOOLTIP_DICTIONARY
): { keyword: string; tooltip: string } | null {
  // 長いキーワードから順に検索（例：「LLMOモニタリング」が「LLMO」より優先）
  const sortedKeywords = Array.from(dictionary.keys()).sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    if (text.includes(keyword)) {
      const tooltip = dictionary.get(keyword);
      if (tooltip) {
        return { keyword, tooltip };
      }
    }
  }
  
  return null;
}

/**
 * Web版: キーワードをマーカーでハイライトしてツールチップ付きにする
 * @param text ハイライト対象のテキスト
 * @param dictionary ツールチップ辞書（省略可）
 * @returns ハイライト済みHTML文字列
 */
export function highlightKeywordForWeb(
  text: string,
  dictionary: Map<string, string> = TOOLTIP_DICTIONARY
): string {
  const match = findMatchingKeyword(text, dictionary);
  
  if (!match) {
    return escapeHtml(text);
  }
  
  const escapedText = escapeHtml(text);
  const escapedKeyword = escapeHtml(match.keyword);
  const escapedTooltip = escapeHtml(match.tooltip);
  
  // キーワード部分だけをツールチップ付きのマーカーに置き換え
  const highlightedText = escapedText.replace(
    new RegExp(escapeRegex(escapedKeyword), 'g'),
    `<span class="tooltip-wrapper" data-tooltip="${escapedTooltip}" tabindex="0">
      <span style="
        background: linear-gradient(180deg, transparent 60%, rgba(254, 240, 138, 0.7) 60%);
        cursor: help;
        border-radius: 3px;
        padding: 1px 4px;
        border-bottom: 2px dotted #f59e0b;
        font-weight: 500;
      ">${escapedKeyword}</span>
      <span class="tooltip-content">💡 ${escapedTooltip}</span>
    </span>`
  );
  
  return highlightedText;
}

/**
 * メール版: キーワードを軽くハイライトしてインライン注釈を付ける
 * @param text ハイライト対象のテキスト
 * @param dictionary ツールチップ辞書（省略可）
 * @param maxTooltipLength ツールチップの最大文字数（省略時は30文字）
 * @returns ハイライト済みHTML文字列
 */
export function highlightKeywordForEmail(
  text: string,
  dictionary: Map<string, string> = TOOLTIP_DICTIONARY,
  maxTooltipLength: number = 30
): string {
  const match = findMatchingKeyword(text, dictionary);
  
  if (!match) {
    return escapeHtml(text);
  }
  
  const escapedText = escapeHtml(text);
  const escapedKeyword = escapeHtml(match.keyword);
  
  // 長い説明文は制限文字数で切って省略記号を付ける
  const trimmedTooltip = match.tooltip.length > maxTooltipLength 
    ? match.tooltip.substring(0, maxTooltipLength) + '...' 
    : match.tooltip;
  const escapedTooltip = escapeHtml(trimmedTooltip);
  
  // キーワード部分のみに注釈を適用（シンプルな強調表示）
  const annotationStyle = 'color: #6b7280; font-size: 0.85em; margin-left: 6px; font-weight: normal;';
  const highlightedText = escapedText.replace(
    new RegExp(escapeRegex(escapedKeyword), 'g'),
    `<span style="background: rgba(254, 240, 138, 0.3); padding: 1px 2px; border-radius: 2px; font-weight: 500;">${escapedKeyword}</span><span style="${annotationStyle}">（${escapedTooltip}）</span>`
  );
  
  return highlightedText;
}

/**
 * デバッグ用: キーワードのマッチングをテストする関数
 */
export function testKeywordMatching(testCases: string[]): void {
  console.log('🧪 Testing keyword matching...');
  
  testCases.forEach(testCase => {
    const match = findMatchingKeyword(testCase);
    console.log(`Input: "${testCase}"`);
    if (match) {
      console.log(`✅ Matched: "${match.keyword}" -> "${match.tooltip.substring(0, 50)}..."`);
    } else {
      console.log('❌ No match found');
    }
    console.log('---');
  });
}