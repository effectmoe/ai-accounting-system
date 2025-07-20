import { NextRequest, NextResponse } from 'next/server';
import { AccountLearningSystem } from '@/lib/account-learning-system';

import { logger } from '@/lib/logger';
const learningSystem = new AccountLearningSystem();

export async function POST(request: NextRequest) {
  try {
    logger.debug('Learn API - MongoDB URI exists:', !!process.env.MONGODB_URI);
    const body = await request.json();
    const {
      companyId,
      vendorName,
      accountCategory,
      amount,
      description,
      documentType
    } = body;

    if (!vendorName || !accountCategory) {
      return NextResponse.json({
        success: false,
        error: 'vendorName and accountCategory are required'
      }, { status: 400 });
    }

    // 学習データを保存
    const learningResult = await learningSystem.learnAccountMapping(
      companyId || '11111111-1111-1111-1111-111111111111',
      vendorName,
      accountCategory,
      {
        originalAmount: amount,
        description,
        documentType
      }
    );

    // 学習後の統計情報を取得
    const stats = await learningSystem.getLearningStats(
      companyId || '11111111-1111-1111-1111-111111111111'
    );

    return NextResponse.json({
      success: true,
      message: `「${vendorName}」を「${accountCategory}」として学習しました`,
      learningData: learningResult,
      stats: {
        totalLearnings: stats.totalLearnings,
        categoryLearnings: stats.categoryCounts[accountCategory] || 0
      }
    });

  } catch (error) {
    logger.error('Account learning error:', error);
    logger.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    let errorMessage = 'Failed to learn account mapping';
    if (error instanceof Error) {
      if (error.message.includes('MONGODB_URI')) {
        errorMessage = 'データベース接続設定が不足しています';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'データベースに接続できません';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// 学習データから予測
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '11111111-1111-1111-1111-111111111111';
    const vendorName = searchParams.get('vendorName');

    if (!vendorName) {
      return NextResponse.json({
        success: false,
        error: 'vendorName is required'
      }, { status: 400 });
    }

    const prediction = await learningSystem.predictAccountCategory(companyId, vendorName);

    if (!prediction) {
      return NextResponse.json({
        success: true,
        prediction: null,
        message: 'No learning data found for this vendor'
      });
    }

    return NextResponse.json({
      success: true,
      prediction: {
        category: prediction.category,
        confidence: prediction.confidence,
        confidencePercentage: Math.round(prediction.confidence * 100)
      }
    });

  } catch (error) {
    logger.error('Account prediction error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to predict account category'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';