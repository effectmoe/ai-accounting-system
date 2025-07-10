import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { CustomerService } from '@/services/customer.service';
import { z } from 'zod';

// OpenAI クライアントの初期化を関数内に移動
let openaiClient: OpenAI | null = null;

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

    // OpenAI APIキーが設定されていない場合は、プレースホルダー実装を使用
    const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('OpenAI API key not configured, using placeholder implementation');
      
      // プレースホルダー実装：簡単なキーワードマッチング
      const conversationLower = conversation.toLowerCase();
      
      // 顧客名の抽出（「〜さん」「〜会社」「〜株式会社」など）
      let customerName = '';
      const customerMatch = conversation.match(/([^、。\s]+(?:会社|株式会社|さん|様))/);
      if (customerMatch) {
        customerName = customerMatch[1].replace(/さん$|様$/, '');
      }
      
      // 金額の抽出
      let amount = 0;
      const amountMatch = conversation.match(/(\d+)(万円|万|円)/);
      if (amountMatch) {
        const numStr = amountMatch[1];
        const unit = amountMatch[2];
        amount = (unit === '万円' || unit === '万') ? 
          parseInt(numStr) * 10000 : 
          parseInt(numStr);
      }
      console.log('Extracted amount:', amount);
      
      // 品目の抽出（「〜費」「〜料」「〜代」など）
      let description = '';
      const itemMatch = conversation.match(/([^、。\s]+(?:費|料|代|制作|開発|サービス|業務|作業))/);
      if (itemMatch) {
        description = itemMatch[0];
      }
      
      // デフォルト値の設定
      if (!customerName) customerName = '未設定顧客';
      if (!description) description = '請求項目';
      if (!amount) amount = 10000;
      
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
      
      const invoiceData: InvoiceData = {
        customerName: customerName || mergedData.customerName || '未設定顧客',
        items: mergedData.items || [{
          description: description || '請求項目',
          quantity: 1,
          unitPrice: amount || 10000,
          amount: amount || 10000,
          taxRate: taxRate,
          taxAmount: taxAmount || 1000
        }],
        invoiceDate: mergedData.invoiceDate || today.toISOString().split('T')[0],
        dueDate: mergedData.dueDate || dueDate.toISOString().split('T')[0],
        notes: mergedData.notes || `AI会話から作成: ${conversation.substring(0, 100)}...`,
        paymentMethod: mergedData.paymentMethod || 'bank_transfer'
      };
      
      // 会話履歴をチェックして、重複した応答を避ける
      const hasPreviousConversation = conversationHistory && conversationHistory.length > 2; // 初回のウェルカムメッセージを除く
      
      // ユーザーの入力内容を分析
      const userSaidYes = conversation.match(/はい|yes|お願い|それで|ok|オッケー|いいです/i);
      const userAskedQuestion = conversation.includes('？') || conversation.includes('?');
      const userWantsToAdd = conversation.includes('追加') || conversation.includes('他に');
      
      // 応答メッセージの生成
      let responseMessage = '';
      if (mode === 'create') {
        if (customerName && amount && description) {
          if (hasPreviousConversation) {
            // 2回目以降の会話では、別の応答パターンを使用
            const additionalOptions = [
              `請求書の内容を確認しました。\n\n明細に追加する項目はありますか？`,
              `${customerName}様への請求書（${description} ¥${amount.toLocaleString()}）を準備しています。\n\n支払期限や備考など、他に設定したい内容はありますか？`,
              `了解しました。現在の内容：\n・${customerName}様\n・${description}\n・¥${(amount + taxAmount).toLocaleString()}（税込）\n\nこの内容で確定してもよろしいですか？`
            ];
            responseMessage = additionalOptions[Math.floor(conversationHistory.length / 2) % additionalOptions.length];
          } else {
            responseMessage = `承知いたしました。${customerName}様への請求書を作成します。\n\n` +
                            `内容：${description}\n` +
                            `金額：¥${amount.toLocaleString()}（税込 ¥${(amount + taxAmount).toLocaleString()}）\n\n` +
                            `他に追加したい項目はありますか？`;
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
        } else {
          responseMessage = `申し訳ございません。変更内容を理解できませんでした。\n\n` +
                          `以下のような指示をお試しください：\n` +
                          `・「金額を60万円に変更してください」\n` +
                          `・「品目をコンサルティング費に変更」\n` +
                          `・「支払期限を30日後に」\n` +
                          `・「備考に〇〇を追加」`;
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
      
      // レスポンスの作成
      const response = {
        success: true,
        message: responseMessage,
        data: {
          customerId,
          customerName,
          items: invoiceData.items,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          notes: invoiceData.notes,
          paymentMethod: invoiceData.paymentMethod,
          subtotal: invoiceData.items.reduce((sum, item) => sum + item.amount, 0),
          taxAmount: invoiceData.items.reduce((sum, item) => sum + item.taxAmount, 0),
          totalAmount: invoiceData.items.reduce((sum, item) => sum + item.amount + item.taxAmount, 0),
        },
        aiConversationId: sessionId || Date.now().toString(),
      };
      
      return NextResponse.json(response);
    }

    // OpenAI APIを使用する場合の既存コード
    // プロンプトの作成
    const systemPrompt = `あなたは請求書作成のためのAIアシスタントです。
与えられた会話から請求書に必要な情報を抽出してください。

以下の情報を抽出してください：
1. 顧客名または会社名
2. 請求項目（品目、数量、単価、金額）
3. 請求日（明記されていない場合は今日の日付）
4. 支払期限（明記されていない場合は請求日から30日後）
5. 備考やメモ
6. 支払方法（明記されていない場合は銀行振込）

税率は日本の消費税10%として計算してください。
金額が明記されていない場合は、数量×単価で計算してください。

出力は以下のJSON形式で返してください：
{
  "customerName": "顧客名",
  "items": [
    {
      "description": "品目説明",
      "quantity": 数量,
      "unitPrice": 単価,
      "amount": 金額（税抜）,
      "taxRate": 0.1,
      "taxAmount": 消費税額
    }
  ],
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "notes": "備考",
  "paymentMethod": "bank_transfer"
}`;

    // OpenAI APIを使用して会話を解析
    let openai: OpenAI;
    try {
      openai = getOpenAIClient();
    } catch (error) {
      console.error('OpenAI client initialization error:', error);
      return NextResponse.json(
        { error: 'AI service is not configured. Please configure OpenAI API key.' },
        { status: 503 }
      );
    }
    
    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversation }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // レスポンスをパース
    let invoiceData: InvoiceData;
    try {
      const parsed = JSON.parse(content);
      invoiceData = InvoiceDataSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return NextResponse.json(
        { error: 'Failed to parse invoice data from conversation' },
        { status: 500 }
      );
    }

    // 顧客名から既存顧客をマッチング
    let customerId: string | null = null;
    let customerName = invoiceData.customerName;
    
    if (customerName) {
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

    // 日付の処理
    const today = new Date();
    const invoiceDate = invoiceData.invoiceDate 
      ? new Date(invoiceData.invoiceDate) 
      : today;
    
    const dueDate = invoiceData.dueDate 
      ? new Date(invoiceData.dueDate)
      : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日後

    // レスポンスの作成
    const response = {
      success: true,
      data: {
        customerId,
        customerName,
        items: invoiceData.items,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        notes: invoiceData.notes,
        paymentMethod: invoiceData.paymentMethod,
        subtotal: invoiceData.items.reduce((sum, item) => sum + item.amount, 0),
        taxAmount: invoiceData.items.reduce((sum, item) => sum + item.taxAmount, 0),
        totalAmount: invoiceData.items.reduce((sum, item) => sum + item.amount + item.taxAmount, 0),
      },
      aiConversationId: Date.now().toString(), // 簡易的な会話ID
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to analyze conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}