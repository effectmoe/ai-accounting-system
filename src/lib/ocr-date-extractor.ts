/**
 * OCR日付抽出専用モジュール
 * 画像・PDF内のテキストから日付を抽出する
 * ファイル名やシステム日付は一切使用しない
 */

export class OCRDateExtractor {
  /**
   * OCR結果から日付を抽出
   * @param ocrText OCRで読み取ったテキスト（JSON文字列またはプレーンテキスト）
   * @returns 抽出された日付またはnull
   */
  static extractDate(ocrText: string): { date: Date | null; confidence: number; matchedPattern: string | null } {
    if (!ocrText || ocrText.trim() === '') {
      console.error('OCRDateExtractor: 入力テキストが空です');
      return { date: null, confidence: 0, matchedPattern: null };
    }

    // 日本の駐車場レシート特有のパターンを最優先
    const parkingPatterns = [
      // 入庫時刻/出庫時刻パターン（最も信頼性が高い）
      {
        pattern: /[入出]庫時刻[\s　]*(20\d{2})年[\s　]*(\d{1,2})月[\s　]*(\d{1,2})日/g,
        confidence: 0.95,
        name: '駐車場レシート（入出庫時刻）'
      },
      // 一般的な年月日パターン
      {
        pattern: /(20\d{2})年[\s　]*(\d{1,2})月[\s　]*(\d{1,2})日/g,
        confidence: 0.9,
        name: '標準日本語日付'
      },
      // スラッシュ区切り
      {
        pattern: /(20\d{2})\/(\d{1,2})\/(\d{1,2})/g,
        confidence: 0.85,
        name: 'スラッシュ区切り'
      },
      // ハイフン区切り
      {
        pattern: /(20\d{2})-(\d{1,2})-(\d{1,2})/g,
        confidence: 0.85,
        name: 'ハイフン区切り'
      },
      // 令和表記
      {
        pattern: /令和(\d+)年[\s　]*(\d{1,2})月[\s　]*(\d{1,2})日/g,
        confidence: 0.9,
        name: '令和表記'
      }
    ];

    let bestMatch: { date: Date | null; confidence: number; matchedPattern: string | null } = {
      date: null,
      confidence: 0,
      matchedPattern: null
    };

    // 各パターンで日付を検索
    for (const { pattern, confidence, name } of parkingPatterns) {
      const matches = ocrText.matchAll(pattern);
      
      for (const match of matches) {
        try {
          let year: number, month: number, day: number;
          
          if (name === '令和表記') {
            // 令和年号の変換（令和1年 = 2019年）
            year = 2018 + parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          } else {
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          }
          
          // 妥当性チェック
          if (month < 1 || month > 12 || day < 1 || day > 31) {
            console.warn(`OCRDateExtractor: 無効な日付値 - ${match[0]}`);
            continue;
          }
          
          const date = new Date(year, month - 1, day);
          
          // 日付の妥当性を確認
          if (date.getFullYear() === year && 
              date.getMonth() === month - 1 && 
              date.getDate() === day) {
            
            // 未来の日付や古すぎる日付を除外
            const now = new Date();
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            
            if (date <= oneMonthFuture && date >= oneYearAgo) {
              if (confidence > bestMatch.confidence) {
                bestMatch = {
                  date: date,
                  confidence: confidence,
                  matchedPattern: `${name}: ${match[0]}`
                };
                console.log(`OCRDateExtractor: 日付を検出 - ${match[0]} (${name})`);
              }
            } else {
              console.warn(`OCRDateExtractor: 日付が範囲外 - ${match[0]} (1年前〜1ヶ月後の範囲外)`);
            }
          }
        } catch (error) {
          console.error(`OCRDateExtractor: 日付解析エラー - ${match[0]}`, error);
        }
      }
    }

    if (!bestMatch.date) {
      console.error('OCRDateExtractor: 有効な日付を見つけられませんでした');
      console.log('検索対象テキスト（最初の500文字）:', ocrText.substring(0, 500));
    }

    return bestMatch;
  }

  /**
   * ファイル名からの日付抽出を明示的に禁止
   */
  static extractFromFileName(fileName: string): never {
    throw new Error('ファイル名からの日付抽出は禁止されています。OCRで画像内の日付を読み取ってください。');
  }

  /**
   * システム日付の使用を明示的に禁止
   */
  static useSystemDate(): never {
    throw new Error('システム日付の使用は禁止されています。OCRで画像内の日付を読み取ってください。');
  }
}