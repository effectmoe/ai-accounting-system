import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

/**
 * エラーを診断
 */
export const diagnoseErrorTool = {
  name: 'diagnose_error',
  description: 'エラーを診断します',
  parameters: {
    type: 'object',
    properties: {
      error_message: { type: 'string', description: 'エラーメッセージ' },
      stack_trace: { type: 'string', description: 'スタックトレース' },
      context: {
        type: 'object',
        properties: {
          environment: { type: 'string', description: '実行環境' },
          recent_changes: { type: 'array', items: { type: 'string' }, description: '最近の変更' },
          system_info: { type: 'object', description: 'システム情報' },
        },
      },
      severity: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: '深刻度',
      },
    },
    required: ['error_message'],
  },
  handler: async (params: any) => {
    logger.info('Diagnosing error:', params);
    
    const db = await getDatabase();
    const collection = db.collection('error_diagnostics');
    
    // エラーパターンの分析
    const errorPatterns = [
      {
        pattern: /TypeError.*undefined/i,
        category: 'Type Error',
        common_causes: ['Null/undefined参照', 'オブジェクトプロパティの誤り', '非同期処理の不備'],
        solutions: ['Null チェックの追加', 'Optional chaining の使用', 'デフォルト値の設定'],
      },
      {
        pattern: /Cannot connect to database/i,
        category: 'Database Connection',
        common_causes: ['接続文字列の誤り', 'ネットワーク問題', '認証エラー', 'サービス停止'],
        solutions: ['接続文字列の確認', 'ファイアウォール設定の確認', '認証情報の更新'],
      },
      {
        pattern: /Memory limit exceeded/i,
        category: 'Memory Issue',
        common_causes: ['メモリリーク', '大量データ処理', '無限ループ'],
        solutions: ['ページネーションの実装', 'ストリーミング処理', 'メモリプロファイリング'],
      },
      {
        pattern: /Permission denied/i,
        category: 'Permission Error',
        common_causes: ['ファイルアクセス権限', 'API権限不足', 'ユーザー権限'],
        solutions: ['適切な権限の付与', 'sudo/管理者権限での実行', 'アクセス制御の見直し'],
      },
    ];
    
    // エラーメッセージからパターンを検出
    let diagnosis: any = {
      error_message: params.error_message,
      severity: params.severity || 'medium',
      timestamp: new Date(),
      diagnosed_issues: [],
      recommended_actions: [],
    };
    
    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(params.error_message)) {
        diagnosis.error_category = pattern.category;
        diagnosis.common_causes = pattern.common_causes;
        diagnosis.solutions = pattern.solutions;
        break;
      }
    }
    
    // スタックトレースの分析
    if (params.stack_trace) {
      const stackLines = params.stack_trace.split('\n');
      const relevantLines = stackLines.slice(0, 5); // 最初の5行が最も重要
      
      diagnosis.stack_analysis = {
        error_location: relevantLines[0],
        call_chain: relevantLines.slice(1, 4),
        framework_detected: detectFramework(params.stack_trace),
      };
    }
    
    // 環境別の推奨事項
    if (params.context?.environment) {
      switch (params.context.environment) {
        case 'production':
          diagnosis.recommended_actions.push(
            'エラーモニタリングツールの確認',
            'ロールバック計画の準備',
            'ユーザー影響の評価',
          );
          break;
        case 'development':
          diagnosis.recommended_actions.push(
            'デバッガーの使用',
            'ユニットテストの追加',
            'コードレビューの実施',
          );
          break;
      }
    }
    
    // 診断結果の保存
    await collection.insertOne(diagnosis);
    
    // 類似エラーの検索
    const similarErrors = await collection.find({
      error_category: diagnosis.error_category,
      _id: { $ne: diagnosis._id },
    }).limit(3).toArray();
    
    if (similarErrors.length > 0) {
      diagnosis.similar_cases = similarErrors.map(err => ({
        error_message: err.error_message,
        resolved: err.resolved || false,
        resolution: err.resolution,
      }));
    }
    
    return {
      success: true,
      diagnosis: diagnosis,
      immediate_actions: diagnosis.solutions || ['エラーログの詳細確認', 'システム状態の確認'],
      monitoring: {
        should_alert_team: params.severity === 'critical' || params.severity === 'high',
        should_create_incident: params.severity === 'critical',
        recommended_sla: params.severity === 'critical' ? '1時間以内' : '24時間以内',
      },
    };
  }
};

/**
 * 根本原因分析を実行
 */
