/**
 * 文字列正規化ユーティリティ
 * 銀行取引データと請求書データのマッチング精度を向上させるための文字列処理
 */

/**
 * 半角カタカナを全角カタカナに変換
 */
export function hankakuToZenkaku(str: string): string {
  const hankakuKatakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｬｭｮｯｰ､｡｢｣･';
  const zenkakuKatakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォャュョッー、。「」・';
  
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = hankakuKatakana.indexOf(char);
    
    if (index >= 0) {
      result += zenkakuKatakana[index];
    } else if (char === 'ﾞ' && result.length > 0) {
      // 濁点の処理
      const lastChar = result[result.length - 1];
      const dakutenMap: { [key: string]: string } = {
        'カ': 'ガ', 'キ': 'ギ', 'ク': 'グ', 'ケ': 'ゲ', 'コ': 'ゴ',
        'サ': 'ザ', 'シ': 'ジ', 'ス': 'ズ', 'セ': 'ゼ', 'ソ': 'ゾ',
        'タ': 'ダ', 'チ': 'ヂ', 'ツ': 'ヅ', 'テ': 'デ', 'ト': 'ド',
        'ハ': 'バ', 'ヒ': 'ビ', 'フ': 'ブ', 'ヘ': 'ベ', 'ホ': 'ボ',
        'ウ': 'ヴ'
      };
      if (dakutenMap[lastChar]) {
        result = result.slice(0, -1) + dakutenMap[lastChar];
      }
    } else if (char === 'ﾟ' && result.length > 0) {
      // 半濁点の処理
      const lastChar = result[result.length - 1];
      const handakutenMap: { [key: string]: string } = {
        'ハ': 'パ', 'ヒ': 'ピ', 'フ': 'プ', 'ヘ': 'ペ', 'ホ': 'ポ'
      };
      if (handakutenMap[lastChar]) {
        result = result.slice(0, -1) + handakutenMap[lastChar];
      }
    } else {
      result += char;
    }
  }
  
  return result;
}

/**
 * 全角英数字を半角英数字に変換
 */
export function zenkakuAlphanumToHankaku(str: string): string {
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
}

/**
 * 全角スペースを半角スペースに変換
 */
export function normalizeSpaces(str: string): string {
  return str.replace(/[\s　]+/g, ' ').trim();
}

/**
 * 法人格の略称を正規化（複数パターンに対応）
 */
