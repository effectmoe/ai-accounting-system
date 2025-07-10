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

    // AI APIキーの確認（OpenAI または DeepSeek）
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const useDeepSeek = !openaiApiKey && deepseekApiKey;
    
    if (!openaiApiKey && !deepseekApiKey) {
      console.log('No AI API key configured, using placeholder implementation');
      
      // プレースホルダー実装：簡単なキーワードマッチング
      const conversationLower = conversation.toLowerCase();
      
      // 顧客名の抽出（「〜さん」「〜会社」「〜株式会社」など）
      let customerName = '';
      const customerMatch = conversation.match(/([^、。\s]+(?:会社|株式会社|さん|様))/);
      if (customerMatch) {
        customerName = customerMatch[1].replace(/さん$|様$/, '');
      }
      
      // 既存データから顧客名を保持
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
      const itemMatch = conversation.match(/([^、。\s]+(?:費|料|代|制作|開発|サービス|業務|作業))/);
      if (itemMatch) {
        description = itemMatch[0];
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
        if (!amount && currentInvoiceData.items && currentInvoiceData.items[0]) {
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
      
      if (conversationHistory && conversationHistory.length > 0) {
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
      let items = mergedData.items || [];
      
      // メイン項目（制作費など）
      if (!items[0]) {
        items[0] = {
          description: description || '請求項目',
          quantity: 1,
          unitPrice: amount || 0,
          amount: amount || 0,
          taxRate: taxRate,
          taxAmount: taxAmount || 0
        };
      }
      
      // 金額が0でない場合のみ更新（誤った値で上書きしない）
      if (amount > 0 && items[0] && !hasMonthlyFee) {
        items[0].unitPrice = amount;
        items[0].amount = amount;
        items[0].taxAmount = Math.round(amount * taxRate);
      }
      
      // 説明が有効な場合のみ更新
      if (description && description !== '請求項目' && items[0]) {
        items[0].description = description;
      }
      
      // 月額料金がある場合は別項目として追加
      if (hasMonthlyFee && monthlyAmount) {
        // 保守料などの月額項目を探す
        let monthlyItemIndex = items.findIndex(item => 
          item.description.includes('保守') || 
          item.description.includes('月額') ||
          item.description.includes('サポート')
        );
        
        if (monthlyItemIndex === -1) {
          // 新規追加
          items.push({
            description: monthlyPeriodConfirmed 
              ? `保守料（${confirmedMonths}ヶ月分）` 
              : '保守料（期間要確認）',
            quantity: monthlyPeriodConfirmed ? confirmedMonths : 1,
            unitPrice: monthlyAmount.value,
            amount: monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1),
            taxRate: taxRate,
            taxAmount: Math.round(monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1) * taxRate)
          });
        } else {
          // 既存項目を更新
          items[monthlyItemIndex] = {
            ...items[monthlyItemIndex],
            description: monthlyPeriodConfirmed 
              ? `保守料（${confirmedMonths}ヶ月分）` 
              : '保守料（期間要確認）',
            quantity: monthlyPeriodConfirmed ? confirmedMonths : 1,
            unitPrice: monthlyAmount.value,
            amount: monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1),
            taxAmount: Math.round(monthlyAmount.value * (monthlyPeriodConfirmed ? confirmedMonths : 1) * taxRate)
          };
        }
      }
      
      const invoiceData: InvoiceData = {
        customerName: customerName || mergedData.customerName || '未設定顧客',
        items: items,
        invoiceDate: mergedData.invoiceDate || today.toISOString().split('T')[0],
        dueDate: mergedData.dueDate || dueDate.toISOString().split('T')[0],
        notes: mergedData.notes || `AI会話から作成`,
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
      
      // 質問タイプの判定
      const isYesNoQuestion = (message: string): boolean => {
        return (
          message.includes('よろしいですか') ||
          message.includes('よろしいでしょうか') ||
          message.includes('確定しても') ||
          message.includes('確定しますか') ||
          message.includes('ありますか？') ||
          message.includes('ですか？')
        );
      };
      
      const isSpecificInfoRequest = (message: string): boolean => {
        return (
          message.includes('お知らせください') ||
          message.includes('教えてください') ||
          message.includes('入力してください') ||
          message.includes('記載してください') ||
          message.includes('お伝えください') ||
          message.includes('お聞かせください')
        );
      };
      
      const isChoiceQuestion = (message: string): boolean => {
        return (
          message.includes('どの') ||
          message.includes('どちら') ||
          message.includes('選択') ||
          message.includes('期間分')
        );
      };
      
      // 「追加する項目や修正点はありますか？」への「はい」の応答を特別に処理
      if (lastAssistantQuestion.includes('追加する項目や修正点はありますか') && userSaidYes) {
        responseMessage = `どのような追加・修正をご希望ですか？`;
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
      } else if (hasMonthlyFee && !monthlyPeriodConfirmed && monthlyAmount) {
        // 月額料金の期間を明確化する必要がある
        responseMessage = `承知いたしました。${monthlyAmount.value.toLocaleString()}円の月額料金ですね。\n\n` +
                        `請求書にはどの期間分を記載しますか？`;
        quickReplies = [
          { text: '今月分のみ', value: `今月分のみ（${monthlyAmount.value.toLocaleString()}円）でお願いします` },
          { text: '3ヶ月分', value: `3ヶ月分（${(monthlyAmount.value * 3).toLocaleString()}円）でお願いします` },
          { text: '6ヶ月分', value: `6ヶ月分（${(monthlyAmount.value * 6).toLocaleString()}円）でお願いします` },
          { text: '年間契約', value: `年間契約（${(monthlyAmount.value * 12).toLocaleString()}円）でお願いします` }
        ];
      } else if (mode === 'create') {
        if (customerName && amount && description) {
          if (hasPreviousConversation) {
            // 2回目以降の会話では、別の応答パターンを使用
            const additionalOptions = [
              `請求書の内容を確認しました。\n\n明細に追加する項目や修正点はありますか？`,
              `${customerName}様への請求書（${description} ¥${amount.toLocaleString()}）を準備しています。\n\n支払期限や備考など、他に設定したい内容はありますか？`,
              `了解しました。現在の内容：\n・${customerName}様\n・${description}\n・¥${(amount + taxAmount).toLocaleString()}（税込）\n\n他に追加・修正したい項目はありますか？`
            ];
            quickReplies = [
              { text: 'はい（追加・修正あり）', value: '追加したい項目があります' },
              { text: 'いいえ（このまま確定）', value: 'このままで確定します' }
            ];
            responseMessage = additionalOptions[Math.floor(conversationHistory.length / 2) % additionalOptions.length];
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
      // 具体的情報を求める質問の場合はクイックリプライを表示しない
      if (isSpecificInfoRequest(responseMessage) && !isChoiceQuestion(responseMessage)) {
        quickReplies = [];
      }
      
      // レスポンスの作成
      const response = {
        success: true,
        message: responseMessage,
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
    }
    
    // DeepSeek APIを使用する場合
    if (useDeepSeek) {
      try {
        console.log('Using DeepSeek API for conversation');
        
        // 会話履歴を含むプロンプトを構築
        const messages = [
          {
            role: 'system',
            content: `あなたは請求書作成を支援する優秀なAIアシスタントです。
            
重要なルール：
1. ユーザーとの自然な会話を通じて、請求書に必要な情報を収集してください
2. 現在の請求書データ: ${JSON.stringify(currentInvoiceData || {})}
3. モード: ${mode === 'create' ? '新規作成' : '編集'}
4. 必要な情報：顧客名、請求項目、金額、期日など
5. ユーザーの意図を正確に理解し、適切に応答してください
6. 確認が必要な場合は、選択肢を提示してください
7. 月額料金が言及された場合は、期間を確認してください

応答は簡潔で分かりやすく、プロフェッショナルにしてください。`
          }
        ];
        
        // 会話履歴を追加
        if (conversationHistory && conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            messages.push({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            });
          });
        }
        
        // 最新のユーザー入力を追加
        messages.push({
          role: 'user',
          content: conversation
        });
        
        // DeepSeek APIを呼び出し
        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekApiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
          })
        });
        
        if (!deepseekResponse.ok) {
          throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
        }
        
        const deepseekResult = await deepseekResponse.json();
        const aiResponse = deepseekResult.choices[0]?.message?.content || '';
        
        // AI応答から請求書データを抽出（既存のロジックを使用）
        const conversationLower = conversation.toLowerCase();
        let customerName = currentInvoiceData?.customerName || '';
        const customerMatch = conversation.match(/([^、。\s]+(?:会社|株式会社|さん|様))/);
        if (customerMatch) {
          customerName = customerMatch[1].replace(/さん$|様$/, '');
        }
        
        // 金額の抽出
        const amounts: Array<{value: number, isMonthly: boolean}> = [];
        const amountMatches = conversation.matchAll(/(\d+)(万円|万|円)(?:\/月|[のの]月額)?/g);
        for (const match of amountMatches) {
          const numStr = match[1];
          const unit = match[2];
          const value = (unit === '万円' || unit === '万') ? parseInt(numStr) * 10000 : parseInt(numStr);
          const isMonthly = conversation.includes(`${match[0]}/月`) || conversation.includes(`月額${match[0]}`);
          amounts.push({ value, isMonthly });
        }
        
        // 請求書データの更新
        const invoiceData = {
          customerName: customerName || currentInvoiceData?.customerName || '',
          items: currentInvoiceData?.items || [{
            description: '請求項目',
            quantity: 1,
            unitPrice: amounts[0]?.value || 0,
            amount: amounts[0]?.value || 0,
            taxRate: 0.1,
            taxAmount: Math.round((amounts[0]?.value || 0) * 0.1)
          }],
          invoiceDate: currentInvoiceData?.invoiceDate || new Date().toISOString().split('T')[0],
          dueDate: currentInvoiceData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: currentInvoiceData?.notes || '',
          paymentMethod: currentInvoiceData?.paymentMethod || 'bank_transfer'
        };
        
        // 質問タイプ判定関数（共通使用）
        const isInfoRequest = (msg: string) => {
          return msg.includes('お知らせください') || 
                 msg.includes('教えてください') ||
                 msg.includes('入力してください') ||
                 msg.includes('記載してください');
        };
        
        // クイック返信の生成
        let quickReplies: Array<{text: string, value: string}> = [];
        
        // 具体的情報を求める場合はクイックリプライを表示しない
        if (isInfoRequest(aiResponse)) {
          quickReplies = [];
        }
        // Yes/No質問の場合
        else if ((aiResponse.includes('確認') || aiResponse.includes('よろしい')) && 
                 (aiResponse.includes('ですか') || aiResponse.includes('でしょうか'))) {
          quickReplies = [
            { text: 'はい（確定）', value: 'はい、この内容で確定します' },
            { text: 'いいえ（修正）', value: 'いいえ、修正したいです' }
          ];
        }
        // 追加・修正の有無を問う場合
        else if ((aiResponse.includes('追加する項目') || aiResponse.includes('修正点')) && 
                 aiResponse.includes('ありますか')) {
          quickReplies = [
            { text: 'はい（追加・修正あり）', value: '追加したい項目があります' },
            { text: 'いいえ（このまま確定）', value: 'このままで確定します' }
          ];
        }
        // 期間選択の場合（選択肢を提供）
        else if (aiResponse.includes('期間') && amounts.some(a => a.isMonthly) && 
                 (aiResponse.includes('どの') || aiResponse.includes('記載しますか'))) {
          const monthlyAmount = amounts.find(a => a.isMonthly)?.value || 0;
          quickReplies = [
            { text: '今月分のみ', value: `今月分のみ（${monthlyAmount.toLocaleString()}円）でお願いします` },
            { text: '3ヶ月分', value: `3ヶ月分（${(monthlyAmount * 3).toLocaleString()}円）でお願いします` },
            { text: '6ヶ月分', value: `6ヶ月分（${(monthlyAmount * 6).toLocaleString()}円）でお願いします` },
            { text: '年間契約', value: `年間契約（${(monthlyAmount * 12).toLocaleString()}円）でお願いします` }
          ];
        }
        
        return NextResponse.json({
          success: true,
          message: aiResponse,
          quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
          data: {
            customerId: null,
            customerName: invoiceData.customerName,
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
        });
        
      } catch (error) {
        console.error('DeepSeek API error:', error);
        // フォールバックとしてプレースホルダー実装を使用
        console.log('Falling back to placeholder implementation');
      }
    }

    // OpenAI APIを使用する場合（既存のコードを保持）
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