import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { CustomerService } from '@/services/customer.service';
import { BankAccountService } from '@/services/bank-account.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { z } from 'zod';
import { format } from 'date-fns';
import { calculateDueDate, getPaymentTermsDescription } from '@/utils/payment-terms';

import { logger } from '@/lib/logger';
// AI クライアントの初期化
let openaiClient: OpenAI | null = null;

// DeepSeek APIを直接呼び出す関数
async function callDeepSeekAPI(messages: Array<{role: string, content: string}>, temperature: number = 0.7, maxTokens: number = 500) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    logger.error('[DeepSeek] API key is not configured');
    throw new Error('DeepSeek API key is not configured');
  }
  
  logger.debug('[DeepSeek] Calling API with fetch');
  logger.debug('[DeepSeek] API key length:', apiKey.length);
  logger.debug('[DeepSeek] API key prefix:', apiKey.substring(0, 10) + '...');
  
  // タイムアウトを設定（8秒）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[DeepSeek] API error:', response.status);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    logger.debug('[DeepSeek] API response received');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('[DeepSeek] Request timeout');
      throw new Error('DeepSeek API request timeout');
    }
    logger.error('[DeepSeek] Fetch error:', error);
    throw error;
  }
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    openaiClient = new OpenAI({
      apiKey,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT 
        ? `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`
        : undefined,
      defaultQuery: process.env.AZURE_OPENAI_ENDPOINT 
        ? { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-01' }
        : undefined,
      defaultHeaders: process.env.AZURE_OPENAI_ENDPOINT
        ? { 'api-key': process.env.AZURE_OPENAI_API_KEY || '' }
        : undefined,
    });
  }
  return openaiClient;
}

// レスポンススキーマ
const InvoiceDataSchema = z.object({
  customerName: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    amount: z.number(),
    taxRate: z.number().default(0.1),
    taxAmount: z.number(),
  })),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'credit_card', 'cash', 'other']).default('bank_transfer'),
});

type InvoiceData = z.infer<typeof InvoiceDataSchema>;