export function normalizeCorporateSuffix(str: string): string {
  // 銀行表記のパターンをすべて統一
  const patterns = [
    // カブシキガイシャのパターン
    { pattern: /[(（]?(?:株|カブ|ｶﾌﾞ)[)）]?/g, replacement: '' },
    { pattern: /[(（]?(?:カ|ｶ)[)）]/g, replacement: '' },
    
    // ユウゲンガイシャのパターン
    { pattern: /[(（]?(?:有|ユウ|ﾕｳ)[)）]?/g, replacement: '' },
    { pattern: /[(（]?(?:ユ|ﾕ)[)）]/g, replacement: '' },
    
    // ゴウドウガイシャのパターン
    { pattern: /[(（]?(?:合|ゴウ|ｺﾞｳ)[)）]?/g, replacement: '' },
    { pattern: /[(（]?(?:ゴ|ｺﾞ)[)）]/g, replacement: '' },
    
    // ゴウシガイシャのパターン
    { pattern: /[(（]?(?:合資|ゴウシ|ｺﾞｳｼ)[)）]?/g, replacement: '' },
    
    // ゴウメイガイシャのパターン
    { pattern: /[(（]?(?:合名|ゴウメイ|ｺﾞｳﾒｲ)[)）]?/g, replacement: '' },
    
    // シャダンホウジンのパターン
    { pattern: /[(（]?(?:社|シャ|ｼｬ)[)）]/g, replacement: '' },
    
    // ザイダンホウジンのパターン
    { pattern: /[(（]?(?:財|ザイ|ｻﾞｲ)[)）]/g, replacement: '' },
    
    // トクテイヒエイリカツドウホウジンのパターン
    { pattern: /[(（]?(?:特非|トクヒ|ﾄｸﾋ|NPO)[)）]?/g, replacement: '' },
    
    // ドクリツギョウセイホウジンのパターン
    { pattern: /[(（]?(?:独|ドク|ﾄﾞｸ)[)）]/g, replacement: '' },
    
    // イッパンシャダンホウジンのパターン
    { pattern: /[(（]?(?:一社|イッシャ|ｲｯｼｬ)[)）]/g, replacement: '' },
    
    // コウエキシャダンホウジンのパターン
    { pattern: /[(（]?(?:公社|コウシャ|ｺｳｼｬ)[)）]/g, replacement: '' },
    
    // コウエキザイダンホウジンのパターン
    { pattern: /[(（]?(?:公財|コウザイ|ｺｳｻﾞｲ)[)）]/g, replacement: '' },
  ];
  
  let result = str;
  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * 記号を除去（マッチング用）
 */
export function removeSymbols(str: string): string {
  // 銀行でよく使われる記号を除去
  return str
    .replace(/[＊*※＃#＠@＄$￥¥]/g, '')
    .replace(/[・･,，、。．.]/g, '')
    .replace(/[-－−ー―‐]/g, '')
    .replace(/[「」『』【】［］\[\]()（）｛｝{}]/g, '');
}

/**
 * 総合的な文字列正規化（銀行データ用）
 */
export function normalizeBankString(str: string): string {
  if (!str) return '';
  
  let normalized = str;
  
  // 1. 半角カタカナを全角カタカナに変換
  normalized = hankakuToZenkaku(normalized);
  
  // 2. 全角英数字を半角英数字に変換
  normalized = zenkakuAlphanumToHankaku(normalized);
  
  // 3. スペースを正規化
  normalized = normalizeSpaces(normalized);
  
  // 4. 法人格の略称を除去
  normalized = normalizeCorporateSuffix(normalized);
  
  // 5. 記号を除去
  normalized = removeSymbols(normalized);
  
  // 6. 大文字に統一
  normalized = normalized.toUpperCase();
  
  // 7. 最終的な空白除去
  normalized = normalized.replace(/\s+/g, '');
  
  return normalized;
}

/**
 * 2つの文字列の類似度を計算（レーベンシュタイン距離）
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeBankString(str1);
  const norm2 = normalizeBankString(str2);
  
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;
  
  // 片方が他方に含まれている場合は高スコア
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    return minLen / maxLen * 0.9; // 0.9を最大値として部分一致を評価
  }
  
  // レーベンシュタイン距離を計算
  const matrix: number[][] = [];
  
  for (let i = 0; i <= norm2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= norm1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= norm2.length; i++) {
    for (let j = 1; j <= norm1.length; j++) {
      if (norm2.charAt(i - 1) === norm1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 置換
          matrix[i][j - 1] + 1,     // 挿入
          matrix[i - 1][j] + 1      // 削除
        );
      }
    }
  }
  
  const distance = matrix[norm2.length][norm1.length];
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return 1 - (distance / maxLength);
}

/**
 * 複数の候補から最も類似度の高いものを選択
 */
export function findBestMatch(
  target: string,
  candidates: string[]
): { match: string | null; similarity: number } {
  if (!target || candidates.length === 0) {
    return { match: null, similarity: 0 };
  }
  
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const candidate of candidates) {
    const similarity = calculateSimilarity(target, candidate);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }
  
  return { match: bestMatch, similarity: bestSimilarity };
}

/**
 * マッチング判定（閾値ベース）
 */
export function isMatch(
  str1: string,
  str2: string,
  threshold: number = 0.7
): boolean {
  const similarity = calculateSimilarity(str1, str2);
  return similarity >= threshold;
}