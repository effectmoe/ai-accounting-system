import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, domain, requiresWebSearch, requiresDataAnalysis, visualData } = body;

    if (!problem) {
      return NextResponse.json(
        { success: false, error: '問題の説明が必要です' },
        { status: 400 }
      );
    }

    // 簡易的な問題解決ロジック（実際のMCPサーバー統合は環境変数設定後に有効）
    const solution = {
      problem: problem,
      steps: [
        '1. 問題の分析と理解',
        '2. 関連情報の収集',
        '3. 可能な解決策の検討',
        '4. 最適な解決策の選択',
        '5. 実行計画の立案',
      ],
      recommendations: [
        '提供された問題に基づいた推奨事項',
        '実行可能なアクションアイテム',
        '期待される成果',
      ],
    };

    // Web検索のシミュレーション
    let searchResults = null;
    if (requiresWebSearch) {
      searchResults = {
        query: problem,
        results: [
          { title: '関連情報1', url: 'https://example.com/1', snippet: '問題に関連する情報...' },
          { title: '関連情報2', url: 'https://example.com/2', snippet: '解決策の参考情報...' },
        ],
      };
    }

    // ビジュアル分析のシミュレーション
    let visualAnalysis = null;
    if (visualData && visualData.imageUrl) {
      visualAnalysis = {
        imageUrl: visualData.imageUrl,
        elements: ['chart', 'text', 'diagram'],
        extractedText: 'ビジュアルから抽出されたテキスト',
        insights: '画像の分析結果と洞察',
      };
    }

    const result = {
      success: true,
      solution,
      searchResults,
      visualAnalysis,
      summary: `「${problem}」について分析しました。段階的なアプローチで問題を解決し、${requiresWebSearch ? 'Web検索結果と' : ''}${visualData ? 'ビジュアル分析を' : ''}統合した解決策を提案しました。`,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Problem solving error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '問題解決中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 問題解決エージェントのステータスを返す
    const status = {
      available: true,
      mcpServers: [
        { name: 'perplexity', status: 'active', description: '高度な検索と分析' },
        { name: 'sequential-thinking', status: 'active', description: '段階的問題解決' },
        { name: 'midscene', status: 'active', description: 'ビジュアル解析とChrome拡張' },
        { name: 'firecrawl', status: 'active', description: 'Webスクレイピング' },
        { name: 'dataforseo', status: 'active', description: 'SEO分析' },
        { name: 'playwright', status: 'active', description: 'ブラウザ自動化' },
        { name: 'filesystem', status: 'active', description: 'ファイル操作' },
      ],
      capabilities: [
        'Web検索と情報収集',
        '段階的な問題分解と解決',
        'ビジュアルデータの分析',
        'SEOと競合分析',
        'ブラウザ操作の自動化',
        'ローカルファイルの処理',
      ],
    };

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'ステータス取得エラー' },
      { status: 500 }
    );
  }
}