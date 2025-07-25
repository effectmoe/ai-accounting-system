"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const account_learning_system_1 = require("@/lib/account-learning-system");
const logger_1 = require("@/lib/logger");
const learningSystem = new account_learning_system_1.AccountLearningSystem();
async function POST(request) {
    try {
        logger_1.logger.debug('Learn API - MongoDB URI exists:', !!process.env.MONGODB_URI);
        const body = await request.json();
        const { companyId, vendorName, accountCategory, amount, description, documentType } = body;
        if (!vendorName || !accountCategory) {
            return server_1.NextResponse.json({
                success: false,
                error: 'vendorName and accountCategory are required'
            }, { status: 400 });
        }
        // 学習データを保存
        const learningResult = await learningSystem.learnAccountMapping(companyId || '11111111-1111-1111-1111-111111111111', vendorName, accountCategory, {
            originalAmount: amount,
            description,
            documentType
        });
        // 学習後の統計情報を取得
        const stats = await learningSystem.getLearningStats(companyId || '11111111-1111-1111-1111-111111111111');
        return server_1.NextResponse.json({
            success: true,
            message: `「${vendorName}」を「${accountCategory}」として学習しました`,
            learningData: learningResult,
            stats: {
                totalLearnings: stats.totalLearnings,
                categoryLearnings: stats.categoryCounts[accountCategory] || 0
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Account learning error:', error);
        logger_1.logger.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        let errorMessage = 'Failed to learn account mapping';
        if (error instanceof Error) {
            if (error.message.includes('MONGODB_URI')) {
                errorMessage = 'データベース接続設定が不足しています';
            }
            else if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'データベースに接続できません';
            }
            else {
                errorMessage = error.message;
            }
        }
        return server_1.NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
// 学習データから予測
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || '11111111-1111-1111-1111-111111111111';
        const vendorName = searchParams.get('vendorName');
        if (!vendorName) {
            return server_1.NextResponse.json({
                success: false,
                error: 'vendorName is required'
            }, { status: 400 });
        }
        const prediction = await learningSystem.predictAccountCategory(companyId, vendorName);
        if (!prediction) {
            return server_1.NextResponse.json({
                success: true,
                prediction: null,
                message: 'No learning data found for this vendor'
            });
        }
        return server_1.NextResponse.json({
            success: true,
            prediction: {
                category: prediction.category,
                confidence: prediction.confidence,
                confidencePercentage: Math.round(prediction.confidence * 100)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Account prediction error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to predict account category'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
