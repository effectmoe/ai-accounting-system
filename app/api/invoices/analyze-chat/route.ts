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
      throw new Error(`DeepSeek API error: ${response.status}`);
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
    console.log('[API Start] analyze-chat endpoint called at', new Date().toISOString());
    
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
    
    // 重要：currentInvoiceDataのitemsを確認
    if (currentInvoiceData && currentInvoiceData.items) {
      console.log('[DEBUG] Current items count:', currentInvoiceData.items.length);
      currentInvoiceData.items.forEach((item, index) => {
        console.log(`[DEBUG] Item ${index + 1}:`, {
          description: item.description,
          amount: item.amount,
          taxAmount: item.taxAmount
        });
      });
    }

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
        console.error('Error fetching company info:', error);
      }

      // 現在の日付を取得
      const today = new Date();
      const invoiceDate = format(today, 'yyyy-MM-dd');
      // 支払い条件に基づいて支払期限を計算
      const calculatedDueDate = calculateDueDate(today, paymentTerms);
      const dueDate = format(calculatedDueDate, 'yyyy-MM-dd');

      // 自然な対話のためのプロンプト（簡潔版）
      const systemPrompt = `あなたは請求書作成を支援するAIアシスタントです。
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

      try {
        console.log('[AI] Starting AI processing', { usingDeepSeek });
        
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

        console.log('Sending to AI with messages:', messages.length);

        try {
          let modelName = 'unknown';
          if (usingDeepSeek) {
            // DeepSeek APIを直接呼び出す
            modelName = 'deepseek-chat';
            const deepseekResponse = await callDeepSeekAPI(messages, 0.7, 500);
            aiResponse = deepseekResponse.choices?.[0]?.message?.content || '';
            console.log('[DeepSeek] Response received');
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
            console.log('[OpenAI] Response received');
          }
        } catch (apiError) {
          console.error('[AI] API call failed:', {
            error: apiError instanceof Error ? apiError.message : 'Unknown error',
            stack: apiError instanceof Error ? apiError.stack : undefined,
            model: usingDeepSeek ? 'deepseek-chat' : (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4'),
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
        
        // AIレスポンスからデータを抽出
        let extractedData = null;
        let updatedData = { 
          ...currentInvoiceData,
          items: currentInvoiceData?.items ? [...currentInvoiceData.items] : []
        };
        
        if (aiResponse) {
          console.log('[AI] Processing AI response for data extraction');
          console.log('[AI] AI Response:', aiResponse);
          
          // シンプルなキーワードベースの抽出
          const lines = aiResponse.split('\n');
          const newItems = [];
          let foundItemList = false;
          
          // 顧客名の抽出（最初の会話から）
          if (!updatedData.customerName && conversation) {
            const customerMatch = conversation.match(/([^に]+)(?:さん|様)?に/);
            if (customerMatch) {
              updatedData.customerName = customerMatch[1].replace(/さん|様/g, '').trim();
              console.log('[AI] Extracted customer name:', updatedData.customerName);
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
              
              console.log(`[AI] Found item ${itemNumber}: ${description} = ${amount}円`);
              
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
          
          // 合計金額の確認（税込み）
          let totalWithTax = null;
          for (const line of lines) {
            const totalMatch = line.match(/合計金額は[\d,]+円（税抜）で、消費税10%を加えると([\d,]+)円/);
            if (totalMatch) {
              totalWithTax = parseInt(totalMatch[1].replace(/,/g, ''));
              console.log('[AI] Found total with tax:', totalWithTax);
              break;
            }
          }
          
          // 項目が見つかった場合は、既存の項目を置き換える
          if (foundItemList && newItems.length > 0) {
            updatedData.items = newItems;
            console.log('[AI] Updated items from AI response:', JSON.stringify(newItems, null, 2));
          }
          
          // extractedDataに更新されたデータを設定
          extractedData = updatedData;
          console.log('[AI] Final extracted data:', JSON.stringify(extractedData, null, 2));
        }
        
        // フォールバック処理 - AIが番号付き項目を出力しなかった場合
        if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
          console.log('[AI] No items found in AI response, keeping current data');
          extractedData = currentInvoiceData || {};
        }
        
        // 日付設定
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
          console.error('Error fetching bank account:', error);
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
        console.log('[API/AI] Final data before response:', {
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
        
        const response = {
          success: true,
          message: cleanMessage,
          data: {
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
          },
          aiConversationId: sessionId || Date.now().toString(),
        };

        console.log('[API] Final response being sent:', JSON.stringify(response, null, 2));
        console.log('[API] Response items count:', response.data.items?.length || 0);
        console.log('[API] Response subtotal:', response.data.subtotal);
        console.log('[API] Response total:', response.data.totalAmount);
        
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
    
    // プレースホルダー実装（AIが使えない場合の最小限のフォールバック）
    console.log('[DEBUG] Using minimal placeholder implementation - AI models not available or failed');
    console.log('[DEBUG] Environment check:', {
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
      
      console.log('[Placeholder] Minimal extraction:', {
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
          console.error('Customer search error:', err);
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
      
      console.log('[API] Response data calculation:', {
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
      
      const response = {
        success: true,
        message: finalMessage,
        quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
        data: {
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
        },
        aiConversationId: sessionId || Date.now().toString(),
      };
      
      return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    
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