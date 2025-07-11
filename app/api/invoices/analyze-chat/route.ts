import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { CustomerService } from '@/services/customer.service';
import { BankAccountService } from '@/services/bank-account.service';
import { z } from 'zod';
import { format } from 'date-fns';

// AI クライアントの初期化
let openaiClient: OpenAI | null = null;

// DeepSeek APIを直接呼び出す関数
async function callDeepSeekAPI(messages: Array<{role: string, content: string}>, temperature: number = 0.7, maxTokens: number = 500) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('[DeepSeek] API key is not configured');
    throw new Error('DeepSeek API key is not configured');
  }
  
  console.log('[DeepSeek] Calling API with fetch');
  console.log('[DeepSeek] API key length:', apiKey.length);
  console.log('[DeepSeek] API key prefix:', apiKey.substring(0, 10) + '...');
  
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
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepSeek] API error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[DeepSeek] API response received');
    return data;
  } catch (error) {
    console.error('[DeepSeek] Fetch error:', error);
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
  try {
    console.log('[API Start] analyze-chat endpoint called');
    
    const body = await request.json();
    console.log('Analyze chat request body:', body);
    
    const { 
      conversation, 
      conversationHistory,
      sessionId,
      currentInvoiceData,
      mode = 'create'
    } = body;
    
    if (!conversation || typeof conversation !== 'string') {
      console.log('Invalid conversation data:', conversation);
      return NextResponse.json(
        { error: 'Conversation text is required' },
        { status: 400 }
      );
    }
    
    console.log('Conversation to analyze:', conversation);
    console.log('Session ID:', sessionId);
    console.log('Mode:', mode);
    console.log('[DEBUG] Current invoice data received:', JSON.stringify(currentInvoiceData, null, 2));

    // DeepSeek APIを最優先で使用
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    
    console.log('API Keys status:', {
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
        console.log('OpenAI API key is invalid or not configured properly');
        hasOpenAI = false;
      }
    }
    
    // AI APIを使用する場合（DeepSeek最優先、OpenAIはフォールバック）
    if (hasDeepSeek || hasOpenAI) {
      const usingDeepSeek = hasDeepSeek;
      console.log(`Using ${usingDeepSeek ? 'DeepSeek' : 'OpenAI'} API for conversation analysis`);
      
      // 現在の日付を取得
      const today = new Date();
      const invoiceDate = format(today, 'yyyy-MM-dd');
      const dueDate = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // 自然な対話のためのプロンプト
      const systemPrompt = `あなたは請求書作成を支援するAIアシスタントです。
ユーザーとの自然な会話を通じて、請求書に必要な情報を段階的に収集してください。

現在の請求書データ：
${JSON.stringify(currentInvoiceData || {}, null, 2)}

重要なルール：
1. 自然で親しみやすい日本語で応答してください
2. 既存データがある場合は保持し、新しい項目は追加してください
3. 必要な情報が不足している場合は質問してください
4. 確認が必要な場合は「よろしいですか？」と聞いてください
5. 今日の日付: ${invoiceDate}、支払期限: ${dueDate}です
6. ユーザーが「今の状況は？」と聞いた場合は、現在の請求書データを分かりやすく説明してください

応答は簡潔で分かりやすくしてください。`;

      try {
        console.log('[AI] Starting AI processing', { usingDeepSeek });
        
        // 会話履歴を含むメッセージを構築
        const messages = [{ role: 'system', content: systemPrompt }];
        
        // 会話履歴を追加
        if (conversationHistory && conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            messages.push({
              role: msg.role as string,
              content: msg.content
            });
          });
        }
        
        // 最新のユーザー入力を追加
        messages.push({ role: 'user', content: conversation });

        console.log('Sending to AI with messages:', messages.length);

        try {
          if (usingDeepSeek) {
            // DeepSeek APIを直接呼び出す
            const deepseekResponse = await callDeepSeekAPI(messages, 0.7, 500);
            aiResponse = deepseekResponse.choices?.[0]?.message?.content || '';
            console.log('[DeepSeek] Response:', aiResponse);
          } else {
            // OpenAI APIを使用
            const aiClient = getOpenAIClient();
            const modelName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';
            const completion = await aiClient.chat.completions.create({
              model: modelName,
              messages: messages as any,
              temperature: 0.7,
              max_tokens: 500
            });
            aiResponse = completion.choices[0]?.message?.content || '';
            console.log('[OpenAI] Response:', aiResponse);
          }
        } catch (apiError) {
          console.error('[AI] API call failed:', {
            error: apiError instanceof Error ? apiError.message : 'Unknown error',
            stack: apiError instanceof Error ? apiError.stack : undefined,
            model: modelName,
            usingDeepSeek,
            responseStatus: apiError instanceof Error && 'response' in apiError ? (apiError as any).response?.status : undefined,
            responseData: apiError instanceof Error && 'response' in apiError ? (apiError as any).response?.data : undefined
          });
          
          // DeepSeekが失敗した場合、OpenAIを試す
          if (usingDeepSeek && hasOpenAI) {
            console.log('[AI] DeepSeek failed, trying OpenAI as fallback');
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
              console.log('[AI] OpenAI fallback successful');
            } catch (openaiError) {
              console.error('[AI] OpenAI fallback also failed:', openaiError);
              // 両方失敗した場合はパターンマッチングに進む
              console.log('Both AI services failed, falling back to pattern matching logic');
            }
          } else {
            // APIエラーの場合はフォールバックロジックに進む
            console.log('Falling back to pattern matching logic due to API error');
          }
        }
        
        // 会話から請求書データを抽出（シンプルなパターンマッチング）
        const conversationLower = conversation.toLowerCase();
        
        // 既存データをベースに更新
        let updatedData = { ...currentInvoiceData };
        
        // 顧客名の抽出
        const customerMatch = conversation.match(/([^、。\s]+(?:会社|株式会社|商事|さん|様))/);
        if (customerMatch && !updatedData.customerName) {
          updatedData.customerName = customerMatch[1].replace(/さん$|様$/, '');
        }
        
        // 金額と項目の抽出
        const amountMatch = conversation.match(/(\d+)万円|(\d+)円/);
        const itemMatch = conversation.match(/(制作|開発|保守|メンテナンス|サポート|コンサル)/);
        
        if (amountMatch && itemMatch) {
          const amount = amountMatch[1] ? parseInt(amountMatch[1]) * 10000 : parseInt(amountMatch[2]);
          const description = conversation.includes('制作') ? 'ウェブサイト制作費' :
                            conversation.includes('保守') ? '保守・メンテナンス費' :
                            conversation.includes('サポート') ? 'サポート費' : '請求項目';
          
          // 既存のitemsに追加（上書きしない）
          if (!updatedData.items) {
            updatedData.items = [];
          }
          
          // 同じ項目がなければ追加
          const exists = updatedData.items.some(item => item.description === description);
          if (!exists) {
            updatedData.items.push({
              description,
              quantity: 1,
              unitPrice: amount,
              amount: amount,
              taxRate: 0.1,
              taxAmount: Math.round(amount * 0.1)
            });
          }
        }
        
        // 日付設定
        if (!updatedData.invoiceDate) {
          updatedData.invoiceDate = invoiceDate;
        }
        if (!updatedData.dueDate) {
          updatedData.dueDate = dueDate;
        }
        
        // 備考に振込先情報を追加
        if (!updatedData.notes || !updatedData.notes.includes('振込先')) {
          updatedData.notes = `お振込先：三井住友銀行 渋谷支店 普通預金 1234567 カブシキガイシャトニーチュウ
お支払期限：${dueDate}
※振込手数料はお客様負担でお願いいたします`;
        }
        
        // paymentMethod設定
        if (!updatedData.paymentMethod) {
          updatedData.paymentMethod = 'bank_transfer';
        }

        // 合計計算
        const subtotal = updatedData.items ? updatedData.items.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
        const taxAmount = updatedData.items ? updatedData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0) : 0;
        const totalAmount = subtotal + taxAmount;
        
        // レスポンスの作成
        const response = {
          success: true,
          message: aiResponse,
          data: {
            customerId: null,
            customerName: updatedData.customerName || '',
            items: updatedData.items || [],
            invoiceDate: updatedData.invoiceDate,
            dueDate: updatedData.dueDate,
            notes: updatedData.notes || '',
            paymentMethod: updatedData.paymentMethod || 'bank_transfer',
            subtotal,
            taxAmount,
            totalAmount,
          },
          aiConversationId: sessionId || Date.now().toString(),
        };

        return NextResponse.json(response);
      } catch (error) {
        console.error(`${usingDeepSeek ? 'DeepSeek' : 'OpenAI'} API error:`, error);
        console.error('[DEBUG] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          apiKeyExists: !!process.env.OPENAI_API_KEY,
          apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
          deepSeekApiKeyExists: !!process.env.DEEPSEEK_API_KEY,
          deepSeekApiKeyLength: process.env.DEEPSEEK_API_KEY?.length || 0,
          usingDeepSeek
        });
        console.log(`${usingDeepSeek ? 'DeepSeek' : 'OpenAI'} API failed, falling back to placeholder implementation`);
        // フォールバック：プレースホルダー実装へ続く
      }
    }
    
    // プレースホルダー実装（AIが使えない場合のフォールバック）
    console.log('[DEBUG] Using placeholder implementation - AI models not available or failed');
    console.log('[DEBUG] Environment check:', {
      openAIKeyExists: !!process.env.OPENAI_API_KEY,
      deepSeekKeyExists: !!process.env.DEEPSEEK_API_KEY,
      nodeEnv: process.env.NODE_ENV
    });
      
      // プレースホルダー実装：簡単なキーワードマッチング
      const conversationLower = conversation.toLowerCase();
      
      // 状況確認の質問かどうかを判定（早期に判定）
      const isStatusQuestion = conversation.match(/どういう状況|状況は|どうなって|進捗|今の状態|現在の内容/i);
      
      // 顧客名の抽出（「〜さん」「〜会社」「〜株式会社」など）
      let customerName = '';
      let isNewCustomer = false;
      
      // 状況確認の質問でない場合のみ新しい顧客名を抽出
      if (!isStatusQuestion) {
        const customerMatch = conversation.match(/([^、。\s]+(?:会社|株式会社|さん|様))/);
        if (customerMatch) {
          const extractedCustomer = customerMatch[1].replace(/さん$|様$/, '');
          // 既存の顧客名と異なる場合は新しい顧客とみなす
          if (currentInvoiceData && currentInvoiceData.customerName && 
              currentInvoiceData.customerName !== extractedCustomer) {
            isNewCustomer = true;
          }
          customerName = extractedCustomer;
        }
      }
      
      // 既存データから顧客名を保持（新しい顧客名が抽出されなかった場合のみ）
      if (!customerName && currentInvoiceData && currentInvoiceData.customerName) {
        customerName = currentInvoiceData.customerName;
      }
      
      // 金額の抽出（複数の金額を検出）
      const amounts: Array<{value: number, isMonthly: boolean, description?: string}> = [];
      const amountMatches = conversation.matchAll(/(\d+)(万円|万|円)(?:\/月|[のの]月額)?/g);
      
      for (const match of amountMatches) {
        const numStr = match[1];
        const unit = match[2];
        const value = (unit === '万円' || unit === '万') ? 
          parseInt(numStr) * 10000 : 
          parseInt(numStr);
        
        // 月額かどうかを判定
        const isMonthly = conversation.includes(`${match[0]}/月`) || 
                         conversation.includes(`月額${match[0]}`) ||
                         conversation.includes(`${match[0]}の月額`);
        
        amounts.push({ value, isMonthly });
      }
      
      // メインの金額（最大値を採用）
      let amount = amounts.length > 0 ? Math.max(...amounts.map(a => a.value)) : 0;
      
      // 月額料金があるかチェック
      const monthlyAmount = amounts.find(a => a.isMonthly);
      const hasMonthlyFee = !!monthlyAmount;
      
      console.log('Extracted amounts:', amounts);
      console.log('Main amount:', amount);
      console.log('Monthly amount:', monthlyAmount);
      
      // 品目の抽出（「〜費」「〜料」「〜代」など）
      let description = '';
      // 状況確認の質問でない場合のみ新しい品目を抽出
      if (!isStatusQuestion) {
        const itemMatch = conversation.match(/([^、。\s]+(?:費|料|代|制作|開発|サービス|業務|作業))/);
        if (itemMatch) {
          description = itemMatch[0];
        }
      }
      
      // 既存データとのマージ（会話履歴から累積的に情報を保持）
      if (currentInvoiceData) {
        // 既存のデータを優先し、新しい情報で上書き
        if (!customerName && currentInvoiceData.customerName) {
          customerName = currentInvoiceData.customerName;
        }
        if (!description && currentInvoiceData.items && currentInvoiceData.items[0]) {
          description = currentInvoiceData.items[0].description;
        }
        // 状況確認の質問の場合は既存の金額を保持
        if ((!amount || isStatusQuestion) && currentInvoiceData.items && currentInvoiceData.items[0]) {
          amount = currentInvoiceData.items[0].unitPrice || currentInvoiceData.items[0].amount;
        }
      }
      
      // デフォルト値の設定（既存データからも取得できなかった場合のみ）
      if (!customerName) customerName = '未設定顧客';
      if (!description) description = '請求項目';
      if (!amount) amount = 0; // デフォルトを0に変更して、誤った金額を避ける
      
      const taxRate = 0.1;
      const taxAmount = Math.round(amount * taxRate);
      
      const today = new Date();
      const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // 既存のデータとマージ
      const mergedData = currentInvoiceData || {};
      
      // 編集モードの場合は、既存データを優先して使用
      if (mode === 'edit' && mergedData.items) {
        // 金額変更の指示があった場合
        if (conversation.includes('金額') && amount) {
          mergedData.items[0].unitPrice = amount;
          mergedData.items[0].amount = amount;
          mergedData.items[0].taxAmount = Math.round(amount * taxRate);
        }
        // 品目変更の指示があった場合
        if (conversation.includes('品目') && description) {
          mergedData.items[0].description = description;
        }
        // 支払期限変更の指示があった場合
        if (conversation.includes('支払') || conversation.includes('期限')) {
          const dueDateMatch = conversation.match(/(\d+)日/);
          if (dueDateMatch) {
            const days = parseInt(dueDateMatch[1]);
            const newDueDate = new Date();
            newDueDate.setDate(newDueDate.getDate() + days);
            mergedData.dueDate = newDueDate.toISOString().split('T')[0];
          }
        }
      }
      
      // 会話履歴から月額料金の期間が確定しているかチェック
      let monthlyPeriodConfirmed = false;
      let confirmedMonths = 1;
      
      // 現在の会話からも期間を確認
      const currentMonthMatch = conversation.match(/(\d+)ヶ月|(\d+)か月/);
      if (currentMonthMatch) {
        confirmedMonths = parseInt(currentMonthMatch[1] || currentMonthMatch[2]);
        monthlyPeriodConfirmed = true;
        console.log('[DEBUG] Found month period in current conversation:', confirmedMonths);
      }
      
      if (!monthlyPeriodConfirmed && conversationHistory && conversationHistory.length > 0) {
        const lastMessages = conversationHistory.slice(-4).map(m => m.content).join(' ');
        if (lastMessages.includes('年間') || lastMessages.includes('12ヶ月') || lastMessages.includes('12か月')) {
          confirmedMonths = 12;
          monthlyPeriodConfirmed = true;
        } else if (lastMessages.match(/(\d+)ヶ月|(\d+)か月/)) {
          const monthMatch = lastMessages.match(/(\d+)ヶ月|(\d+)か月/);
          if (monthMatch) {
            confirmedMonths = parseInt(monthMatch[1] || monthMatch[2]);
            monthlyPeriodConfirmed = true;
          }
        } else if (lastMessages.includes('今月分') || lastMessages.includes('初月')) {
          confirmedMonths = 1;
          monthlyPeriodConfirmed = true;
        }
      }
      
      // 既存のitemsがある場合は、それを基に更新
      // currentInvoiceDataから既存のitemsを確実に取得
      let items = [...(currentInvoiceData.items || [])];
      
      // デバッグログ追加
      console.log('[DEBUG] Processing items:', {
        existingItems: items.length,
        currentInvoiceDataItems: currentInvoiceData.items?.length || 0,
        hasDescription: !!description,
        hasAmount: amount > 0,
        hasMonthlyFee,
        description,
        amount,
        isStatusQuestion
      });
      
      // 新しい項目を追加するかどうかの判定
      const isNewItem = description && amount > 0 && !hasMonthlyFee && !isStatusQuestion;
      const isAddingItem = conversation.toLowerCase().includes('追加') || 
                          conversation.toLowerCase().includes('さらに') ||
                          conversation.toLowerCase().includes('それと') ||
                          conversation.toLowerCase().includes('他に') ||
                          // 「はい」と答えて追加の意図がある場合
                          (userSaidYes && lastAssistantQuestion && (
                            lastAssistantQuestion.includes('追加') || 
                            lastAssistantQuestion.includes('他に') ||
                            lastAssistantQuestion.includes('修正')
                          ));
      
      if (isNewItem) {
        // 新しい顧客の場合は、既存のitemsをクリアして新規作成
        if (isNewCustomer) {
          console.log('[DEBUG] New customer detected, creating new invoice');
          items = [{
            description: description,
            quantity: 1,
            unitPrice: amount,
            amount: amount,
            taxRate: taxRate,
            taxAmount: Math.round(amount * taxRate)
          }];
        } else if (isAddingItem) {
          // 「追加」の意図が明確な場合は、新規項目として追加
          console.log('[DEBUG] Adding new item as requested');
          items.push({
            description: description,
            quantity: 1,
            unitPrice: amount,
            amount: amount,
            taxRate: taxRate,
            taxAmount: Math.round(amount * taxRate)
          });
        } else if (items.length === 0) {
          // itemsが空の場合は、最初の項目として追加
          console.log('[DEBUG] Adding first item');
          items.push({
            description: description,
            quantity: 1,
            unitPrice: amount,
            amount: amount,
            taxRate: taxRate,
            taxAmount: Math.round(amount * taxRate)
          });
        } else {
          // 既存項目がある場合で、追加の意図が不明な場合は、
          // 同じ種類の項目があるか確認
          const existingIndex = items.findIndex(item => 
            item.description.includes(description.split(' ')[0]) ||
            description.includes(item.description.split(' ')[0])
          );
          
          if (existingIndex >= 0) {
            // 同じ種類の項目がある場合は更新
            console.log('[DEBUG] Updating existing item at index:', existingIndex);
            items[existingIndex] = {
              ...items[existingIndex],
              description: description,
              unitPrice: amount,
              amount: amount,
              taxAmount: Math.round(amount * taxRate)
            };
          } else {
            // 異なる種類の項目の場合は追加
            console.log('[DEBUG] Adding as new item type');
            items.push({
              description: description,
              quantity: 1,
              unitPrice: amount,
              amount: amount,
              taxRate: taxRate,
              taxAmount: Math.round(amount * taxRate)
            });
          }
        }
      }
      
      // 月額料金がある場合は別項目として追加
      if (hasMonthlyFee && monthlyAmount) {
        console.log('[DEBUG] Processing monthly fee:', {
          monthlyAmount: monthlyAmount.value,
          monthlyPeriodConfirmed,
          confirmedMonths
        });
        
        // 保守料などの月額項目を探す
        let monthlyItemIndex = items.findIndex(item => 
          item.description.includes('保守') || 
          item.description.includes('月額') ||
          item.description.includes('サポート')
        );
        
        if (monthlyItemIndex === -1) {
          // 新規追加
          const newItem = {
            description: monthlyPeriodConfirmed 
              ? `保守料（${confirmedMonths}ヶ月分）` 
              : '保守料（期間要確認）',
            quantity: monthlyPeriodConfirmed ? confirmedMonths : 1,
            unitPrice: monthlyAmount.value,
            amount: monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1),
            taxRate: taxRate,
            taxAmount: Math.round(monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1) * taxRate)
          };
          console.log('[DEBUG] Adding new monthly item:', newItem);
          items.push(newItem);
        } else {
          // 既存項目を更新
          const updatedItem = {
            ...items[monthlyItemIndex],
            description: monthlyPeriodConfirmed 
              ? `保守料（${confirmedMonths}ヶ月分）` 
              : '保守料（期間要確認）',
            quantity: monthlyPeriodConfirmed ? confirmedMonths : 1,
            unitPrice: monthlyAmount.value,
            amount: monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1),
            taxAmount: Math.round(monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1) * taxRate)
          };
          console.log('[DEBUG] Updating monthly item at index', monthlyItemIndex, ':', updatedItem);
          items[monthlyItemIndex] = updatedItem;
        }
      }
      
      // デバッグログ追加
      console.log('[DEBUG] Final items before creating invoice:', {
        itemsCount: items.length,
        items: JSON.stringify(items, null, 2)
      });
      
      // デフォルトの銀行口座情報を取得
      let bankAccountInfo = '';
      try {
        const bankAccountService = new BankAccountService();
        const defaultAccount = await bankAccountService.getDefaultAccount();
        
        if (defaultAccount) {
          const accountTypeText = defaultAccount.accountType === 'checking' ? '当座預金' : '普通預金';
          bankAccountInfo = `振込先：\n${defaultAccount.bankName} ${defaultAccount.branchName}\n${accountTypeText} ${defaultAccount.accountNumber}\n口座名義：${defaultAccount.accountHolder}\n\n`;
        }
      } catch (error) {
        console.error('Error fetching bank account:', error);
        // エラーが発生しても処理は続行
      }
      
      // 備考欄の作成
      let notes = bankAccountInfo;
      if (mergedData.notes) {
        notes += mergedData.notes;
      } else {
        notes += 'AI会話から作成';
      }
      
      const invoiceData: InvoiceData = {
        customerName: customerName || mergedData.customerName || '未設定顧客',
        items: items,
        invoiceDate: mergedData.invoiceDate || today.toISOString().split('T')[0],
        dueDate: mergedData.dueDate || dueDate.toISOString().split('T')[0],
        notes: notes,
        paymentMethod: mergedData.paymentMethod || 'bank_transfer'
      };
      
      // 会話履歴をチェックして、重複した応答を避ける
      const hasPreviousConversation = conversationHistory && conversationHistory.length > 2; // 初回のウェルカムメッセージを除く
      
      // ユーザーの入力内容を分析
      const userSaidYes = conversation.match(/^(はい|yes|お願い|それで|ok|オッケー|いいです|確定)$/i);
      const userSaidNo = conversation.match(/^(いいえ|いらない|不要|必要ありません|必要ない|なし|無し|ない|ありません)$/i);
      const userWantsToModify = conversation.match(/修正|変更|直したい|編集/i);
      const shortNegative = conversation.length < 20 && conversation.match(/ない|なし|不要|いらない|ありません/i);
      const userAskedQuestion = conversation.includes('？') || conversation.includes('?');
      const userWantsToAdd = conversation.match(/追加|他に|オプション|付けて|つけて/i);
      const userConfused = conversation.match(/なんですか|何それ|どういうこと|分からない|わからない|説明/i);
      const userDenied = conversation.match(/作成しました？|してない|していません|やってない/i);
      const userGivingInstruction = conversation.match(/して|してください|お願い|追加して|変更して/i);
      
      // 直前の質問を分析（会話履歴から）
      let lastAssistantQuestion = '';
      if (conversationHistory && conversationHistory.length > 0) {
        const lastAssistantMessage = [...conversationHistory].reverse().find(m => m.role === 'assistant');
        if (lastAssistantMessage) {
          lastAssistantQuestion = lastAssistantMessage.content;
        }
      }
      
      // 応答メッセージの生成
      let responseMessage = '';
      let quickReplies: Array<{text: string, value: string}> = [];
      
      // 質問タイプの判定（包括的なパターン対応）
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
      
      // 「追加する項目や修正点はありますか？」への「はい」の応答を特別に処理
      if (lastAssistantQuestion.includes('追加する項目や修正点はありますか') && userSaidYes) {
        responseMessage = `どのような追加・修正をご希望ですか？\n\n具体的な内容を教えてください。例えば：\n・「保守契約を4ヶ月分追加してください」\n・「金額を変更したいです」\n・「支払期限を30日後に変更してください」\n・「別の顧客への請求書を作成してください」`;
        quickReplies = [
          { text: '金額を変更', value: '金額を変更したいです' },
          { text: '明細を追加', value: '明細項目を追加したいです' },
          { text: '支払期限を変更', value: '支払期限を変更したいです' },
          { text: '備考を追加', value: '備考欄に追記したいです' }
        ];
      }
      // 「追加する項目や修正点はありますか？」への「いいえ」の応答
      else if (lastAssistantQuestion.includes('追加する項目や修正点はありますか') && userSaidNo) {
        if (customerName && amount && description) {
          responseMessage = `承知いたしました。それでは、以下の内容で請求書を確定します。\n\n` +
                          `【請求書内容】\n` +
                          `・顧客名：${customerName}様\n` +
                          `・請求項目：${description}\n` +
                          `・請求金額：¥${amount.toLocaleString()}（税抜）\n` +
                          `・消費税額：¥${taxAmount.toLocaleString()}\n` +
                          `・合計金額：¥${(amount + taxAmount).toLocaleString()}\n` +
                          `・請求日：${invoiceData.invoiceDate}\n` +
                          `・支払期限：${invoiceData.dueDate}\n\n` +
                          `下の「会話を終了して確定」ボタンをクリックして、請求書を作成してください。`;
        }
      }
      // ユーザーの特定の反応に対する優先応答
      else
      if (userWantsToModify) {
        // 修正したいという意図がある場合
        responseMessage = `どの部分を修正したいですか？`;
        quickReplies = [
          { text: '金額を変更', value: '金額を変更したいです' },
          { text: '品目を変更', value: '品目を変更したいです' },
          { text: '顧客を変更', value: '顧客を変更したいです' },
          { text: '明細を追加', value: '明細を追加したいです' }
        ];
      } else if (userWantsToAdd && (hasMonthlyFee || conversation.includes('保守') || conversation.includes('オプション'))) {
        // 追加項目の指示がある場合
        if (hasMonthlyFee && monthlyAmount) {
          responseMessage = `承知いたしました。${monthlyAmount.value.toLocaleString()}円/月の保守料金を追加します。\n\n` +
                          `請求書にはどの期間分を記載しますか？`;
          quickReplies = [
            { text: '今月分のみ', value: `今月分のみ（${monthlyAmount.value.toLocaleString()}円）でお願いします` },
            { text: '3ヶ月分', value: `3ヶ月分（${(monthlyAmount.value * 3).toLocaleString()}円）でお願いします` },
            { text: '6ヶ月分', value: `6ヶ月分（${(monthlyAmount.value * 6).toLocaleString()}円）でお願いします` },
            { text: '年間契約', value: `年間契約（${(monthlyAmount.value * 12).toLocaleString()}円）でお願いします` }
          ];
        } else {
          responseMessage = `承知いたしました。追加項目を請求書に反映します。\n\n` +
                          `現在の内容を確認しました。他に追加したい項目はありますか？`;
          quickReplies = [
            { text: 'はい', value: '他にも追加項目があります' },
            { text: 'いいえ', value: 'これで確定します' }
          ];
        }
      } else if (isStatusQuestion) {
        // 状況確認の質問への応答
        if (currentInvoiceData && currentInvoiceData.items && currentInvoiceData.items.length > 0) {
          const items = currentInvoiceData.items;
          const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
          const totalTax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
          const total = subtotal + totalTax;
          
          responseMessage = `現在の請求書の内容は以下の通りです：\n\n` +
                          `【顧客情報】\n` +
                          `・${currentInvoiceData.customerName || '未設定'}様\n\n` +
                          `【請求明細】\n` +
                          items.map(item => 
                            `・${item.description}：¥${item.amount.toLocaleString()}（税抜）`
                          ).join('\n') +
                          `\n\n【金額情報】\n` +
                          `・小計：¥${subtotal.toLocaleString()}\n` +
                          `・消費税：¥${totalTax.toLocaleString()}\n` +
                          `・合計：¥${total.toLocaleString()}\n\n` +
                          `追加や修正したい項目はありますか？`;
          quickReplies = [
            { text: 'はい（追加・修正）', value: '修正したい項目があります' },
            { text: 'いいえ（確定）', value: 'このまま確定します' }
          ];
        } else {
          responseMessage = `まだ請求書の情報が入力されていません。\n\n` +
                          `請求書を作成するために必要な情報を教えてください：\n` +
                          `・顧客名（会社名や個人名）\n` +
                          `・請求内容（サービスや商品名）\n` +
                          `・金額`;
        }
      } else if (userConfused) {
        responseMessage = `請求書作成に必要な情報を教えてください。（顧客名、請求内容、金額など）`;
      } else if (userDenied) {
        responseMessage = `失礼いたしました。まだ請求書は作成されていません。\n\n` +
                        `請求書を作成するために、以下の情報をお聞かせください：\n` +
                        `・誰宛の請求書ですか？（会社名や個人名）\n` +
                        `・何の請求ですか？（サービスや商品名）\n` +
                        `・いくらですか？（金額）`;
      } else if (userSaidYes && conversation.includes('確定')) {
        // 確定の意図が明確な場合
        if (customerName && amount && description) {
          responseMessage = `承知いたしました。以下の内容で請求書を確定します。\n\n` +
                          `・${customerName}様\n` +
                          `・${description}\n` +
                          `・¥${(amount + taxAmount).toLocaleString()}（税込）\n\n` +
                          `下の「会話を終了して確定」ボタンをクリックして、請求書を作成してください。`;
        }
      } else if (userSaidNo || shortNegative) {
        if (hasPreviousConversation && customerName && amount && description) {
          responseMessage = `承知いたしました。\n\n` +
                          `それでは、現在の内容で請求書を確定します：\n` +
                          `・${customerName}様\n` +
                          `・${description}\n` +
                          `・¥${(amount + taxAmount).toLocaleString()}（税込）\n\n` +
                          `この内容でよろしければ、下の「会話を終了して確定」ボタンをクリックしてください。`;
        quickReplies = [
          { text: '確定', value: '請求書を確定してください' },
          { text: '変更する', value: 'もう少し修正したいです' }
        ];
        } else {
          responseMessage = `承知いたしました。\n\n` +
                          `他にご要望がございましたら、お申し付けください。`;
        }
      } else if (monthlyPeriodConfirmed && confirmedMonths > 0) {
        // 保守契約期間が指定された場合
        if (currentInvoiceData && currentInvoiceData.items && currentInvoiceData.items.length > 0) {
          const items = currentInvoiceData.items;
          const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
          const totalTax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
          const total = subtotal + totalTax;
          
          responseMessage = `承知いたしました。保守契約${confirmedMonths}ヶ月分を追加しました。\n\n` +
                          `現在の請求書内容：\n` +
                          items.map(item => 
                            `・${item.description}：¥${item.amount.toLocaleString()}（税抜）`
                          ).join('\n') +
                          `\n\n合計：¥${total.toLocaleString()}（税込）\n\n` +
                          `他に追加・修正したい項目はありますか？`;
          quickReplies = [
            { text: 'はい（追加・修正）', value: '修正したい項目があります' },
            { text: 'いいえ（確定）', value: 'このまま確定します' }
          ];
        }
      } else if (hasMonthlyFee && !monthlyPeriodConfirmed && monthlyAmount) {
        // 月額料金の期間を明確化する必要がある
        responseMessage = `承知いたしました。${monthlyAmount.value.toLocaleString()}円の月額料金ですね。\n\n` +
                        `請求書にはどの期間分を記載しますか？`;
        quickReplies = [
          { text: '今月分のみ', value: `今月分のみ（${monthlyAmount.value.toLocaleString()}円）でお願いします` },
          { text: '3ヶ月分', value: `3ヶ月分（${(monthlyAmount.value * 3).toLocaleString()}円）でお願いします` },
          { text: '4ヶ月分', value: `4ヶ月分（${(monthlyAmount.value * 4).toLocaleString()}円）でお願いします` },
          { text: '6ヶ月分', value: `6ヶ月分（${(monthlyAmount.value * 6).toLocaleString()}円）でお願いします` },
          { text: '年間契約', value: `年間契約（${(monthlyAmount.value * 12).toLocaleString()}円）でお願いします` }
        ];
      } else if (mode === 'create') {
        // 現在の請求書データの合計を計算
        const currentSubtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const currentTaxAmount = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
        const currentTotal = currentSubtotal + currentTaxAmount;
        
        if (customerName && currentTotal > 0) {
          if (hasPreviousConversation) {
            // 2回目以降の会話では、別の応答パターンを使用
            responseMessage = `現在の請求書内容：\n\n` +
                            `【顧客】${customerName}様\n` +
                            `【明細】\n` +
                            items.map(item => 
                              `・${item.description}：¥${item.amount.toLocaleString()}（税抜）`
                            ).join('\n') +
                            `\n【合計】¥${currentTotal.toLocaleString()}（税込）\n\n` +
                            `他に追加・修正したい項目はありますか？`;
            quickReplies = [
              { text: 'はい（追加・修正あり）', value: '追加したい項目があります' },
              { text: 'いいえ（このまま確定）', value: 'このままで確定します' }
            ];
          } else {
            responseMessage = `承知いたしました。${customerName}様への請求書を作成します。\n\n` +
                            `内容：${description}\n` +
                            `金額：¥${amount.toLocaleString()}（税込 ¥${(amount + taxAmount).toLocaleString()}）\n\n` +
                            `他に追加する項目や修正点はありますか？`;
            quickReplies = [
              { text: 'はい（追加・修正あり）', value: '追加したい項目があります' },
              { text: 'いいえ（このまま確定）', value: 'このままで確定します' }
            ];
          }
        } else {
          const missing = [];
          if (!customerName || customerName === '未設定顧客') missing.push('顧客名');
          if (!amount || amount === 10000) missing.push('金額');
          if (!description || description === '請求項目') missing.push('請求内容');
          
          if (hasPreviousConversation) {
            responseMessage = `もう少し詳しく教えていただけますか？\n\n` +
                            `例：「山田商事」「ウェブ制作費」「50万円」など、具体的な内容をお知らせください。`;
          } else {
            responseMessage = `請求書作成に必要な情報が不足しています。\n\n` +
                            `不足情報：${missing.join('、')}\n\n` +
                            `例えば「山田商事様にウェブ制作費50万円」のようにお伝えください。`;
          }
        }
      } else {
        // 編集モードのメッセージ
        const changes = [];
        if (conversation.includes('金額') && amount) {
          changes.push(`金額を¥${amount.toLocaleString()}に変更`);
        }
        if (conversation.includes('品目') && description) {
          changes.push(`品目を「${description}」に変更`);
        }
        if (conversation.includes('支払') || conversation.includes('期限')) {
          changes.push('支払期限を変更');
        }
        
        if (changes.length > 0) {
          responseMessage = `承知いたしました。以下の変更を行いました：\n\n` +
                          changes.map(c => `・${c}`).join('\n') +
                          `\n\n他に変更したい部分はありますか？`;
        } else if (userGivingInstruction) {
          // 具体的な指示があるがパターンに合わない場合
          responseMessage = `ご指示の内容を正しく理解できませんでした。もう一度お伝えいただけますか？`;
        } else {
          responseMessage = `変更内容を理解できませんでした。もう一度お伝えいただけますか？`;
        }
      }
      
      // 既存の顧客マッチング処理を続行
      let customerId: string | null = null;
      
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
            customerId = matchedCustomers[0]._id!.toString();
            customerName = matchedCustomers[0].companyName;
          }
        } catch (err) {
          console.error('Customer search error:', err);
        }
      }
      
      // クイックリプライの最終判定
      const questionAnalysis = analyzeQuestionType(responseMessage);
      
      // デフォルトでボタンを表示しない（保守的アプローチ）
      if (!questionAnalysis.shouldShowQuickReplies) {
        quickReplies = [];
      }
      
      // 特別なケース：「追加する項目や修正点はありますか？」への「はい」の応答
      // これは明確にYes/No質問なのでボタンを表示
      if (lastAssistantQuestion.includes('追加する項目や修正点はありますか') && 
          quickReplies.length === 0) {
        quickReplies = [
          { text: 'はい（追加・修正あり）', value: '追加したい項目があります' },
          { text: 'いいえ（このまま確定）', value: 'このままで確定します' }
        ];
      }
      
      // AIレスポンスがある場合は優先的に使用
      const finalMessage = aiResponse || responseMessage;
      
      // レスポンスの作成
      const response = {
        success: true,
        message: finalMessage,
        quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
        data: {
          customerId,
          customerName,
          items: invoiceData.items,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          notes: invoiceData.notes,
          paymentMethod: invoiceData.paymentMethod,
          subtotal: invoiceData.items.reduce((sum, item) => sum + (item.amount || 0), 0),
          taxAmount: invoiceData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0),
          totalAmount: invoiceData.items.reduce((sum, item) => sum + (item.amount || 0) + (item.taxAmount || 0), 0),
        },
        aiConversationId: sessionId || Date.now().toString(),
      };
      
      return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
      env: {
        hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
        deepSeekKeyLength: process.env.DEEPSEEK_API_KEY?.length || 0,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasAzureKey: !!process.env.AZURE_OPENAI_API_KEY,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    });
    
    // 開発環境または本番環境のデバッグ用
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isVercelProduction = process.env.VERCEL_ENV === 'production';
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name,
        // 一時的にデバッグ情報を追加
        debug: {
          hasKeys: {
            deepseek: !!process.env.DEEPSEEK_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            azure: !!process.env.AZURE_OPENAI_API_KEY
          },
          environment: {
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV
          },
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}