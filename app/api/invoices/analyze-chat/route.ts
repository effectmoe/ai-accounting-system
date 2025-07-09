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
    const { conversation } = await request.json();
    
    if (!conversation || typeof conversation !== 'string') {
      return NextResponse.json(
        { error: 'Conversation text is required' },
        { status: 400 }
      );
    }

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
      const customerService = new CustomerService();
      const searchResult = await customerService.searchCustomers({ 
        query: customerName,
        limit: 1 
      });
      
      if (searchResult.customers.length > 0) {
        customerId = searchResult.customers[0]._id!.toString();
        customerName = searchResult.customers[0].companyName;
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
    return NextResponse.json(
      { error: 'Failed to analyze conversation' },
      { status: 500 }
    );
  }
}