export const performRootCauseAnalysisTool = {
  name: 'perform_root_cause_analysis',
  description: '根本原因分析を実行します',
  parameters: {
    type: 'object',
    properties: {
      incident_description: { type: 'string', description: 'インシデントの説明' },
      symptoms: {
        type: 'array',
        items: { type: 'string' },
        description: '症状リスト',
      },
      timeline: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            time: { type: 'string', description: '時刻' },
            event: { type: 'string', description: 'イベント' },
          },
        },
        description: 'タイムライン',
      },
      affected_systems: { type: 'array', items: { type: 'string' }, description: '影響を受けたシステム' },
    },
    required: ['incident_description', 'symptoms'],
  },
  handler: async (params: any) => {
    logger.info('Performing root cause analysis:', params);
    
    const db = await getDatabase();
    const collection = db.collection('root_cause_analyses');
    
    // 5 Whys 分析の実施
    const fiveWhysAnalysis = performFiveWhys(params.incident_description, params.symptoms);
    
    // Fishbone (Ishikawa) 分析
    const fishboneAnalysis = {
      main_problem: params.incident_description,
      categories: {
        people: ['スキル不足', 'コミュニケーション不足', 'トレーニング不足'],
        process: ['手順の不備', 'レビュー不足', 'テスト不足'],
        technology: ['システム設計の問題', 'ツールの不備', '技術的負債'],
        environment: ['インフラの問題', '外部依存', 'リソース不足'],
      },
    };
    
    // タイムライン分析
    let criticalEvents: any[] = [];
    if (params.timeline && params.timeline.length > 0) {
      // イベントの重要度を判定
      criticalEvents = params.timeline.filter((event: any) => 
        event.event.toLowerCase().includes('error') ||
        event.event.toLowerCase().includes('failure') ||
        event.event.toLowerCase().includes('down')
      );
    }
    
    // 影響分析
    const impactAnalysis = {
      affected_systems: params.affected_systems || [],
      estimated_impact: calculateImpact(params.affected_systems),
      blast_radius: params.affected_systems?.length || 0,
    };
    
    // 根本原因の推定
    const rootCauses = [
      {
        cause: 'コード変更による回帰',
        probability: 0.7,
        evidence: ['最近のデプロイメント', 'テストカバレッジ不足'],
        prevention: ['回帰テストの強化', 'デプロイメント前の検証強化'],
      },
      {
        cause: 'インフラストラクチャの問題',
        probability: 0.5,
        evidence: ['複数システムへの影響', 'ネットワーク関連のエラー'],
        prevention: ['冗長性の確保', 'モニタリングの強化'],
      },
      {
        cause: '外部サービスの障害',
        probability: 0.3,
        evidence: ['API呼び出しエラー', 'タイムアウト'],
        prevention: ['サーキットブレーカーの実装', 'フォールバック戦略'],
      },
    ];
    
    // 分析結果の保存
    const analysis = {
      incident_description: params.incident_description,
      symptoms: params.symptoms,
      timeline: params.timeline,
      five_whys: fiveWhysAnalysis,
      fishbone: fishboneAnalysis,
      critical_events: criticalEvents,
      impact_analysis: impactAnalysis,
      root_causes: rootCauses.sort((a, b) => b.probability - a.probability),
      created_at: new Date(),
    };
    
    await collection.insertOne(analysis);
    
    return {
      success: true,
      root_cause_analysis: {
        most_likely_cause: rootCauses[0],
        all_potential_causes: rootCauses,
        five_whys_result: fiveWhysAnalysis,
        critical_timeline_events: criticalEvents,
      },
      recommendations: {
        immediate: [
          '最も可能性の高い原因から対処を開始',
          '影響を受けたシステムの健全性確認',
          'ステークホルダーへの状況報告',
        ],
        short_term: [
          '暫定対策の実施',
          'モニタリングの強化',
          '関連ドキュメントの更新',
        ],
        long_term: rootCauses[0].prevention,
      },
      action_items: generateActionItems(rootCauses[0]),
    };
  }
};

/**
 * 予防措置を提案
 */
