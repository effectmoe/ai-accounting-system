/**
 * コンテキスト認識システム
 * ページ、データ、ユーザー状態を分析してMastraエージェントを最適化
 */

export interface PageContext {
  page: string;
  type: 'dashboard' | 'invoices' | 'quotes' | 'customers' | 'journals' | 'reports' | 'documents' | 'suppliers' | 'products' | 'general';
  entityId?: string;
  entityType?: string;
  description: string;
  recommendedAgent: string;
  availableActions: string[];
  dataContext?: Record<string, any>;
}

export interface ContextData {
  selectedItems?: any[];
  formData?: Record<string, any>;
  filters?: Record<string, any>;
  searchQuery?: string;
  viewMode?: string;
}

export class ContextAnalyzer {
  static analyzePageContext(pathname: string, contextData?: ContextData): PageContext {
    const pathParts = pathname.split('/').filter(Boolean);
    
    // ダッシュボード
    if (pathname === '/') {
      return {
        page: pathname,
        type: 'dashboard',
        description: 'ダッシュボード - 売上分析、業績確認',
        recommendedAgent: 'accountingAgent',
        availableActions: [
          '売上分析を実行',
          'レポートを生成',
          '今月の業績を確認',
          'キャッシュフローを分析'
        ],
        dataContext: contextData
      };
    }

    // 請求書関連
    if (pathname.includes('/invoices')) {
      const entityId = pathParts[1];
      const isEdit = pathParts.includes('edit');
      const isNew = pathParts.includes('new');
      
      return {
        page: pathname,
        type: 'invoices',
        entityId,
        entityType: 'invoice',
        description: isNew ? '新規請求書作成' : isEdit ? '請求書編集' : '請求書管理',
        recommendedAgent: 'accountingAgent',
        availableActions: [
          '請求書を作成',
          '請求書を送信',
          '支払い状況を確認',
          '請求書をPDF出力',
          '売上を記録'
        ],
        dataContext: { ...contextData, invoiceId: entityId }
      };
    }

    // 見積書関連
    if (pathname.includes('/quotes')) {
      const entityId = pathParts[1];
      const isEdit = pathParts.includes('edit');
      const isNew = pathParts.includes('new');
      
      return {
        page: pathname,
        type: 'quotes',
        entityId,
        entityType: 'quote',
        description: isNew ? '新規見積書作成' : isEdit ? '見積書編集' : '見積書管理',
        recommendedAgent: 'accountingAgent',
        availableActions: [
          '見積書を作成',
          '見積書を送信',
          '請求書に変換',
          '見積書をPDF出力',
          '承認状況を確認'
        ],
        dataContext: { ...contextData, quoteId: entityId }
      };
    }

    // 顧客管理
    if (pathname.includes('/customers')) {
      const entityId = pathParts[1];
      const isEdit = pathParts.includes('edit');
      const isNew = pathParts.includes('new');
      
      return {
        page: pathname,
        type: 'customers',
        entityId,
        entityType: 'customer',
        description: isNew ? '新規顧客登録' : isEdit ? '顧客情報編集' : '顧客管理',
        recommendedAgent: 'customerAgent',
        availableActions: [
          '顧客を登録',
          '取引履歴を確認',
          '売上分析を実行',
          '請求書を作成',
          '顧客情報を更新'
        ],
        dataContext: { ...contextData, customerId: entityId }
      };
    }

    // 仕訳管理
    if (pathname.includes('/journal')) {
      const entityId = pathParts[1];
      const isEdit = pathParts.includes('edit');
      const isNew = pathParts.includes('new');
      
      return {
        page: pathname,
        type: 'journals',
        entityId,
        entityType: 'journal',
        description: isNew ? '新規仕訳作成' : isEdit ? '仕訳編集' : '仕訳管理',
        recommendedAgent: 'accountingAgent',
        availableActions: [
          '仕訳を作成',
          '勘定科目を確認',
          '税計算を実行',
          '仕訳を記帳',
          '残高試算表を確認'
        ],
        dataContext: { ...contextData, journalId: entityId }
      };
    }

    // レポート
    if (pathname.includes('/reports')) {
      return {
        page: pathname,
        type: 'reports',
        description: 'レポート・分析',
        recommendedAgent: 'accountingAgent',
        availableActions: [
          'P/Lを作成',
          'B/Sを作成',
          '売上分析を実行',
          'キャッシュフロー分析',
          '税務レポートを生成'
        ],
        dataContext: contextData
      };
    }

    // ドキュメント・OCR
    if (pathname.includes('/documents')) {
      const entityId = pathParts[1];
      
      return {
        page: pathname,
        type: 'documents',
        entityId,
        entityType: 'document',
        description: 'ドキュメント管理・OCR処理',
        recommendedAgent: 'ocrAgent',
        availableActions: [
          'OCR処理を実行',
          '仕訳を作成',
          'ファイルをアップロード',
          'テキストを抽出',
          '自動仕訳を提案'
        ],
        dataContext: { ...contextData, documentId: entityId }
      };
    }

    // 仕入先管理
    if (pathname.includes('/suppliers')) {
      const entityId = pathParts[1];
      
      return {
        page: pathname,
        type: 'suppliers',
        entityId,
        entityType: 'supplier',
        description: '仕入先管理',
        recommendedAgent: 'customerAgent',
        availableActions: [
          '仕入先を登録',
          '取引履歴を確認',
          '支払い状況を確認',
          '仕入先見積書を作成'
        ],
        dataContext: { ...contextData, supplierId: entityId }
      };
    }

    // 商品管理
    if (pathname.includes('/products')) {
      const entityId = pathParts[1];
      
      return {
        page: pathname,
        type: 'products',
        entityId,
        entityType: 'product',
        description: '商品管理',
        recommendedAgent: 'productAgent',
        availableActions: [
          '商品を登録',
          '在庫を確認',
          '価格を更新',
          '商品分析を実行'
        ],
        dataContext: { ...contextData, productId: entityId }
      };
    }

    // デフォルト
    return {
      page: pathname,
      type: 'general',
      description: '一般的なページ',
      recommendedAgent: 'general',
      availableActions: [
        'システム操作をサポート',
        '機能の使い方を説明',
        'データを検索',
        'レポートを作成'
      ],
      dataContext: contextData
    };
  }

