// NLPオーケストレーターのラッパー（Mastraのインポート問題を回避）

// 簡易的な意図解析（Mastraを使わない暫定実装）
function analyzeIntent(input: string) {
  if (input.includes('請求書') || input.includes('invoice')) {
    return { type: 'create_document', documentType: 'invoice' };
  } else if (input.includes('見積書') || input.includes('estimate')) {
    return { type: 'create_document', documentType: 'estimate' };
  } else if (input.includes('領収書') || input.includes('receipt')) {
    return { type: 'create_document', documentType: 'receipt' };
  } else if (input.includes('売上') || input.includes('分析')) {
    return { type: 'analyze_data' };
  } else if (input.includes('確定申告') || input.includes('税')) {
    return { type: 'tax_return' };
  }
  return { type: 'unknown' };
}

export async function processUserInput(input: string, context?: any): Promise<any> {
  console.log('NLP Wrapper called with:', input);
  
  // 暫定的に簡易解析を使用
  const intent = analyzeIntent(input);
  
  // Mastraの問題が解決するまでは、常に従来の処理にフォールバック
  return {
    success: false,
    intent,
    error: 'Mastra統合は準備中です。従来の処理を使用してください。'
  };
}