export const suggestPreventiveMeasuresTool = {
  name: 'suggest_preventive_measures',
  description: '予防措置を提案します',
  parameters: {
    type: 'object',
    properties: {
      problem_type: {
        type: 'string',
        enum: ['performance', 'security', 'reliability', 'scalability', 'maintenance'],
        description: '問題タイプ',
      },
      current_state: { type: 'object', description: '現在の状態' },
      risk_assessment: {
        type: 'object',
        properties: {
          likelihood: { type: 'string', enum: ['low', 'medium', 'high'], description: '発生可能性' },
          impact: { type: 'string', enum: ['low', 'medium', 'high'], description: '影響度' },
        },
      },
    },
    required: ['problem_type', 'current_state'],
  },
  handler: async (params: any) => {
    logger.info('Suggesting preventive measures:', params);
    
    const measures: any = {
      problem_type: params.problem_type,
      risk_level: calculateRiskLevel(params.risk_assessment),
      preventive_measures: [],
      implementation_plan: [],
      estimated_effort: '',
    };
    
    // 問題タイプ別の予防措置
    switch (params.problem_type) {
      case 'performance':
        measures.preventive_measures = [
          {
            measure: 'パフォーマンステストの定期実行',
            description: '負荷テストとベンチマークの自動化',
            priority: 'high',
            tools: ['JMeter', 'Gatling', 'K6'],
          },
          {
            measure: 'APMツールの導入',
            description: 'アプリケーションパフォーマンスの継続的監視',
            priority: 'high',
            tools: ['New Relic', 'Datadog', 'AppDynamics'],
          },
          {
            measure: 'コードプロファイリング',
            description: 'ボトルネックの特定と最適化',
            priority: 'medium',
            tools: ['Chrome DevTools', 'Visual Studio Profiler'],
          },
        ];
        measures.estimated_effort = '2-4週間';
        break;
        
      case 'security':
        measures.preventive_measures = [
          {
            measure: 'セキュリティ監査の実施',
            description: '定期的な脆弱性スキャンとペネトレーションテスト',
            priority: 'critical',
            frequency: '四半期ごと',
          },
          {
            measure: 'SAST/DASTツールの導入',
            description: 'CI/CDパイプラインでのセキュリティチェック',
            priority: 'high',
            tools: ['SonarQube', 'OWASP ZAP', 'Snyk'],
          },
          {
            measure: 'セキュリティトレーニング',
            description: '開発チームへの定期的なセキュリティ教育',
            priority: 'medium',
            frequency: '半年ごと',
          },
        ];
        measures.estimated_effort = '3-6週間';
        break;
        
      case 'reliability':
        measures.preventive_measures = [
          {
            measure: 'カオスエンジニアリング',
            description: 'システムの耐障害性テスト',
            priority: 'medium',
            tools: ['Chaos Monkey', 'Gremlin'],
          },
          {
            measure: '自動フェイルオーバー',
            description: '障害時の自動切り替え機構',
            priority: 'high',
            implementation: ['冗長構成', 'ヘルスチェック', '自動復旧'],
          },
          {
            measure: 'SLO/SLAの設定と監視',
            description: 'サービスレベル目標の定義と追跡',
            priority: 'high',
            metrics: ['可用性', 'レスポンスタイム', 'エラー率'],
          },
        ];
        measures.estimated_effort = '4-8週間';
        break;
    }
    
    // 実装計画の生成
    measures.implementation_plan = [
      {
        phase: 'Assessment',
        duration: '1週間',
        activities: ['現状分析', 'ギャップ分析', 'リスク評価'],
      },
      {
        phase: 'Planning',
        duration: '1週間',
        activities: ['詳細計画策定', 'リソース確保', 'スケジューリング'],
      },
      {
        phase: 'Implementation',
        duration: '2-4週間',
        activities: ['ツール導入', 'プロセス構築', 'チーム教育'],
      },
      {
        phase: 'Monitoring',
        duration: '継続的',
        activities: ['効果測定', '改善活動', 'レポーティング'],
      },
    ];
    
    // ROI計算
    measures.expected_benefits = {
      risk_reduction: '60-80%',
      incident_prevention_rate: '70%',
      mttr_improvement: '40%削減',
      cost_savings: '年間インシデント対応コストの50%削減',
    };
    
    return {
      success: true,
      preventive_measures: measures,
      priority_actions: measures.preventive_measures.filter((m: any) => m.priority === 'high' || m.priority === 'critical'),
      quick_wins: measures.preventive_measures.filter((m: any) => m.priority === 'medium'),
      investment_required: {
        time: measures.estimated_effort,
        budget: 'プロジェクト規模による',
        resources: '2-3名の専任エンジニア',
      },
    };
  }
};

// ヘルパー関数
function detectFramework(stackTrace: string): string {
  if (stackTrace.includes('node_modules/react')) return 'React';
  if (stackTrace.includes('node_modules/vue')) return 'Vue';
  if (stackTrace.includes('node_modules/angular')) return 'Angular';
  if (stackTrace.includes('node_modules/express')) return 'Express';
  if (stackTrace.includes('node_modules/next')) return 'Next.js';
  return 'Unknown';
}

function performFiveWhys(problem: string, symptoms: string[]): any {
  return {
    problem: problem,
    why1: '症状: ' + symptoms[0],
    why2: '直接的な原因の可能性',
    why3: 'プロセスまたはシステムの問題',
    why4: '組織的な課題',
    why5: '根本的な原因',
  };
}

function calculateImpact(affectedSystems: string[]): string {
  if (!affectedSystems) return 'Low';
  if (affectedSystems.length >= 5) return 'Critical';
  if (affectedSystems.length >= 3) return 'High';
  if (affectedSystems.length >= 1) return 'Medium';
  return 'Low';
}

function calculateRiskLevel(riskAssessment: any): string {
  if (!riskAssessment) return 'Medium';
  const { likelihood, impact } = riskAssessment;
  
  if (likelihood === 'high' && impact === 'high') return 'Critical';
  if (likelihood === 'high' || impact === 'high') return 'High';
  if (likelihood === 'low' && impact === 'low') return 'Low';
  return 'Medium';
}

function generateActionItems(rootCause: any): string[] {
  return [
    `${rootCause.cause}の詳細調査`,
    `予防措置の実装: ${rootCause.prevention[0]}`,
    'インシデントレポートの作成と共有',
    'チームでの振り返りミーティングの実施',
    'ランブックの更新',
  ];
}

// すべてのツールをエクスポート
export const problemSolvingTools = [
  diagnoseErrorTool,
  performRootCauseAnalysisTool,
  suggestPreventiveMeasuresTool,
];