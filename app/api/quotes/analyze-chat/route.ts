import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { CustomerService } from '@/services/customer.service';
import { BankAccountService } from '@/services/bank-account.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { z } from 'zod';
import { format } from 'date-fns';
import { calculateDueDate, getPaymentTermsDescription } from '@/utils/payment-terms';

// AI クライアントの初期化
let openaiClient: OpenAI | null = null;

// DeepSeek APIを直接呼び出す関数
async function callDeepSeekAPI(messages: Array<{role: string, content: string}>, temperature: number = 0.7, maxTokens: number = 500) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('[DeepSeek] API key is not configured');
    throw new Error('DeepSeek API key is not configured');
  }
  
  // APIキーの基本的な検証
  if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
    console.error('[DeepSeek] API key format appears to be invalid');
    console.error('[DeepSeek] API key should start with "sk-" and be at least 20 characters');
  }
  
  console.log('[DeepSeek] Calling API with fetch');
  console.log('[DeepSeek] API key length:', apiKey.length);
  console.log('[DeepSeek] API key prefix:', apiKey.substring(0, 10) + '...');
  
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
      console.error('[DeepSeek] API error:', response.status);
      console.error('[DeepSeek] Error response:', errorText);
      console.error('[DeepSeek] Request details:', {
        model: 'deepseek-chat',
        messagesCount: messages.length,
        temperature: temperature,
        maxTokens: maxTokens
      });
      
      let errorMessage = `DeepSeek API error: ${response.status}`;
      
      // よくあるエラーステータスに基づいた詳細メッセージ
      if (response.status === 401) {
        errorMessage = 'DeepSeek API key is invalid or expired';
      } else if (response.status === 429) {
        errorMessage = 'DeepSeek API rate limit exceeded';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMessage = 'DeepSeek API service is temporarily unavailable';
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('[DeepSeek] API response received');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[DeepSeek] Request timeout');
      throw new Error('DeepSeek API request timeout');
    }
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

