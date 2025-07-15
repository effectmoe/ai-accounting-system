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

    // システムプロンプト
    const systemPrompt = `あなたは見積書作成を支援するAIアシスタントです。
ユーザーとの会話から見積書の情報を抽出し、構造化されたデータとして返してください。

利用可能な顧客データ:
${customerList}

現在の見積書データ (更新基準):
${JSON.stringify(currentInvoiceData, null, 2)}

会話履歴:
${conversationHistory ? conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') : ''}

以下のJSON形式で見積書データを返してください:
{
  "customerName": "顧客名（完全一致する顧客がある場合はその名前、ない場合はユーザーが言った名前）",
  "customerId": "完全一致する顧客のIDまたはnull",
  "items": [
    {
      "description": "項目名・商品名",
      "quantity": 数量（数値）,
      "unitPrice": 単価（数値）,
      "amount": 小計（数値、quantity × unitPrice）,
      "taxRate": 税率（通常0.1）,
      "taxAmount": 税額（数値、amount × taxRate）
    }
  ],
  "subtotal": 合計小計（全項目のamountの合計）,
  "taxAmount": 合計税額（全項目のtaxAmountの合計）,
  "totalAmount": 総合計（subtotal + taxAmount）,
  "quoteDate": "見積書発行日（YYYY-MM-DD形式、今日の日付: ${defaultQuoteDate}）",
  "validityDate": "見積書有効期限（YYYY-MM-DD形式、デフォルト: ${formattedValidityDate}）",
  "notes": "備考・特記事項",
  "paymentMethod": "支払い方法（bank_transfer等）"
}

重要な注意点:
1. 顧客名は既存顧客と完全一致チェックを行い、一致する場合はcustomerIdも設定
2. 金額計算は正確に行う（amount = quantity × unitPrice, taxAmount = amount × taxRate）
3. 日付は必ずYYYY-MM-DD形式で返す
4. 見積書の有効期限は通常30日後（特に指定がない場合）
5. 既存データがある場合は、更新・追加・修正として処理
6. ユーザーの質問や確認には自然な日本語で回答も含める

返答は以下の形式で:
{
  "data": 上記のJSON形式のデータ,
  "message": "ユーザーへの確認・質問・返答メッセージ",
  "requiresConfirmation": 確認が必要な場合true
}`;

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

      // JSONレスポンスをパース
      let parsedResponse;
      try {
        // コードブロックがある場合は除去
        const cleanedResponse = aiResponse.replace(/```json\n|\n```|```/g, '');
        parsedResponse = JSON.parse(cleanedResponse);
        console.log('[API] Parsed response:', JSON.stringify(parsedResponse, null, 2));
      } catch (parseError) {
        console.error('[API] JSON parse error:', parseError);
        console.error('[API] Raw AI response:', aiResponse);
        throw new Error('Invalid JSON response from AI');
      }

      // データ検証
      const validatedData = QuoteDataSchema.parse(parsedResponse.data || parsedResponse);
      console.log('[API] Validated data:', JSON.stringify(validatedData, null, 2));

      return NextResponse.json({
        data: validatedData,
        message: parsedResponse.message || 'データが更新されました。',
        requiresConfirmation: parsedResponse.requiresConfirmation || false
      });

    } catch (aiError) {
      console.error('[API] AI processing error:', aiError);
      
      // フォールバック応答
      return NextResponse.json({
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