export async function POST(request: NextRequest) {
  // Vercelのタイムアウトを考慮して、早期にレスポンスヘッダーを設定
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  
  try {
    logger.debug('[API Start] analyze-chat endpoint called at', new Date().toISOString());
    
    const body = await request.json();
    logger.debug('Analyze chat request body:', body);
    
    const { 
      conversation, 
      conversationHistory,
      sessionId,
      currentInvoiceData,
      mode = 'create',
      initialInvoiceData
    } = body;
    
    if (!conversation || typeof conversation !== 'string') {
      logger.debug('Invalid conversation data:', conversation);
      return NextResponse.json(
        { error: 'Conversation text is required' },
        { status: 400 }
      );
    }
    
    logger.debug('Conversation to analyze:', conversation);
    logger.debug('Session ID:', sessionId);
    logger.debug('Mode:', mode);
    logger.debug('[DEBUG] Current invoice data received:', JSON.stringify(currentInvoiceData, null, 2));
    
    // 重要：currentInvoiceDataのitemsを確認
    if (currentInvoiceData && currentInvoiceData.items) {
      logger.debug('[DEBUG] Current items count:', currentInvoiceData.items.length);
      currentInvoiceData.items.forEach((item, index) => {
        logger.debug(`[DEBUG] Item ${index + 1}:`, {
          description: item.description,
          amount: item.amount,
          taxAmount: item.taxAmount
        });
      });
    }

    // DeepSeek APIを最優先で使用
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    
    logger.debug('API Keys status:', {
      hasDeepSeekKey: !!deepseekApiKey,
      hasOpenAIKey: !!openaiApiKey,
      deepseekKeyLength: deepseekApiKey?.length || 0
    });
    
    // 利用可能なAIサービスをチェック（DeepSeek最優先）
    const hasDeepSeek = !!deepseekApiKey;
    let hasOpenAI = false;
    let aiResponse = ''; // AIレスポンスを格納する変数
    
    // OpenAI APIキーの有効性をチェック（フォールバック用）
    if (openaiApiKey) {
      try {
        getOpenAIClient();
        hasOpenAI = true;
      } catch (error) {
        logger.debug('OpenAI API key is invalid or not configured properly');
        hasOpenAI = false;
      }
    }
    
    // AI APIを使用する場合（DeepSeek最優先、OpenAIはフォールバック）
    if (hasDeepSeek || hasOpenAI) {
      const usingDeepSeek = hasDeepSeek;
      logger.debug(`Using ${usingDeepSeek ? 'DeepSeek' : 'OpenAI'} API for conversation analysis`);
      
      // 会社情報から支払い条件を取得
      let paymentTerms = '';
      let companyInvoiceNotes = '';
      try {
        const companyInfoService = new CompanyInfoService();
        const companyInfo = await companyInfoService.getCompanyInfo();
        if (companyInfo) {
          paymentTerms = companyInfo.paymentTerms || '';
          companyInvoiceNotes = companyInfo.invoiceNotes || '';
        }
      } catch (error) {
        logger.error('Error fetching company info:', error);
      }

      // 現在の日付を取得
      const today = new Date();
      const invoiceDate = format(today, 'yyyy-MM-dd');
      // 支払い条件に基づいて支払期限を計算
      const calculatedDueDate = calculateDueDate(today, paymentTerms);
      const dueDate = format(calculatedDueDate, 'yyyy-MM-dd');

      // 自然な対話のためのプロンプト（簡潔版）
      let systemPrompt = '';
      
      if (mode === 'edit' && currentInvoiceData) {
        // 編集モードの場合、既存データを詳細に含める
        const items = currentInvoiceData.items || [];
        const currentDetails = items.map((item, index) => 
          `${index + 1}. ${item.description || item.itemName}: ¥${((item.amount || 0) + (item.taxAmount || 0)).toLocaleString()}`
        ).join('\n');
        
        systemPrompt = `あなたは請求書編集を支援するAIアシスタントです。
既存の請求書データを編集する際は、ユーザーの指示に従って変更を行ってください。

現在の請求書データ：
顧客名: ${currentInvoiceData.customerName || '未設定'}
${items.length > 0 ? `現在の明細：
${currentDetails}
合計金額: ¥${((currentInvoiceData.totalAmount || 0)).toLocaleString()}（税込）` : '明細: なし'}

重要なルール：
1. 自然で親しみやすい日本語で応答
2. 変更後の請求項目は番号付きリストで表示
3. 例：「1. システム構築費：1,200,000円」
4. 編集完了時は「下の『会話を終了して確定』ボタンをクリックしてください」と案内
5. 明細の追加・削除・変更に対応

今日: ${invoiceDate}、支払期限: ${dueDate}`;
      } else {
        // 作成モードの場合
        systemPrompt = `あなたは請求書作成を支援するAIアシスタントです。
ユーザーとの自然な会話を通じて、請求書に必要な情報を収集してください。

現在の請求書データ：
${currentInvoiceData ? `顧客名: ${currentInvoiceData.customerName || '未設定'}
項目数: ${currentInvoiceData.items?.length || 0}` : 'なし'}

重要なルール：
1. 自然で親しみやすい日本語で応答
2. 請求項目は番号付きリストで表示
3. 例：「1. システム構築費：1,200,000円」
4. 完成時は「下の『会話を終了して確定』ボタンをクリックしてください」と案内

今日: ${invoiceDate}、支払期限: ${dueDate}`;
      }

      try {
        logger.debug('[AI] Starting AI processing', { usingDeepSeek });
        
        // 会話履歴を含むメッセージを構築（最大10メッセージに制限）
        const messages = [{ role: 'system', content: systemPrompt }];
        
        // 会話履歴を追加（最新の10メッセージのみ）
        if (conversationHistory && conversationHistory.length > 0) {
          const recentHistory = conversationHistory.slice(-10);
          recentHistory.forEach(msg => {
            messages.push({
              role: msg.role as string,
              content: msg.content
            });
          });
        }
        
        // 最新のユーザー入力を追加
        messages.push({ role: 'user', content: conversation });

        logger.debug('Sending to AI with messages:', messages.length);

        try {
          let modelName = 'unknown';
          if (usingDeepSeek) {
            // DeepSeek APIを直接呼び出す
            modelName = 'deepseek-chat';
            const deepseekResponse = await callDeepSeekAPI(messages, 0.7, 500);
            aiResponse = deepseekResponse.choices?.[0]?.message?.content || '';
            logger.debug('[DeepSeek] Response received');
          } else {
            // OpenAI APIを使用
            const aiClient = getOpenAIClient();
            modelName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';
            const completion = await aiClient.chat.completions.create({
              model: modelName,
              messages: messages as any,
              temperature: 0.7,
              max_tokens: 500
            });
            aiResponse = completion.choices[0]?.message?.content || '';
            logger.debug('[OpenAI] Response received');
          }
        } catch (apiError) {
          logger.error('[AI] API call failed:', {
            error: apiError instanceof Error ? apiError.message : 'Unknown error',
            stack: apiError instanceof Error ? apiError.stack : undefined,
            model: usingDeepSeek ? 'deepseek-chat' : (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4'),
            usingDeepSeek,
            responseStatus: apiError instanceof Error && 'response' in apiError ? (apiError as any).response?.status : undefined,
            responseData: apiError instanceof Error && 'response' in apiError ? (apiError as any).response?.data : undefined
          });
          
          // DeepSeekが失敗した場合、OpenAIを試す
          if (usingDeepSeek && hasOpenAI) {
            logger.debug('[AI] DeepSeek failed, trying OpenAI as fallback');
            try {
              const openaiClient = getOpenAIClient();
              const openaiModel = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';
              const openaiCompletion = await openaiClient.chat.completions.create({
                model: openaiModel,
                messages: messages as any,
                temperature: 0.7,
                max_tokens: 500
              });
              aiResponse = openaiCompletion.choices[0]?.message?.content || '';
              logger.debug('[AI] OpenAI fallback successful');
            } catch (openaiError) {
              logger.error('[AI] OpenAI fallback also failed:', openaiError);
              // 両方失敗した場合はパターンマッチングに進む
              logger.debug('Both AI services failed, falling back to pattern matching logic');
            }
          } else {
            // APIエラーの場合はフォールバックロジックに進む
            logger.debug('Falling back to pattern matching logic due to API error');
          }
        }
        
        // AIレスポンスからデータを抽出
        let extractedData = null;
        let updatedData = { 
          ...currentInvoiceData,
          items: currentInvoiceData?.items ? [...currentInvoiceData.items] : []
        };
        
        // ユーザー入力から直接情報を抽出（AI応答より優先）
        const userInput = conversation.toLowerCase();
        
        // 顧客名の抽出（ユーザー入力優先）
        const customerNamePatterns = [
          /([^\s]+(?:株式会社|会社|商事|工業|製作所|ストア|ショップ|サービス|システム|コーポレーション))(?:に|へ|向け|宛|様|さん)?/,
          /([^\s]+会社)(?:に|へ|向け|宛|様|さん)?/,
          /([^\s]+商事)(?:に|へ|向け|宛|様|さん)?/
        ];
        
        let userSpecifiedCustomerName = null;
        for (const pattern of customerNamePatterns) {
          const match = conversation.match(pattern);
          if (match && match[1]) {
            userSpecifiedCustomerName = match[1].replace(/さん$|様$/g, '').trim();
            logger.debug('[AI] User specified customer name:', userSpecifiedCustomerName);
            break;
          }
        }
        
        // 支払方法の抽出
        if (userInput.includes('カード') || userInput.includes('クレジット')) {
          updatedData.paymentMethod = 'credit_card';
          logger.debug('[AI] Payment method set to credit_card based on user input');
        }
        
        // 金額の抽出（税込み・税抜きの判定を含む）
        let userSpecifiedAmount = null;
        let isTaxIncluded = false;
        
        // 税込み金額のパターン
        const taxIncludedPatterns = [
          /税込み?(\d+)万円/,
          /税込(\d+)万円/,
          /(\d+)万円.*税込/,
          /月(\d+)万円/  // 「月10万円」は通常税込み
        ];
        
        for (const pattern of taxIncludedPatterns) {
          const match = conversation.match(pattern);
          if (match) {
            userSpecifiedAmount = parseInt(match[1]) * 10000;
            isTaxIncluded = true;
            logger.debug('[AI] Tax-included amount specified by user:', userSpecifiedAmount);
            break;
          }
        }
        
        // 税抜き金額のパターン（明示的に指定された場合のみ）
        if (!userSpecifiedAmount) {
          const taxExcludedPatterns = [
            /税抜き?(\d+)万円/,
            /税別(\d+)万円/,
            /(\d+)万円.*税抜/,
            /(\d+)万円.*税別/
          ];
          
          for (const pattern of taxExcludedPatterns) {
            const match = conversation.match(pattern);
            if (match) {
              const baseAmount = parseInt(match[1]) * 10000;
              userSpecifiedAmount = baseAmount; // 税抜き金額として保存
              isTaxIncluded = false;
              logger.debug('[AI] Tax-excluded amount specified by user:', userSpecifiedAmount);
              break;
            }
          }
        }
        
        // 定期請求の判定
        const isRecurring = userInput.includes('定期') || userInput.includes('毎月') || userInput.includes('月額');
        const recurringMonths = conversation.match(/(\d+)ヶ月/) || conversation.match(/(\d+)か月/);
        const monthCount = recurringMonths ? parseInt(recurringMonths[1]) : null;
        
        if (aiResponse) {
          logger.debug('[AI] Processing AI response for data extraction');
          logger.debug('[AI] AI Response:', aiResponse);
          
          // シンプルなキーワードベースの抽出
          const lines = aiResponse.split('\n');
          let newItems = [];
          let foundItemList = false;
          
          // 顧客名の最終決定（ユーザー指定を最優先）
          if (userSpecifiedCustomerName) {
            updatedData.customerName = userSpecifiedCustomerName;
            logger.debug('[AI] Using user-specified customer name:', userSpecifiedCustomerName);
          } else if (mode === 'edit') {
            // 初期データから元の顧客名を取得
            const originalCustomerName = initialInvoiceData?.customerName || currentInvoiceData?.customerName || '';
            logger.debug('[AI] Edit mode - Original customer name:', originalCustomerName);
            
            // AIの応答から顧客名の変更指示を探す（複数パターンに対応）
            const customerNamePatterns = [
              // パターン1: 「顧客名を「谷川商事」から「山田商事」に変更」
              /顧客名を[「『]?([^」』\n]+)[」』]?から[「『]?([^」』\n]+)[」』]?に変更/,
              // パターン2: 「顧客名を「山田商事」に変更」
              /顧客名?を?[「『]?([^」』\n]+)[」』]?に変更/,
              // パターン3: 「新しい顧客名: 山田商事」
              /新しい顧客名[：:]\s*([^\n]+)/,
              // パターン4: 「顧客名: 山田商事」（明細内で）
              /顧客名[：:]\s*([^\n]+)/
            ];
            
            let extractedName = '';
            let matchFound = false;
            
            for (const pattern of customerNamePatterns) {
              const match = aiResponse.match(pattern);
              if (match) {
                // パターン1の場合は2番目のキャプチャグループ（変更後の名前）を使用
                if (pattern.source.includes('から')) {
                  extractedName = (match[2] || '').trim();
                } else {
                  extractedName = (match[1] || '').trim();
                }
                
                if (extractedName && extractedName !== 'Unknown Customer' && extractedName !== '未設定') {
                  matchFound = true;
                  logger.debug('[AI] Customer name change detected with pattern:', pattern.source);
                  logger.debug('[AI] Extracted customer name:', extractedName);
                  break;
                }
              }
            }
            
            if (matchFound) {
              updatedData.customerName = extractedName;
              logger.debug('[AI] Customer name explicitly changed to:', updatedData.customerName);
            } else {
              // ユーザーの会話からも顧客名変更の指示を探す
              const userConversationPatterns = [
                /([^\s]+商事|[^\s]+会社|[^\s]+株式会社|[^\s]+有限会社|[^\s]+[庄庄]司)\s*を?\s*選択/,
                /既存.*顧客.*から\s*([^\s]+商事|[^\s]+会社|[^\s]+株式会社|[^\s]+有限会社|[^\s]+[庄庄]司)/,
                /顧客.*([^\s]+商事|[^\s]+会社|[^\s]+株式会社|[^\s]+有限会社|[^\s]+[庄庄]司).*選択/
              ];
              
              let userRequestedName = '';
              for (const pattern of userConversationPatterns) {
                const match = conversation.match(pattern);
                if (match && match[1]) {
                  userRequestedName = match[1].trim();
                  logger.debug('[AI] User requested customer name from conversation:', userRequestedName);
                  break;
                }
              }
              
              if (userRequestedName && userRequestedName !== originalCustomerName) {
                updatedData.customerName = userRequestedName;
                logger.debug('[AI] Customer name changed based on user request:', updatedData.customerName);
              } else {
                // 顧客名の変更指示がない場合は元の顧客名を維持
                updatedData.customerName = originalCustomerName;
                logger.debug('[AI] No customer name change detected, keeping original:', originalCustomerName);
              }
            }
          }
          
          // 新規作成モードの場合のみ、会話から顧客名を抽出
          if (mode === 'create' && !updatedData.customerName && conversation) {
            const customerMatch = conversation.match(/([^に]+)(?:さん|様)?に/);
            if (customerMatch) {
              updatedData.customerName = customerMatch[1].replace(/さん|様/g, '').trim();
              logger.debug('[AI] Extracted customer name from conversation:', updatedData.customerName);
            }
          }
          
          // まず、ユーザーの入力メッセージから金額変更の指示を確認
          logger.debug('[AI] Checking user conversation for amount:', conversation);
          const userAmountMatch = conversation.match(/([\d万,]+)円\s*(?:の\s*)?(?:税別|税抜)/);
          if (userAmountMatch && mode === 'edit') {
            const amountStr = userAmountMatch[1].replace(/万/g, '0000').replace(/,/g, '');
            const amount = parseInt(amountStr);
            logger.debug(`[AI] Found amount in user input: ${amount}円 (tax excluded)`);
            logger.debug('[AI] Current invoice items before update:', JSON.stringify(currentInvoiceData?.items, null, 2));
            
            // 既存のアイテムを更新
            if (currentInvoiceData?.items && currentInvoiceData.items.length > 0) {
              newItems = currentInvoiceData.items.map((item, index) => {
                if (index === 0) { // 最初のアイテムの金額を更新
                  logger.debug('[AI] Updating item:', {
                    originalUnitPrice: item.unitPrice,
                    newUnitPrice: amount,
                    quantity: item.quantity,
                    taxRate: item.taxRate
                  });
                  return {
                    ...item,
                    unitPrice: amount,
                    amount: amount * item.quantity,
                    taxAmount: Math.floor(amount * item.quantity * item.taxRate)
                  };
                }
                return item;
              });
              foundItemList = true;
              logger.debug('[AI] Updated items based on user input:', JSON.stringify(newItems, null, 2));
            }
          } else {
            logger.debug('[AI] No amount found in user input or not in edit mode. Mode:', mode);
          }
          
          // 定期請求書の処理（ユーザー指定に基づく）
          if (isRecurring && userSpecifiedAmount && monthCount) {
            // 定期請求書として1項目のみ作成
            const monthlyAmount = isTaxIncluded 
              ? Math.floor(userSpecifiedAmount / 1.1) // 税込みから税抜きを計算
              : userSpecifiedAmount; // 税抜き金額
            
            const description = currentInvoiceData?.items?.[0]?.description || 'LLMOフルコンサルティング';
            
            newItems = [{
              description: `${description}（月額 × ${monthCount}ヶ月）`,
              quantity: monthCount,
              unitPrice: monthlyAmount,
              amount: monthlyAmount * monthCount,
              taxRate: 0.1,
              taxAmount: Math.floor(monthlyAmount * monthCount * 0.1)
            }];
            
            foundItemList = true;
            logger.debug('[AI] Created recurring invoice item:', newItems[0]);
          } else if (userSpecifiedAmount && !foundItemList) {
            // 通常の請求書で金額が指定された場合
            const baseAmount = isTaxIncluded 
              ? Math.floor(userSpecifiedAmount / 1.1) // 税込みから税抜きを計算
              : userSpecifiedAmount; // 税抜き金額
              
            if (currentInvoiceData?.items && currentInvoiceData.items.length > 0) {
              // 既存項目の金額を更新
              newItems = currentInvoiceData.items.map((item, index) => {
                if (index === 0) {
                  return {
                    ...item,
                    unitPrice: baseAmount,
                    amount: baseAmount * item.quantity,
                    taxAmount: Math.floor(baseAmount * item.quantity * 0.1)
                  };
                }
                return item;
              });
              foundItemList = true;
            } else {
              // 新規項目を作成
              newItems = [{
                description: '請求項目',
                quantity: 1,
                unitPrice: baseAmount,
                amount: baseAmount,
                taxRate: 0.1,
                taxAmount: Math.floor(baseAmount * 0.1)
              }];
              foundItemList = true;
            }
          } else {
            // AIの応答から番号付き項目を探す（フォールバック）
            for (const line of lines) {
              const itemMatch = line.match(/^(\d+)\.\s*([^：]+)：\s*([\d,]+)円/);
              if (itemMatch) {
                foundItemList = true;
                const itemNumber = parseInt(itemMatch[1]);
                const description = itemMatch[2].trim();
                const amount = parseInt(itemMatch[3].replace(/,/g, ''));
                
                logger.debug(`[AI] Found item ${itemNumber}: ${description} = ${amount}円`);
                
                // AIが提示した金額が税込みか税抜きかを判定
                const aiAmountIsTaxIncluded = line.includes('税込') || !line.includes('税抜');
                const baseAmount = aiAmountIsTaxIncluded ? Math.floor(amount / 1.1) : amount;
                
                newItems.push({
                  description: description,
                  quantity: 1,
                  unitPrice: baseAmount,
                  amount: baseAmount,
                  taxRate: 0.1,
                  taxAmount: Math.floor(baseAmount * 0.1)
                });
              }
            }
          }
          
          // 金額変更の指示を探す（例：「税抜を12万5000円にしてください」「13万7500円（税込13万7500円）に変更します」）
          let amountUpdateFound = false;
          for (const line of lines) {
            // パターン1: 「税抜を○○円にして」
            const taxExcludedMatch = line.match(/税抜を([\d万,]+)円にして/);
            if (taxExcludedMatch) {
              const amountStr = taxExcludedMatch[1].replace(/万/g, '0000').replace(/,/g, '');
              const amount = parseInt(amountStr);
              logger.debug(`[AI] Found tax-excluded amount update request: ${amount}円`);
              amountUpdateFound = true;
              
              // 既存のアイテムまたは新規アイテムを更新
              if (currentInvoiceData?.items && currentInvoiceData.items.length > 0) {
                newItems = currentInvoiceData.items.map((item, index) => {
                  if (index === 0) { // 最初のアイテムの金額を更新
                    return {
                      ...item,
                      unitPrice: amount,
                      amount: amount * item.quantity,
                      taxAmount: Math.floor(amount * item.quantity * item.taxRate)
                    };
                  }
                  return item;
                });
                foundItemList = true;
              }
            }
            
            // パターン4: 「○○円 税別」「○○円 税抜」パターン
            const taxSeparateMatch = line.match(/([\d万,]+)円\s*(?:税別|税抜)/);
            if (taxSeparateMatch && !amountUpdateFound) {
              const amountStr = taxSeparateMatch[1].replace(/万/g, '0000').replace(/,/g, '');
              const amount = parseInt(amountStr);
              logger.debug(`[AI] Found tax-separate amount pattern: ${amount}円 (tax excluded)`);
              amountUpdateFound = true;
              
              // 既存のアイテムまたは新規アイテムを更新
              if (currentInvoiceData?.items && currentInvoiceData.items.length > 0) {
                newItems = currentInvoiceData.items.map((item, index) => {
                  if (index === 0) { // 最初のアイテムの金額を更新
                    return {
                      ...item,
                      unitPrice: amount,
                      amount: amount * item.quantity,
                      taxAmount: Math.floor(amount * item.quantity * item.taxRate)
                    };
                  }
                  return item;
                });
                foundItemList = true;
              }
            }
            
            // パターン2: 「○○円（税抜○○円）に変更」
            const changeMatch = line.match(/([\d万,]+)円（税抜\s*([\d万,]+)円）に変更/);
            if (changeMatch) {
              const taxExcludedStr = changeMatch[2].replace(/万/g, '0000').replace(/,/g, '');
              const amount = parseInt(taxExcludedStr);
              logger.debug(`[AI] Found amount change: ${amount}円 (tax excluded)`);
              amountUpdateFound = true;
              
              // 既存のアイテムまたは新規アイテムを更新
              if (currentInvoiceData?.items && currentInvoiceData.items.length > 0) {
                newItems = currentInvoiceData.items.map((item, index) => {
                  if (index === 0) { // 最初のアイテムの金額を更新
                    return {
                      ...item,
                      unitPrice: amount,
                      amount: amount * item.quantity,
                      taxAmount: Math.floor(amount * item.quantity * item.taxRate)
                    };
                  }
                  return item;
                });
                foundItemList = true;
              }
            }
            
            // パターン3: 明細に含まれる金額変更（例：「1. コンサルティング費用: ¥137,500 (税抜 ¥125,000)」）
            const itemUpdateMatch = line.match(/^(\d+)\.\s*([^：:]+)[：:]\s*¥?([\d,]+)\s*\(税抜\s*¥?([\d,]+)\)/);
            if (itemUpdateMatch) {
              const description = itemUpdateMatch[2].trim();
              const taxExcluded = parseInt(itemUpdateMatch[4].replace(/,/g, ''));
              logger.debug(`[AI] Found item with tax info: ${description} = ${taxExcluded}円 (tax excluded)`);
              
              // この項目で既存のアイテムを更新
              newItems = [{
                description: description,
                quantity: 1,
                unitPrice: taxExcluded,
                amount: taxExcluded,
                taxRate: 0.1,
                taxAmount: Math.floor(taxExcluded * 0.1)
              }];
              foundItemList = true;
              amountUpdateFound = true;
            }
          }
          
          // 金額変更が見つかった場合のログ
          if (amountUpdateFound) {
            logger.debug('[AI] Amount update found, newItems:', JSON.stringify(newItems, null, 2));
          }
          
          // 合計金額の確認（税込み）
          let totalWithTax = null;
          for (const line of lines) {
            const totalMatch = line.match(/合計金額は[\d,]+円（税抜）で、消費税10%を加えると([\d,]+)円/);
            if (totalMatch) {
              totalWithTax = parseInt(totalMatch[1].replace(/,/g, ''));
              logger.debug('[AI] Found total with tax:', totalWithTax);
              break;
            }
          }
          
          // 項目が見つかった場合は、既存の項目を置き換える
          if (foundItemList && newItems.length > 0) {
            updatedData.items = newItems;
            logger.debug('[AI] Updated items from AI response:', JSON.stringify(newItems, null, 2));
          }
          
          // 編集モードの場合、日付も抽出
          if (mode === 'edit' && aiResponse) {
            // 請求日の抽出（例：「請求日: 2025-07-31」）
            const invoiceDateMatch = aiResponse.match(/請求日[：:]\s*(\d{4}-\d{2}-\d{2})/);
            if (invoiceDateMatch) {
              updatedData.invoiceDate = invoiceDateMatch[1];
              logger.debug('[AI] Extracted invoice date from AI response:', updatedData.invoiceDate);
            }
            
            // 支払期限の抽出（例：「支払期限: 2025-08-31」）
            const dueDateMatch = aiResponse.match(/支払期限[：:]\s*(\d{4}-\d{2}-\d{2})/);
            if (dueDateMatch) {
              updatedData.dueDate = dueDateMatch[1];
              logger.debug('[AI] Extracted due date from AI response:', updatedData.dueDate);
            }
          }
          
          // extractedDataに更新されたデータを設定
          extractedData = updatedData;
          logger.debug('[AI] Final extracted data:', JSON.stringify(extractedData, null, 2));
        }
        
        // フォールバック処理 - AIが番号付き項目を出力しなかった場合
        if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
          logger.debug('[AI] No items found in AI response, keeping current data');
          extractedData = currentInvoiceData || {};
        }
        
        // 日付設定（デフォルト値の設定）
        if (extractedData) {
          if (!extractedData.invoiceDate) {
            extractedData.invoiceDate = invoiceDate;
          }
          if (!extractedData.dueDate) {
            extractedData.dueDate = dueDate;
          }
        }
        
        // デフォルトの銀行口座情報を取得
        let bankAccountInfo = '';
        try {
          const bankAccountService = new BankAccountService();
          const defaultAccount = await bankAccountService.getDefaultAccount();
          
          if (defaultAccount) {
            const accountTypeText = defaultAccount.accountType === 'checking' ? '当座預金' : '普通預金';
            bankAccountInfo = `お振込先：\n${defaultAccount.bankName} ${defaultAccount.branchName}\n${accountTypeText} ${defaultAccount.accountNumber}\n口座名義：${defaultAccount.accountHolder}\n\n`;
          }
        } catch (error) {
          logger.error('Error fetching bank account:', error);
          // エラーが発生しても処理は続行
        }
        
        // 備考に支払い条件と振込先情報を追加
        if (!updatedData.notes) {
          let notesContent = '';
          
          // 支払い条件を追加
          if (paymentTerms) {
            notesContent += `【支払い条件】\n${paymentTerms}\n\n`;
          }
          
          // 会社の請求書備考を追加
          if (companyInvoiceNotes) {
            notesContent += `${companyInvoiceNotes}\n\n`;
          }
          
          // 振込先情報を追加
          if (bankAccountInfo) {
            notesContent += bankAccountInfo;
          }
          
          // 支払期限を追加
          notesContent += `お支払期限：${dueDate}\n`;
          
          // 振込手数料について
          if (!notesContent.includes('振込手数料')) {
            notesContent += '※振込手数料はお客様負担でお願いいたします';
          }
          
          updatedData.notes = notesContent.trim();
        }
        
        // paymentMethod設定
        if (!updatedData.paymentMethod) {
          updatedData.paymentMethod = 'bank_transfer';
        }

        // 合計計算 - extractedDataまたはupdatedDataのいずれかから正しいitemsを取得
        const finalData = extractedData || updatedData;
        const subtotal = finalData.items ? finalData.items.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
        const taxAmount = finalData.items ? finalData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0) : 0;
        const totalAmount = subtotal + taxAmount;
        
        // デバッグログ
        logger.debug('[API/AI] Final data before response:', {
          finalDataSource: extractedData ? 'extractedData' : 'updatedData',
          items: finalData.items,
          subtotal,
          taxAmount,
          totalAmount,
          itemsDetail: finalData.items?.map(item => ({
            description: item.description,
            amount: item.amount,
            taxAmount: item.taxAmount
          }))
        });
        
        // レスポンスの作成
        // AIの応答からJSONやコードを除去して、自然な日本語のみを抽出
        let cleanMessage = aiResponse;
        // JSONブロックを除去
        cleanMessage = cleanMessage.replace(/```json[\s\S]*?```/g, '');
        cleanMessage = cleanMessage.replace(/\{[\s\S]*?"extractedData"[\s\S]*?\}/g, '');
        // コードブロックを除去
        cleanMessage = cleanMessage.replace(/```[\s\S]*?```/g, '');
        // 連続する改行を1つに
        cleanMessage = cleanMessage.replace(/\n\n+/g, '\n\n').trim();
        
        // デバッグログを追加
        logger.debug('[API/AI] Final data for response generation:', {
          mode,
          finalDataCustomerName: finalData.customerName,
          currentDataCustomerName: currentInvoiceData?.customerName,
          updatedDataCustomerName: updatedData.customerName,
          extractedDataExists: !!extractedData
        });
        
        // 編集モードの場合、AIが明示的に変更したデータを優先
        const responseData = mode === 'edit' ? {
          customerId: null,
          // AIが顧客名を明示的に変更した場合は新しい顧客名を使用、そうでなければ既存データを保持
          customerName: finalData.customerName || currentInvoiceData?.customerName || '',
          items: finalData.items || [],
          // 日付も同様の処理
          invoiceDate: finalData.invoiceDate || currentInvoiceData?.invoiceDate,
          dueDate: finalData.dueDate || currentInvoiceData?.dueDate,
          notes: finalData.notes || currentInvoiceData?.notes || '',
          paymentMethod: finalData.paymentMethod || currentInvoiceData?.paymentMethod || 'bank_transfer',
          subtotal,
          taxAmount,
          totalAmount,
        } : {
          customerId: null,
          customerName: finalData.customerName || '',
          items: finalData.items || [],
          invoiceDate: finalData.invoiceDate,
          dueDate: finalData.dueDate,
          notes: finalData.notes || '',
          paymentMethod: finalData.paymentMethod || 'bank_transfer',
          subtotal,
          taxAmount,
          totalAmount,
        };
        
        logger.debug('[API/AI] Response data customer name:', responseData.customerName);
        
        const response = {
          success: true,
          message: cleanMessage,
          data: responseData,
          aiConversationId: sessionId || Date.now().toString(),
        };

        logger.debug('[API] Final response being sent:', JSON.stringify(response, null, 2));
        logger.debug('[API] Response items count:', response.data.items?.length || 0);
        logger.debug('[API] Response subtotal:', response.data.subtotal);
        logger.debug('[API] Response total:', response.data.totalAmount);
        
        // 各アイテムの詳細をログ
        if (response.data.items && response.data.items.length > 0) {
          logger.debug('[API] Response items detail:');
          response.data.items.forEach((item, index) => {
            logger.debug(`[API] Item ${index}:`, {
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              taxAmount: item.taxAmount,
              total: item.amount + item.taxAmount
            });
          });
        }
        
        return NextResponse.json(response);
      } catch (error) {
        logger.error(`${usingDeepSeek ? 'DeepSeek' : 'OpenAI'} API error:`, error);
        logger.error('[DEBUG] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          apiKeyExists: !!process.env.OPENAI_API_KEY,
          apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
          deepSeekApiKeyExists: !!process.env.DEEPSEEK_API_KEY,
          deepSeekApiKeyLength: process.env.DEEPSEEK_API_KEY?.length || 0,
          usingDeepSeek
        });
        logger.debug(`${usingDeepSeek ? 'DeepSeek' : 'OpenAI'} API failed, falling back to placeholder implementation`);
        // フォールバック：プレースホルダー実装へ続く
      }
    }
    
    // プレースホルダー実装（AIが使えない場合の最小限のフォールバック）
    logger.debug('[DEBUG] Using minimal placeholder implementation - AI models not available or failed');
    logger.debug('[DEBUG] Environment check:', {
      openAIKeyExists: !!process.env.OPENAI_API_KEY,
      deepSeekKeyExists: !!process.env.DEEPSEEK_API_KEY,
      nodeEnv: process.env.NODE_ENV
    });
      
      // 最小限の数値抽出のみ実装
      const conversationLower = conversation.toLowerCase();
      
      // 既存データから顧客名を保持
      let customerName = currentInvoiceData?.customerName || '';
      
      // 金額の抽出（カンマ付き数値にも対応）
      let amount = 0;
      const amountMatch = conversation.match(/(\d{1,3}(?:,\d{3})*|\d+)(万円|万|円)/);
      if (amountMatch) {
        const numStr = amountMatch[1].replace(/,/g, '');
        const unit = amountMatch[2];
        amount = (unit === '万円' || unit === '万') ? 
          parseInt(numStr) * 10000 : 
          parseInt(numStr);
      }
      
      logger.debug('[Placeholder] Minimal extraction:', {
        conversation,
        amount,
        customerName
      });
      
      // 最小限のデータ作成
      const taxRate = 0.1;
      const taxAmount = Math.floor(amount * taxRate);
      const today = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 30); // デフォルト30日後
      
      // 既存のitemsまたは最小限の新規作成
      let items = currentInvoiceData?.items || [];
      
      // 金額が抽出された場合のみ項目を作成/更新
      if (amount > 0) {
        if (items.length === 0) {
          // 新規作成
          items = [{
            description: '請求項目',
            quantity: 1,
            unitPrice: amount,
            amount: amount,
            taxRate: taxRate,
            taxAmount: taxAmount
          }];
        } else {
          // 既存の最初の項目を更新
          items[0] = {
            ...items[0],
            unitPrice: amount,
            amount: amount,
            taxAmount: taxAmount
          };
        }
      }
      
      // 最小限の請求書データ作成
      const invoiceData: InvoiceData = {
        customerName: customerName || '未設定顧客',
        items: items,
        invoiceDate: currentInvoiceData?.invoiceDate || today.toISOString().split('T')[0],
        dueDate: currentInvoiceData?.dueDate || dueDate.toISOString().split('T')[0],
        notes: currentInvoiceData?.notes || 'AI会話から作成',
        paymentMethod: currentInvoiceData?.paymentMethod || 'bank_transfer'
      };
      
      // 最小限の応答メッセージ生成
      let responseMessage = '';
      let quickReplies: Array<{text: string, value: string}> = [];
      
      // プレースホルダー実装の場合は最小限のメッセージ
      if (customerName && amount > 0) {
        responseMessage = `以下の内容で請求書を作成します：\n\n` +
                        `・顧客名：${customerName}様\n` +
                        `・金額：¥${(amount + taxAmount).toLocaleString()}（税込）\n\n` +
                        `よろしければ、下の「会話を終了して確定」ボタンをクリックしてください。`;
      } else {
        responseMessage = `請求書作成に必要な情報をお知らせください。\n\n` +
                        `例：「田中商事に50万円の請求書」`;
      }
      
      // 既存の顧客マッチング処理
      let matchedCustomerId: string | null = null;
      
      if (customerName && customerName !== '未設定顧客') {
        try {
          const customerService = new CustomerService();
          const searchResult = await customerService.getCustomers({ 
            limit: 100
          });
          
          // 顧客名で部分一致検索
          const matchedCustomers = searchResult.customers.filter(c => 
            c.companyName.includes(customerName) || 
            (c.contactName && c.contactName.includes(customerName))
          );
          
          if (matchedCustomers.length > 0) {
            matchedCustomerId = matchedCustomers[0]._id!.toString();
            customerName = matchedCustomers[0].companyName;
          }
        } catch (err) {
          logger.error('Customer search error:', err);
        }
      }
      
      // 質問タイプを分析する関数
      const analyzeQuestionType = (message: string): {
        hasMultipleQuestions: boolean;
        isInfoRequest: boolean;
        isYesNoQuestion: boolean;
        isChoiceQuestion: boolean;
        shouldShowQuickReplies: boolean;
      } => {
        // 複数質問の検出
        const hasMultipleQuestions = (
          // 番号付きリスト
          /[1-9]\. |１\.|２\.|３\./g.test(message) ||
          // 箇条書き
          (message.match(/・/g) || []).length > 1 ||
          // 複数の疑問符
          (message.match(/？/g) || []).length > 1 ||
          // それぞれ、また、およびなどの接続詞
          message.includes('それぞれ') ||
          message.includes('また、') ||
          message.includes('および')
        );
        
        // 情報要求パターン（拡充版）
        const isInfoRequest = (
          message.includes('お知らせください') ||
          message.includes('教えてください') ||
          message.includes('入力してください') ||
          message.includes('記載してください') ||
          message.includes('お伝えください') ||
          message.includes('お聞かせください') ||
          message.includes('ご記入ください') ||
          message.includes('ご入力ください') ||
          message.includes('ご回答ください') ||
          message.includes('お答えください') ||
          message.includes('いただければ') ||
          message.includes('いただけますか') ||
          message.includes('教えていただけ') ||
          message.includes('お願いします') ||
          message.includes('お願いいたします') ||
          message.includes('ご提供ください')
        );
        
        // Yes/No質問パターン（厳密化）
        const isYesNoQuestion = (
          !hasMultipleQuestions && !isInfoRequest && (
            message.includes('よろしいですか') ||
            message.includes('よろしいでしょうか') ||
            message.includes('確定してもよろしいですか') ||
            message.includes('確定しますか') ||
            message.includes('問題ありませんか') ||
            message.includes('問題ないでしょうか') ||
            message.includes('大丈夫ですか') ||
            message.includes('これでよろしいですか') ||
            (message.includes('ありますか') && message.includes('？') && !message.includes('ど'))
          )
        );
        
        // 選択質問パターン
        const isChoiceQuestion = (
          !hasMultipleQuestions && !isInfoRequest && (
            message.includes('どの') ||
            message.includes('どちら') ||
            message.includes('どれ') ||
            message.includes('選択してください') ||
            message.includes('選んでください') ||
            message.includes('いずれか') ||
            message.includes('期間分')
          )
        );
        
        // クイックリプライを表示すべきか（デフォルトはfalse）
        const shouldShowQuickReplies = (
          !hasMultipleQuestions && 
          !isInfoRequest && 
          (isYesNoQuestion || isChoiceQuestion)
        );
        
        return {
          hasMultipleQuestions,
          isInfoRequest,
          isYesNoQuestion,
          isChoiceQuestion,
          shouldShowQuickReplies
        };
      };
      
      // プレースホルダー実装のデフォルトメッセージ設定
      // responseMessageとquickRepliesは既に上で定義されている
      
      // 既存の顧客マッチング処理は上で実行済み
      // matchedCustomerIdをcustomerIdとして使用
      const customerId = matchedCustomerId;
      
      // AIレスポンスがある場合は優先的に使用
      const finalMessage = aiResponse || responseMessage;
      
      // レスポンスの作成
      const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalTaxAmount = invoiceData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
      const totalAmount = subtotal + totalTaxAmount;
      
      logger.debug('[API] Response data calculation:', {
        items: invoiceData.items,
        subtotal,
        totalTaxAmount,
        totalAmount,
        itemsDetail: invoiceData.items.map(item => ({
          description: item.description,
          amount: item.amount,
          taxAmount: item.taxAmount
        }))
      });
      
      // 編集モードの場合、既存データを優先的に保持
      const responseData = mode === 'edit' ? {
        customerId,
        customerName: invoiceData.customerName !== '未設定顧客' ? invoiceData.customerName : (currentInvoiceData?.customerName || ''),
        items: invoiceData.items || [],
        invoiceDate: invoiceData.invoiceDate !== today.toISOString().split('T')[0] ? invoiceData.invoiceDate : (currentInvoiceData?.invoiceDate || invoiceData.invoiceDate),
        dueDate: invoiceData.dueDate,
        notes: invoiceData.notes !== 'AI会話から作成' ? invoiceData.notes : (currentInvoiceData?.notes || invoiceData.notes),
        paymentMethod: invoiceData.paymentMethod,
        subtotal,
        taxAmount: totalTaxAmount,
        totalAmount,
      } : {
        customerId,
        customerName: invoiceData.customerName,
        items: invoiceData.items || [],
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        notes: invoiceData.notes,
        paymentMethod: invoiceData.paymentMethod,
        subtotal,
        taxAmount: totalTaxAmount,
        totalAmount,
      };
      
      const response = {
        success: true,
        message: finalMessage,
        quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
        data: responseData,
        aiConversationId: sessionId || Date.now().toString(),
      };
      
      return NextResponse.json(response);
  } catch (error) {
    logger.error('Error analyzing conversation:', error);
    
    // タイムアウトエラーを明確に返す
    if (error instanceof Error && (error.message.includes('timeout') || error.name === 'AbortError')) {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          message: 'リクエストがタイムアウトしました。もう一度お試しください。'
        },
        { status: 504, headers }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze conversation',
        message: '会話の処理に失敗しました。もう一度お試しください。'
      },
      { status: 500, headers }
    );
  }
}