// レスポンススキーマ（見積書用）
const QuoteDataSchema = z.object({
  customerName: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    amount: z.number(),
    taxRate: z.number().default(0.1),
    taxAmount: z.number()
  })).optional(),
  subtotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  quoteDate: z.string().optional(), // 見積書の発行日
  validityDate: z.string().optional(), // 見積書の有効期限
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  customerId: z.string().optional()
});

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/quotes/analyze-chat - Start');
  
  let body: any;
  
  try {
    body = await request.json();
    console.log('[API] Request body:', JSON.stringify(body, null, 2));
    
    const { conversation, conversationHistory, currentInvoiceData, sessionId, mode, initialInvoiceData } = body;
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation is required' }, { status: 400 });
    }

    // 顧客データの取得
    const customerService = new CustomerService();
    const customersResult = await customerService.searchCustomers({ limit: 100 });
    
    console.log('[API] Number of customers:', customersResult.customers.length);

    // 会社情報の取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // 銀行口座情報の取得
    const bankAccountService = new BankAccountService();
    const bankAccounts = await bankAccountService.getAllBankAccounts();

    // 現在の日付情報
    const today = new Date();
    const defaultQuoteDate = format(today, 'yyyy-MM-dd');
    
    // デフォルトの有効期限（30日後）
    const defaultValidityDate = new Date();
    defaultValidityDate.setDate(defaultValidityDate.getDate() + 30);
    const formattedValidityDate = format(defaultValidityDate, 'yyyy-MM-dd');

    // 顧客リストをテキスト形式で準備
    const customerList = customersResult.customers.map(customer => 
      `ID: ${customer._id}, 会社名: ${customer.companyName || customer.name || '名前未設定'}, 電話: ${customer.phone || '未設定'}, メール: ${customer.email || '未設定'}`
    ).join('\n');

    // システムプロンプト（請求書用と同じ自然な会話形式に修正）
    const systemPrompt = `あなたは見積書作成を支援するAIアシスタントです。
ユーザーとの自然な会話を通じて、見積書に必要な情報を収集してください。

現在の見積書データ：
${currentInvoiceData ? `顧客名: ${currentInvoiceData.customerName || '未設定'}
項目数: ${currentInvoiceData.items?.length || 0}` : 'なし'}

重要なルール：
1. 自然で親しみやすい日本語で応答
2. 見積項目は番号付きリストで表示
3. 例：「1. システム構築費：1,200,000円」
4. 完成時は「下の『会話を終了して確定』ボタンをクリックしてください」と案内
5. 見積書の有効期限は通常30日後（特に指定がない場合）

今日: ${defaultQuoteDate}、有効期限: ${formattedValidityDate}

ユーザーの入力に対して、見積書作成のサポートを行ってください。
金額や項目が含まれる場合は、番号付きリストで明確に表示してください。`;

    try {
      console.log('[API] Calling DeepSeek API for quote analysis');
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversation }
      ];

      console.log('[API] Messages to send:', JSON.stringify(messages, null, 2));

      const completion = await callDeepSeekAPI(messages, 0.7, 1000);
      
      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No response from AI service');
      }

      const aiResponse = completion.choices[0].message.content;
      console.log('[API] AI Response:', aiResponse);

      // 請求書APIと同じパターンでデータを抽出
      let extractedData = null;
      let updatedData = { 
        ...currentInvoiceData,
        items: currentInvoiceData?.items ? [...currentInvoiceData.items] : []
      };

      if (aiResponse) {
        console.log('[API] Processing AI response for data extraction');
        
        // シンプルなキーワードベースの抽出
        const lines = aiResponse.split('\n');
        let newItems = [];
        let foundItemList = false;
        
        // 顧客名の抽出
        if (mode === 'create' && !updatedData.customerName && conversation) {
          const customerMatch = conversation.match(/([^に]+)(?:さん|様)?に/);
          if (customerMatch) {
            updatedData.customerName = customerMatch[1].replace(/さん|様/g, '').trim();
            console.log('[API] Extracted customer name from conversation:', updatedData.customerName);
          }
        }
        
        // 番号付き項目を探す（例：1. システム構築費：1,200,000円）
        for (const line of lines) {
          const itemMatch = line.match(/^(\d+)\.\s*([^：]+)：\s*([\d,]+)円/);
          if (itemMatch) {
            foundItemList = true;
            const itemNumber = parseInt(itemMatch[1]);
            const description = itemMatch[2].trim();
            const amount = parseInt(itemMatch[3].replace(/,/g, ''));
            
            console.log(`[API] Found item ${itemNumber}: ${description} = ${amount}円`);
            
            newItems.push({
              description: description,
              quantity: 1,
              unitPrice: amount,
              amount: amount,
              taxRate: 0.1,
              taxAmount: Math.floor(amount * 0.1)
            });
          }
        }
        
        // 項目が見つかった場合は、既存の項目を置き換える
        if (foundItemList && newItems.length > 0) {
          updatedData.items = newItems;
          console.log('[API] Updated items from AI response:', JSON.stringify(newItems, null, 2));
        }
        
        // extractedDataに更新されたデータを設定
        extractedData = updatedData;
      }

      // フォールバック処理
      if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
        console.log('[API] No items found in AI response, keeping current data');
        extractedData = currentInvoiceData || {};
      }

      // 日付設定
      if (extractedData) {
        if (!extractedData.quoteDate) {
          extractedData.quoteDate = defaultQuoteDate;
        }
        if (!extractedData.validityDate) {
          extractedData.validityDate = formattedValidityDate;
        }
      }

      // 合計計算
      const finalData = extractedData;
      const subtotal = finalData.items ? finalData.items.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
      const taxAmount = finalData.items ? finalData.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0) : 0;
      const totalAmount = subtotal + taxAmount;

      // AIの応答からJSONやコードを除去して、自然な日本語のみを抽出
      let cleanMessage = aiResponse;
      cleanMessage = cleanMessage.replace(/```json[\s\S]*?```/g, '');
      cleanMessage = cleanMessage.replace(/\{[\s\S]*?"extractedData"[\s\S]*?\}/g, '');
      cleanMessage = cleanMessage.replace(/```[\s\S]*?```/g, '');
      cleanMessage = cleanMessage.replace(/\n\n+/g, '\n\n').trim();

      const responseData = {
        customerId: null,
        customerName: finalData.customerName || '',
        items: finalData.items || [],
        quoteDate: finalData.quoteDate,
        validityDate: finalData.validityDate,
        notes: finalData.notes || '',
        paymentMethod: finalData.paymentMethod || 'bank_transfer',
        subtotal,
        taxAmount,
        totalAmount,
      };

      return NextResponse.json({
        success: true,
        data: responseData,
        message: cleanMessage,
        aiConversationId: sessionId || Date.now().toString(),
      });

    } catch (aiError) {
      console.error('[API] AI processing error:', aiError);
      
      // フォールバック応答
      return NextResponse.json({
        success: false,
        data: currentInvoiceData || {},
        message: '申し訳ございませんが、AI処理でエラーが発生しました。手動で入力していただくか、もう一度お試しください。',
        requiresConfirmation: false
      });
    }

  } catch (error) {
    console.error('[API] Error in analyze-chat:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[API] Request data:', {
      conversation: body?.conversation?.substring(0, 100) + '...',
      mode: body?.mode,
      hasCurrentData: !!body?.currentInvoiceData,
      hasSessionId: !!body?.sessionId
    });
    
    // エラーメッセージの詳細化
    let errorMessage = 'Failed to analyze conversation';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // 特定のエラータイプに基づいたメッセージ
      if (error.message.includes('API key')) {
        errorMessage = 'API configuration error';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid response format';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}