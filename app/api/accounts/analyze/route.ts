import { NextRequest, NextResponse } from 'next/server';
import { AccountLearningSystem } from '../../../../src/lib/account-learning-system';

const learningSystem = new AccountLearningSystem();

/**
 * 勘定科目精査API
 * MCPサーバーを使用して外部情報を参照し、より精度の高い勘定科目判定を行う
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      vendorName,
      amount,
      description,
      documentType,
      extractedText,
      fileName
    } = body;

    if (!vendorName && !extractedText && !fileName) {
      return NextResponse.json({
        success: false,
        error: 'At least one of vendorName, extractedText, or fileName is required'
      }, { status: 400 });
    }

    // まず学習済みデータから予測
    const learnedPrediction = await learningSystem.predictAccountCategory(
      companyId || '11111111-1111-1111-1111-111111111111',
      vendorName
    );

    // 現在のカテゴリ情報を取得
    const currentCategory = body.currentCategory;
    
    // 基本的な勘定科目判定ロジック
    let primarySuggestion = {
      category: currentCategory || '接待交際費',
      confidence: currentCategory ? 0.5 : 0.3,  // 現在のカテゴリがある場合は信頼度を高める
      reason: currentCategory ? '現在の分類' : 'デフォルト分類'
    };

    // 検索対象のテキストを結合
    const searchText = [
      vendorName || '',
      extractedText || '',
      fileName || '',
      description || ''
    ].join(' ').toLowerCase();

    // キーワードベースの判定（拡張版）
    const categoryRules = [
      {
        keywords: ['タクシー', 'taxi', '駐車場', 'パーキング', 'parking', '交通', '鉄道', 'jr', '私鉄', 'バス', '高速道路', 'etc'],
        category: '旅費交通費',
        confidence: 0.9
      },
      {
        keywords: ['コーヒー', 'カフェ', 'coffee', 'cafe', 'スターバックス', 'ドトール', 'タリーズ'],
        category: '会議費',
        confidence: 0.85
      },
      {
        keywords: ['レストラン', 'restaurant', '食堂', '居酒屋', '寿司', 'ホテル', '宴会'],
        category: '接待交際費',
        confidence: 0.85
      },
      {
        keywords: ['コンビニ', 'ローソン', 'セブン', 'ファミリーマート', 'ミニストップ'],
        category: '消耗品費',
        confidence: 0.8
      },
      {
        keywords: ['ガソリン', 'エネオス', '出光', 'コスモ石油', 'シェル'],
        category: '車両費',
        confidence: 0.9
      },
      {
        keywords: ['書店', '本屋', 'ブックス', 'アマゾン', '紀伊国屋'],
        category: '新聞図書費',
        confidence: 0.85
      },
      {
        keywords: ['郵便', '宅配', 'ヤマト', '佐川', 'ゆうパック'],
        category: '通信費',
        confidence: 0.85
      }
    ];

    // ルールベースの判定
    for (const rule of categoryRules) {
      const matchedKeyword = rule.keywords.find(keyword => searchText.includes(keyword));
      if (matchedKeyword) {
        primarySuggestion = {
          category: rule.category,
          confidence: rule.confidence,
          reason: `キーワード「${matchedKeyword}」による判定`
        };
        break;
      }
    }

    // 学習データがある場合は信頼度を調整
    if (learnedPrediction && learnedPrediction.confidence > 0.7) {
      if (learnedPrediction.category === primarySuggestion.category) {
        // 一致する場合は信頼度を上げる
        primarySuggestion.confidence = Math.min(
          primarySuggestion.confidence + learnedPrediction.confidence * 0.2,
          0.99
        );
        primarySuggestion.reason += ` (学習データで補強: ${Math.round(learnedPrediction.confidence * 100)}%)`;
      }
    }

    // 代替候補を生成
    const alternatives = categoryRules
      .filter(rule => 
        rule.category !== primarySuggestion.category &&
        rule.keywords.some(keyword => searchText.includes(keyword))
      )
      .map(rule => ({
        category: rule.category,
        confidence: rule.confidence * 0.7, // 代替案は信頼度を下げる
        reason: `キーワード「${rule.keywords.find(k => searchText.includes(k))}」による代替案`
      }))
      .slice(0, 2); // 最大2つの代替案

    // 分析結果を構築
    const analysisResult = {
      vendorName,
      primarySuggestion,
      alternatives,
      learnedData: learnedPrediction ? {
        category: learnedPrediction.category,
        confidence: learnedPrediction.confidence,
        isUsed: learnedPrediction.category === primarySuggestion.category
      } : null,
      analysisDetails: {
        keywordsFound: categoryRules
          .flatMap(rule => rule.keywords)
          .filter(keyword => searchText.includes(keyword)),
        vendorType: detectVendorType(vendorName || ''),
        hasLearningData: !!learnedPrediction,
        searchText: searchText.substring(0, 200) // デバッグ用
      },
      recommendations: generateRecommendations(vendorName, amount, description)
    };

    return NextResponse.json({
      success: true,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('Account analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze account category'
    }, { status: 500 });
  }
}

// ベンダータイプを検出
function detectVendorType(vendorName: string): string {
  const lower = vendorName.toLowerCase();
  
  if (lower.includes('株式会社') || lower.includes('(株)') || lower.includes('（株）')) {
    return '法人';
  } else if (lower.includes('店') || lower.includes('ショップ')) {
    return '小売店';
  } else if (lower.includes('サービス')) {
    return 'サービス業';
  }
  
  return '不明';
}

// 推奨事項を生成
function generateRecommendations(vendorName: string, amount?: number, description?: string): string[] {
  const recommendations: string[] = [];
  
  // 金額に基づく推奨
  if (amount) {
    if (amount > 50000) {
      recommendations.push('高額取引のため、証憑書類の保管を推奨');
    }
    if (amount > 10000 && vendorName.toLowerCase().includes('レストラン')) {
      recommendations.push('接待の場合は参加者リストの記録を推奨');
    }
  }
  
  // ベンダー名に基づく推奨
  if (vendorName.toLowerCase().includes('タクシー') || vendorName.toLowerCase().includes('駐車場')) {
    recommendations.push('業務利用の詳細（訪問先等）を記録することを推奨');
  }
  
  return recommendations;
}

export const runtime = 'nodejs';