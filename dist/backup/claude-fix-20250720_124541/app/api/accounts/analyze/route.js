"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const account_learning_system_1 = require("@/lib/account-learning-system");
const logger_1 = require("@/lib/logger");
const learningSystem = new account_learning_system_1.AccountLearningSystem();
/**
 * 勘定科目精査API
 * MCPサーバーを使用して外部情報を参照し、より精度の高い勘定科目判定を行う
 */
async function POST(request) {
    try {
        const body = await request.json();
        const { companyId, vendorName, amount, description, documentType, extractedText, fileName } = body;
        if (!vendorName && !extractedText && !fileName) {
            return server_1.NextResponse.json({
                success: false,
                error: 'At least one of vendorName, extractedText, or fileName is required'
            }, { status: 400 });
        }
        // まず学習済みデータから予測
        const learnedPrediction = await learningSystem.predictAccountCategory(companyId || '11111111-1111-1111-1111-111111111111', vendorName);
        // 現在のカテゴリ情報を取得
        const currentCategory = body.currentCategory;
        // 基本的な勘定科目判定ロジック
        let primarySuggestion = {
            category: currentCategory || '接待交際費',
            confidence: currentCategory ? 0.5 : 0.3, // 現在のカテゴリがある場合は信頼度を高める
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
        // 代替候補を初期化
        let alternatives = [];
        // Azure OpenAIを使用した高度な分析（環境変数が設定されている場合のみ）
        if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_KEY) {
            try {
                // 動的インポート
                const { OpenAIClient, AzureKeyCredential } = await Promise.resolve().then(() => __importStar(require('@azure/openai')));
                const client = new OpenAIClient(process.env.AZURE_OPENAI_ENDPOINT, new AzureKeyCredential(process.env.AZURE_OPENAI_KEY));
                const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID || 'gpt-4';
                const prompt = `あなたは経理の専門家です。以下の情報から最適な勘定科目を判定してください。

店舗名/ベンダー名: ${vendorName || '不明'}
金額: ${amount ? `¥${amount.toLocaleString()}` : '不明'}
説明: ${description || 'なし'}
ファイル名: ${fileName || 'なし'}
抽出されたテキスト（一部）: ${(extractedText || '').substring(0, 200)}

以下の勘定科目から最も適切なものを選んでください：
- 旅費交通費（タクシー、電車、駐車場など）
- 会議費（少人数での飲食、カフェなど）
- 接待交際費（顧客との飲食、接待など）
- 消耗品費（事務用品、消耗品など）
- 車両費（ガソリン、車両関連費用）
- 新聞図書費（書籍、新聞、雑誌など）
- 通信費（郵便、宅配、通信費など）
- 水道光熱費（電気、ガス、水道など）
- 地代家賃（家賃、駐車場代など）
- 雑費（その他の経費）

JSONフォーマットで以下の形式で回答してください：
{
  "category": "選択した勘定科目",
  "confidence": 0.0-1.0の信頼度,
  "reason": "判定理由",
  "alternatives": [
    {"category": "代替案1", "confidence": 0.0-1.0, "reason": "理由"},
    {"category": "代替案2", "confidence": 0.0-1.0, "reason": "理由"}
  ]
}`;
                const result = await client.getChatCompletions(deploymentId, [
                    { role: 'system', content: 'あなたは日本の会計基準に精通した経理の専門家です。' },
                    { role: 'user', content: prompt }
                ], {
                    temperature: 0.3,
                    maxTokens: 500
                });
                const aiResponse = result.choices[0]?.message?.content;
                if (aiResponse) {
                    try {
                        const aiAnalysis = JSON.parse(aiResponse);
                        // AI分析結果を優先的に使用
                        if (aiAnalysis.category && aiAnalysis.confidence) {
                            primarySuggestion = {
                                category: aiAnalysis.category,
                                confidence: Math.min(aiAnalysis.confidence, 0.95), // 最大95%
                                reason: aiAnalysis.reason || 'AI分析による判定'
                            };
                            // AI提案の代替案を追加
                            if (aiAnalysis.alternatives && Array.isArray(aiAnalysis.alternatives)) {
                                alternatives.push(...aiAnalysis.alternatives.slice(0, 2));
                            }
                        }
                    }
                    catch (parseError) {
                        logger_1.logger.error('AI response parsing error:', parseError);
                        // パースエラーの場合は既存の判定を使用
                    }
                }
            }
            catch (aiError) {
                logger_1.logger.error('Azure OpenAI error:', aiError);
                // AIエラーの場合は既存の判定を使用
            }
        }
        // Azure OpenAIが設定されていない場合、または失敗した場合の詳細分析
        if (!primarySuggestion || primarySuggestion.confidence < 0.7) {
            logger_1.logger.debug('Using enhanced rule-based analysis');
            // 複数のキーワードマッチによる詳細分析
            const detailedAnalysis = performDetailedAnalysis(searchText, vendorName, amount);
            if (detailedAnalysis) {
                primarySuggestion = detailedAnalysis.primary;
                if (detailedAnalysis.alternatives) {
                    alternatives.push(...detailedAnalysis.alternatives);
                }
            }
        }
        // 学習データがある場合は信頼度を調整
        if (learnedPrediction && learnedPrediction.confidence > 0.7) {
            if (learnedPrediction.category === primarySuggestion.category) {
                // 一致する場合は信頼度を上げる
                primarySuggestion.confidence = Math.min(primarySuggestion.confidence + learnedPrediction.confidence * 0.2, 0.99);
                primarySuggestion.reason += ` (学習データで補強: ${Math.round(learnedPrediction.confidence * 100)}%)`;
            }
        }
        // 代替候補を生成（既存の alternatives に追加）
        const ruleBasedAlternatives = categoryRules
            .filter(rule => rule.category !== primarySuggestion.category &&
            rule.keywords.some(keyword => searchText.includes(keyword)))
            .map(rule => ({
            category: rule.category,
            confidence: rule.confidence * 0.7, // 代替案は信頼度を下げる
            reason: `キーワード「${rule.keywords.find(k => searchText.includes(k))}」による代替案`
        }))
            .slice(0, 2); // 最大2つの代替案
        // 既存の alternatives と結合
        alternatives = [...alternatives, ...ruleBasedAlternatives].slice(0, 3); // 最大3つの代替案
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
        return server_1.NextResponse.json({
            success: true,
            analysis: analysisResult
        });
    }
    catch (error) {
        logger_1.logger.error('Account analysis error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze account category'
        }, { status: 500 });
    }
}
// ベンダータイプを検出
function detectVendorType(vendorName) {
    const lower = vendorName.toLowerCase();
    if (lower.includes('株式会社') || lower.includes('(株)') || lower.includes('（株）')) {
        return '法人';
    }
    else if (lower.includes('店') || lower.includes('ショップ')) {
        return '小売店';
    }
    else if (lower.includes('サービス')) {
        return 'サービス業';
    }
    return '不明';
}
// 推奨事項を生成
function generateRecommendations(vendorName, amount, description) {
    const recommendations = [];
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
// 詳細分析を実行
function performDetailedAnalysis(searchText, vendorName, amount) {
    const matches = [];
    // 複合的なパターンマッチング
    const patterns = [
        {
            category: '旅費交通費',
            patterns: [
                { keyword: 'タクシー', score: 10 },
                { keyword: '駐車場', score: 10 },
                { keyword: 'パーキング', score: 10 },
                { keyword: 'jr', score: 9 },
                { keyword: '電車', score: 9 },
                { keyword: '新幹線', score: 10 },
                { keyword: '空港', score: 9 },
                { keyword: 'タイムズ', score: 10 },
                { keyword: '三井のリパーク', score: 10 }
            ]
        },
        {
            category: '会議費',
            patterns: [
                { keyword: 'スターバックス', score: 10 },
                { keyword: 'ドトール', score: 10 },
                { keyword: 'タリーズ', score: 10 },
                { keyword: 'カフェ', score: 8 },
                { keyword: 'コーヒー', score: 7 },
                { keyword: '喫茶', score: 7 }
            ]
        },
        {
            category: '接待交際費',
            patterns: [
                { keyword: 'レストラン', score: 9 },
                { keyword: '居酒屋', score: 10 },
                { keyword: 'ホテル', score: 8 },
                { keyword: '料亭', score: 10 },
                { keyword: '寿司', score: 8 },
                { keyword: '焼肉', score: 8 },
                { keyword: 'ダイニング', score: 7 }
            ]
        }
    ];
    // パターンマッチングとスコアリング
    for (const categoryPattern of patterns) {
        let totalScore = 0;
        const matchedKeywords = [];
        for (const pattern of categoryPattern.patterns) {
            if (searchText.includes(pattern.keyword)) {
                totalScore += pattern.score;
                matchedKeywords.push(pattern.keyword);
            }
        }
        if (totalScore > 0) {
            matches.push({
                category: categoryPattern.category,
                confidence: Math.min(totalScore / 10, 0.9),
                reason: `キーワード「${matchedKeywords.join('、')}」による判定（スコア: ${totalScore}）`,
                score: totalScore
            });
        }
    }
    // スコアでソート
    matches.sort((a, b) => b.score - a.score);
    if (matches.length === 0) {
        return null;
    }
    return {
        primary: {
            category: matches[0].category,
            confidence: matches[0].confidence,
            reason: matches[0].reason
        },
        alternatives: matches.slice(1, 3).map(m => ({
            category: m.category,
            confidence: m.confidence,
            reason: m.reason
        }))
    };
}
exports.runtime = 'nodejs';