  static getContextualPrompt(context: PageContext, userMessage: string): string {
    const basePrompt = `
現在のコンテキスト:
- ページ: ${context.description}
- 種類: ${context.type}
- エンティティID: ${context.entityId || 'なし'}
- 利用可能なアクション: ${context.availableActions.join(', ')}

`;

    if (context.dataContext) {
      const dataInfo = Object.entries(context.dataContext)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
        .join('\n');
      
      if (dataInfo) {
        return basePrompt + `現在のデータ:\n${dataInfo}\n\nユーザーの質問: ${userMessage}`;
      }
    }

    return basePrompt + `ユーザーの質問: ${userMessage}`;
  }

  static getQuickTemplates(context: PageContext): Array<{title: string, prompt: string}> {
    const templates: Record<string, Array<{title: string, prompt: string}>> = {
      dashboard: [
        { title: '今月の売上を確認', prompt: '今月の売上実績を教えてください' },
        { title: '未払い請求書を確認', prompt: '未払いの請求書一覧を表示してください' },
        { title: 'キャッシュフロー分析', prompt: 'キャッシュフローの状況を分析してください' },
        { title: '利益率を計算', prompt: '今月の利益率を計算してください' }
      ],
      invoices: [
        { title: '新しい請求書を作成', prompt: '新しい請求書を作成したいです' },
        { title: '請求書をPDF出力', prompt: 'この請求書をPDF形式で出力してください' },
        { title: '支払い状況を確認', prompt: 'この請求書の支払い状況を確認してください' },
        { title: '売上として記録', prompt: 'この請求書を売上として記録してください' }
      ],
      quotes: [
        { title: '見積書を作成', prompt: '新しい見積書を作成したいです' },
        { title: '請求書に変換', prompt: 'この見積書を請求書に変換してください' },
        { title: '見積もり金額を計算', prompt: '見積もり金額を自動計算してください' },
        { title: '承認状況を確認', prompt: 'この見積書の承認状況を確認してください' }
      ],
      customers: [
        { title: '顧客情報を登録', prompt: '新しい顧客を登録したいです' },
        { title: '取引履歴を表示', prompt: 'この顧客の取引履歴を表示してください' },
        { title: '売上分析を実行', prompt: 'この顧客の売上分析を実行してください' },
        { title: '請求書を作成', prompt: 'この顧客向けの請求書を作成してください' }
      ],
      journals: [
        { title: '仕訳を作成', prompt: '新しい仕訳を作成したいです' },
        { title: '勘定科目を確認', prompt: '適切な勘定科目を教えてください' },
        { title: '税計算を実行', prompt: '税額を自動計算してください' },
        { title: '残高試算表を表示', prompt: '残高試算表を表示してください' }
      ],
      documents: [
        { title: 'OCR処理を実行', prompt: 'この書類をOCR処理してください' },
        { title: '自動仕訳を提案', prompt: 'このOCR結果から仕訳を提案してください' },
        { title: 'テキストを抽出', prompt: 'この画像からテキストを抽出してください' },
        { title: '仕訳を作成', prompt: 'この書類から仕訳を作成してください' }
      ]
    };

    return templates[context.type] || templates.dashboard;
  }
}