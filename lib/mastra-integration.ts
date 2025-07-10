// Mastra統合レイヤー
// Node.js v20での動作を確認済み

import { z } from 'zod';

// 簡易的なMastraオーケストレーター実装
export async function processNaturalLanguage(input: string, context?: any) {
  // 意図解析
  const intent = analyzeIntent(input);
  
  // エンティティ抽出
  const entities = extractEntities(input, intent.type);
  
  // アクション実行
  const result = await executeAction(intent, entities, context);
  
  // 応答生成
  const response = generateResponse(intent, result);
  
  return {
    success: true,
    intent,
    entities,
    result,
    response,
    timestamp: new Date().toISOString()
  };
}

// 意図解析
function analyzeIntent(input: string) {
  const patterns = [
    { type: 'create_document', patterns: ['請求書', '見積書', '領収書', '納品書', 'invoice', 'estimate', 'receipt'] },
    { type: 'process_document', patterns: ['OCR', '読み取', 'スキャン', '解析'] },
    { type: 'analyze_data', patterns: ['売上', '分析', 'レポート', '集計'] },
    { type: 'tax_return', patterns: ['確定申告', '青色申告', '白色申告', '税務申告'] },
    { type: 'tax_planning', patterns: ['節税', '税務対策', '控除'] },
    { type: 'ask_question', patterns: ['とは', 'って何', '教えて', '説明'] }
  ];
  
  for (const pattern of patterns) {
    if (pattern.patterns.some(p => input.includes(p))) {
      return { type: pattern.type, confidence: 0.9 };
    }
  }
  
  return { type: 'unknown', confidence: 0.3 };
}

// エンティティ抽出
function extractEntities(input: string, intentType: string) {
  const entities: any = {};
  
  // 金額の抽出
  const amountMatch = input.match(/(\d{1,3}(?:,\d{3})*|\d+)(?:万)?円/);
  if (amountMatch) {
    let amount = amountMatch[1].replace(/,/g, '');
    if (input.includes('万円')) {
      amount = String(parseInt(amount) * 10000);
    }
    entities.amount = parseInt(amount);
  }
  
  // 日付の抽出
  const dateMatch = input.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/);
  if (dateMatch) {
    entities.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }
  
  // 会社名の抽出
  const companyMatch = input.match(/(?:株式会社|有限会社|合同会社)?([^に対して、へ、の、を、から、より]+)(?:に対して|へ|の|を|から|より)/);
  if (companyMatch) {
    entities.company = companyMatch[1].trim();
  }
  
  // 文書タイプ別のエンティティ
  if (intentType === 'create_document') {
    if (input.includes('請求書') || input.includes('invoice')) {
      entities.documentType = 'invoice';
    } else if (input.includes('見積書') || input.includes('estimate')) {
      entities.documentType = 'estimate';
    } else if (input.includes('領収書') || input.includes('receipt')) {
      entities.documentType = 'receipt';
    } else if (input.includes('納品書')) {
      entities.documentType = 'delivery_note';
    }
  }
  
  // 税務関連
  if (intentType === 'tax_return') {
    const yearMatch = input.match(/(\d{4})年度?/);
    if (yearMatch) {
      entities.taxYear = parseInt(yearMatch[1]);
    }
    
    if (input.includes('青色申告')) {
      entities.blueTaxReturn = true;
    } else if (input.includes('白色申告')) {
      entities.blueTaxReturn = false;
    }
  }
  
  return entities;
}

// アクション実行（モック実装）
async function executeAction(intent: any, entities: any, context: any) {
  switch (intent.type) {
    case 'create_document':
      return {
        documentId: `DOC-${Date.now()}`,
        documentType: entities.documentType || 'invoice',
        documentNumber: generateDocumentNumber(entities.documentType),
        amount: entities.amount || 0,
        company: entities.company || 'デフォルト会社',
        date: entities.date || new Date().toISOString().split('T')[0],
        status: 'draft'
      };
      
    case 'tax_return':
      return {
        taxReturnId: `TAX-${Date.now()}`,
        taxYear: entities.taxYear || new Date().getFullYear() - 1,
        type: entities.blueTaxReturn ? '青色申告' : '白色申告',
        status: 'preparing',
        estimatedTax: Math.floor((entities.amount || 1000000) * 0.2),
        deductions: ['基礎控除', '社会保険料控除']
      };
      
    case 'analyze_data':
      return {
        analysisId: `ANALYSIS-${Date.now()}`,
        period: getCurrentPeriod(),
        totalSales: 1500000,
        totalExpenses: 800000,
        profit: 700000,
        topCustomers: ['ABC商事', 'XYZ会社', 'テスト商店']
      };
      
    default:
      return {
        message: '処理を実行しました',
        timestamp: new Date().toISOString()
      };
  }
}

// 応答生成
function generateResponse(intent: any, result: any): string {
  switch (intent.type) {
    case 'create_document':
      const docTypes = {
        invoice: '請求書',
        estimate: '見積書',
        receipt: '領収書',
        delivery_note: '納品書'
      };
      return `${docTypes[result.documentType]}を作成しました。\n文書番号: ${result.documentNumber}\n金額: ¥${result.amount.toLocaleString()}\n宛先: ${result.company}`;
      
    case 'tax_return':
      return `${result.taxYear}年度の${result.type}の準備を開始しました。\n推定納税額: ¥${result.estimatedTax.toLocaleString()}\n適用控除: ${result.deductions.join('、')}`;
      
    case 'analyze_data':
      return `${result.period}の分析結果:\n売上: ¥${result.totalSales.toLocaleString()}\n経費: ¥${result.totalExpenses.toLocaleString()}\n利益: ¥${result.profit.toLocaleString()}\n\n主要顧客:\n${result.topCustomers.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
      
    case 'ask_question':
      return '申し訳ございません。質問への回答機能は現在準備中です。';
      
    default:
      return 'ご要望を理解できませんでした。もう少し詳しく教えていただけますか？';
  }
}

// ヘルパー関数
function generateDocumentNumber(type: string): string {
  const prefix = {
    invoice: 'INV',
    estimate: 'EST',
    receipt: 'REC',
    delivery_note: 'DLV'
  }[type] || 'DOC';
  
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  
  return `${prefix}-${year}${month}-${random}`;
}

function getCurrentPeriod(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month <= 3) {
    return `${year}年第1四半期`;
  } else if (month <= 6) {
    return `${year}年第2四半期`;
  } else if (month <= 9) {
    return `${year}年第3四半期`;
  } else {
    return `${year}年第4四半期`;
  }
}