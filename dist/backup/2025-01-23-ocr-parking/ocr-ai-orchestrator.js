"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRAIOrchestrator = void 0;
const logger_1 = require("@/lib/logger");
class OCRAIOrchestrator {
    deepseekApiKey = null;
    isAvailable = false;
    deepseekEndpoint = 'https://api.deepseek.com/v1/chat/completions';
    constructor() {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        logger_1.logger.debug('[OCRAIOrchestrator] Initializing with DeepSeek API...');
        logger_1.logger.debug('[OCRAIOrchestrator] API Key from env:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Not found');
        logger_1.logger.debug('[OCRAIOrchestrator] Contains test-key:', apiKey?.includes('test-key') || false);
        if (apiKey && !apiKey.includes('test-key')) {
            this.deepseekApiKey = apiKey;
            this.isAvailable = true;
            logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek API is available');
        }
        else {
            logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek API is NOT available');
        }
    }
    /**
     * OCR結果を構造化された請求書データに変換
     */
    async orchestrateOCRResult(request) {
        if (!this.isAvailable || !this.deepseekApiKey) {
            throw new Error('AI Orchestrator is not available (DeepSeek API key not configured)');
        }
        try {
            logger_1.logger.debug('[OCRAIOrchestrator] Starting DeepSeek AI-driven OCR orchestration...');
            logger_1.logger.debug('[OCRAIOrchestrator] Request:', {
                documentType: request.documentType,
                companyId: request.companyId,
                ocrResultKeys: Object.keys(request.ocrResult || {})
            });
            // OCR結果を文字列化（コンパクトに）
            const ocrDataStr = this.compactOCRData(request.ocrResult);
            logger_1.logger.debug('[OCRAIOrchestrator] Compact OCR data length:', ocrDataStr.length);
            logger_1.logger.debug('[OCRAIOrchestrator] Compact OCR data preview:', ocrDataStr.substring(0, 500));
            // 事前分析を実行
            const preAnalysis = this.performPreAnalysis(request.ocrResult);
            logger_1.logger.debug('[OCRAIOrchestrator] Pre-analysis completed:', preAnalysis);
            // プロンプトの構築
            const prompt = this.buildDeepSeekPrompt(request.documentType, ocrDataStr);
            // DeepSeek APIを使用して解析（リトライ付き）
            logger_1.logger.debug('[OCRAIOrchestrator] Sending request to DeepSeek API...');
            logger_1.logger.debug('[OCRAIOrchestrator] Prompt length:', prompt.length, 'characters');
            let response = null;
            let lastError = null;
            const maxRetries = 2;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    logger_1.logger.debug(`[OCRAIOrchestrator] Attempt ${attempt}/${maxRetries}...`);
                    const startTime = Date.now();
                    response = await this.callDeepSeekAPI(prompt);
                    const elapsed = Date.now() - startTime;
                    logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek API response received in', elapsed, 'ms');
                    break; // 成功したらループを抜ける
                }
                catch (error) {
                    lastError = error;
                    logger_1.logger.error(`[OCRAIOrchestrator] Attempt ${attempt} failed:`, error);
                    if (attempt < maxRetries) {
                        logger_1.logger.debug(`[OCRAIOrchestrator] Retrying in 2 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            if (!response && lastError) {
                throw lastError;
            }
            // レスポンスから構造化データを抽出
            const content = response.choices[0].message.content;
            logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek message content length:', content.length);
            logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek message content preview:', content.substring(0, 500));
            // JSONを抽出
            let structuredData;
            // 複数のパターンでJSONを探す
            const jsonPatterns = [
                /```json\n([\s\S]*?)\n```/, // 標準的なコードブロック
                /```\n([\s\S]*?)\n```/, // 言語指定なしのコードブロック
                /\{[\s\S]*\}/ // 直接のJSONオブジェクト
            ];
            let jsonStr = null;
            for (const pattern of jsonPatterns) {
                const match = content.match(pattern);
                if (match) {
                    jsonStr = match[1] || match[0];
                    break;
                }
            }
            if (!jsonStr) {
                logger_1.logger.error('[OCRAIOrchestrator] Failed to extract JSON from content');
                logger_1.logger.error('[OCRAIOrchestrator] Full content:', content);
                throw new Error('Failed to extract JSON from DeepSeek response');
            }
            try {
                logger_1.logger.debug('[OCRAIOrchestrator] Attempting to parse JSON string:', jsonStr.substring(0, 200));
                structuredData = JSON.parse(jsonStr);
                logger_1.logger.debug('[OCRAIOrchestrator] Successfully parsed JSON');
            }
            catch (e) {
                logger_1.logger.error('[OCRAIOrchestrator] JSON parse error:', e);
                logger_1.logger.error('[OCRAIOrchestrator] Failed JSON string:', jsonStr);
                throw new Error('Invalid JSON in DeepSeek response');
            }
            // 後処理・検証
            const validatedData = this.validateAndEnhanceData(structuredData, request.ocrResult);
            logger_1.logger.debug('[OCRAIOrchestrator] Successfully parsed structured data:', {
                subject: validatedData.subject,
                vendorName: validatedData.vendor.name,
                customerName: validatedData.customer.name,
                itemsCount: validatedData.items.length,
                totalAmount: validatedData.totalAmount,
                hasBankTransferInfo: !!validatedData.bankTransferInfo,
                bankTransferInfo: validatedData.bankTransferInfo,
                hasCarryoverInfo: !!(validatedData.previousBalance || validatedData.currentPayment || validatedData.carryoverAmount),
                carryoverInfo: {
                    previousBalance: validatedData.previousBalance,
                    currentPayment: validatedData.currentPayment,
                    carryoverAmount: validatedData.carryoverAmount,
                    currentSales: validatedData.currentSales,
                    currentInvoiceAmount: validatedData.currentInvoiceAmount
                }
            });
            return validatedData;
        }
        catch (error) {
            logger_1.logger.error('[OCRAIOrchestrator] Error:', error);
            // フォールバック処理
            logger_1.logger.debug('[OCRAIOrchestrator] Attempting fallback processing...');
            return this.fallbackProcessing(request);
        }
    }
    /**
     * DeepSeek APIを呼び出し
     */
    async callDeepSeekAPI(prompt) {
        // AbortControllerを使用してタイムアウトを実装
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒のタイムアウト
        try {
            logger_1.logger.debug('[OCRAIOrchestrator] Making DeepSeek API request with 25s timeout...');
            logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek API endpoint:', this.deepseekEndpoint);
            logger_1.logger.debug('[OCRAIOrchestrator] API Key present:', !!this.deepseekApiKey);
            logger_1.logger.debug('[OCRAIOrchestrator] API Key prefix:', this.deepseekApiKey?.substring(0, 10));
            const requestBody = {
                model: 'deepseek-chat', // より汎用的なチャットモデル
                messages: [
                    {
                        role: 'system',
                        content: 'You are a JSON extraction expert. Always return valid JSON in code blocks.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0,
                stream: false
            };
            logger_1.logger.debug('[OCRAIOrchestrator] Request body (without content):', {
                ...requestBody,
                messages: requestBody.messages.map(m => ({ role: m.role, contentLength: m.content.length }))
            });
            const response = await fetch(this.deepseekEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.deepseekApiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal // タイムアウト用のシグナル
            });
            clearTimeout(timeoutId);
            logger_1.logger.debug('[OCRAIOrchestrator] Response status:', response.status);
            logger_1.logger.debug('[OCRAIOrchestrator] Response headers:', Object.fromEntries(response.headers.entries()));
            if (!response.ok) {
                const errorText = await response.text();
                logger_1.logger.error('[OCRAIOrchestrator] DeepSeek API error response:', errorText);
                logger_1.logger.error('[OCRAIOrchestrator] Full error details:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    errorBody: errorText
                });
                throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek API request completed successfully');
            logger_1.logger.debug('[OCRAIOrchestrator] DeepSeek response structure:', {
                hasChoices: !!data.choices,
                choicesLength: data.choices?.length,
                hasUsage: !!data.usage,
                firstChoiceHasMessage: !!data.choices?.[0]?.message,
                firstChoiceMessageContentLength: data.choices?.[0]?.message?.content?.length
            });
            return data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                logger_1.logger.error('[OCRAIOrchestrator] DeepSeek API request timed out after 25 seconds');
                throw new Error('DeepSeek API request timed out after 25 seconds');
            }
            logger_1.logger.error('[OCRAIOrchestrator] Unexpected error:', error);
            logger_1.logger.error('[OCRAIOrchestrator] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            throw error;
        }
    }
    /**
     * 事前分析を実行
     */
    performPreAnalysis(ocrResult) {
        const analysis = {
            hasFields: !!ocrResult.fields,
            hasTables: !!ocrResult.tables && ocrResult.tables.length > 0,
            hasPages: !!ocrResult.pages && ocrResult.pages.length > 0,
            companiesFound: [],
            honorificsFound: [],
            amountsFound: [],
            datesFound: []
        };
        // 会社名と敬語の検出
        if (ocrResult.pages) {
            for (const page of ocrResult.pages) {
                if (page.lines) {
                    for (const line of page.lines) {
                        const content = line.content || '';
                        // 会社名パターン
                        if (this.isCompanyName(content)) {
                            analysis.companiesFound.push(content);
                        }
                        // 敬語パターン
                        if (content.includes('御中') || content.includes('様')) {
                            analysis.honorificsFound.push(content);
                        }
                        // 金額パターン
                        const amountMatch = content.match(/[\d,]+円?/g);
                        if (amountMatch) {
                            analysis.amountsFound.push(...amountMatch);
                        }
                        // 日付パターン
                        const dateMatch = content.match(/\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}/);
                        if (dateMatch) {
                            analysis.datesFound.push(dateMatch[0]);
                        }
                    }
                }
            }
        }
        return analysis;
    }
    /**
     * データの検証と拡張
     */
    validateAndEnhanceData(data, ocrResult) {
        logger_1.logger.debug('[OCRAIOrchestrator] Validating data before enhancement:', {
            vendorName: data.vendor?.name,
            customerName: data.customer?.name,
            totalAmount: data.totalAmount,
            itemsCount: data.items?.length,
            items: data.items
        });
        // 会社名の検証
        if (!data.vendor?.name || data.vendor.name === '不明' || data.vendor.name === '') {
            const companyName = this.extractCompanyFromOCR(ocrResult);
            if (companyName) {
                logger_1.logger.debug('[OCRAIOrchestrator] Replacing vendor name with extracted:', companyName);
                data.vendor.name = companyName;
            }
            else {
                // デフォルトの仕入先名を設定
                data.vendor.name = '合同会社アソウタイセイプリンティング';
                logger_1.logger.debug('[OCRAIOrchestrator] Using default vendor name');
            }
        }
        // 顧客名の検証
        if (!data.customer?.name || data.customer.name === '不明' || data.customer.name === '') {
            const customerName = this.extractCustomerFromOCR(ocrResult);
            if (customerName) {
                logger_1.logger.debug('[OCRAIOrchestrator] Replacing customer name with extracted:', customerName);
                data.customer.name = customerName;
            }
        }
        // 金額の検証
        if (!data.totalAmount || data.totalAmount === 0) {
            const amount = this.extractTotalAmountFromOCR(ocrResult);
            if (amount) {
                logger_1.logger.debug('[OCRAIOrchestrator] Replacing total amount with extracted:', amount);
                data.totalAmount = amount;
            }
        }
        // アイテムの検証と備考の処理
        if (data.items && data.items.length > 0) {
            const validItems = [];
            const remarksTexts = [];
            // 各アイテムを検証
            data.items.forEach((item, index) => {
                logger_1.logger.debug(`[OCRAIOrchestrator] Checking item ${index}:`, {
                    itemName: item.itemName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.amount
                });
                // 数量、単価、金額が全て空または0の場合は備考として扱う
                if ((!item.quantity || item.quantity === 0) &&
                    (!item.unitPrice || item.unitPrice === 0) &&
                    (!item.amount || item.amount === 0)) {
                    logger_1.logger.debug(`[OCRAIOrchestrator] Item ${index} "${item.itemName}" is a remark (no numeric data)`);
                    if (item.itemName && item.itemName.trim()) {
                        remarksTexts.push(item.itemName);
                    }
                }
                else {
                    // 有効な商品として追加
                    validItems.push(item);
                }
            });
            // 有効な商品のみをitemsに設定
            data.items = validItems;
            // 備考をnotesに追加
            if (remarksTexts.length > 0) {
                const additionalNotes = remarksTexts.join('\n');
                data.notes = data.notes ? `${data.notes}\n\n${additionalNotes}` : additionalNotes;
                logger_1.logger.debug('[OCRAIOrchestrator] Added remarks to notes:', additionalNotes);
            }
        }
        // アイテムが空になった場合のフォールバック
        if (!data.items || data.items.length === 0) {
            logger_1.logger.debug('[OCRAIOrchestrator] No valid items found, creating default item');
            data.items = [{
                    itemName: '商品',
                    quantity: 1,
                    unitPrice: data.totalAmount || 0,
                    amount: data.totalAmount || 0,
                    taxRate: 10,
                    taxAmount: data.taxAmount || 0
                }];
        }
        logger_1.logger.debug('[OCRAIOrchestrator] Data after enhancement:', {
            vendorName: data.vendor?.name,
            customerName: data.customer?.name,
            totalAmount: data.totalAmount,
            itemsCount: data.items?.length,
            hasNotes: !!data.notes
        });
        return data;
    }
    /**
     * フォールバック処理
     */
    fallbackProcessing(request) {
        logger_1.logger.debug('[OCRAIOrchestrator] Executing fallback processing...');
        logger_1.logger.debug('[OCRAIOrchestrator] OCR Result for fallback:', JSON.stringify(request.ocrResult, null, 2));
        // OCRの生データから基本的な情報を抽出
        const lines = [];
        if (request.ocrResult?.pages) {
            for (const page of request.ocrResult.pages) {
                if (page.lines) {
                    for (const line of page.lines) {
                        if (line.content) {
                            lines.push(line.content);
                        }
                    }
                }
            }
        }
        logger_1.logger.debug('[OCRAIOrchestrator] Extracted lines:', lines);
        // 基本的な情報の抽出
        let vendorName = this.extractCompanyFromOCR(request.ocrResult) || '合同会社アソウタイセイプリンティング';
        let customerName = this.extractCustomerFromOCR(request.ocrResult) || '顧客名不明';
        let subject = '';
        let totalAmount = this.extractTotalAmountFromOCR(request.ocrResult) || 0;
        // 件名の抽出
        for (const line of lines) {
            if (line.includes('件名') && line.includes(':')) {
                subject = line.split(':')[1].trim();
                break;
            }
        }
        // 商品情報の簡易抽出
        const items = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 数量と金額のパターンを探す
            if (line.match(/^\d+$/) && i > 0) { // 数量らしきもの
                const prevLine = lines[i - 1];
                const nextLine = lines[i + 1];
                const quantity = parseInt(line);
                // 金額を探す
                let amount = 0;
                if (nextLine && nextLine.match(/[\d,]+/)) {
                    amount = parseInt(nextLine.replace(/,/g, ''));
                }
                if (prevLine && quantity > 0 && amount > 0) {
                    items.push({
                        itemName: prevLine,
                        description: '',
                        quantity: quantity,
                        unitPrice: Math.floor(amount / quantity),
                        amount: amount,
                        taxRate: 10,
                        taxAmount: Math.floor(amount * 0.1)
                    });
                }
            }
        }
        // 基本的な構造を作成
        const fallbackData = {
            documentNumber: `FALLBACK-${Date.now()}`,
            issueDate: new Date().toISOString().split('T')[0],
            subject: subject || '印刷物',
            vendor: {
                name: vendorName,
                address: '',
                phone: '',
                email: '',
                fax: ''
            },
            customer: {
                name: customerName,
                address: ''
            },
            items: items.length > 0 ? items : [{
                    itemName: '商品名不明',
                    description: '',
                    quantity: 1,
                    unitPrice: totalAmount || 5000,
                    amount: totalAmount || 5000,
                    taxRate: 10,
                    taxAmount: (totalAmount || 5000) * 0.1,
                    remarks: ''
                }],
            subtotal: totalAmount ? totalAmount / 1.1 : 5000,
            taxAmount: totalAmount ? totalAmount - (totalAmount / 1.1) : 500,
            totalAmount: totalAmount || 5500,
            deliveryLocation: '',
            paymentTerms: '',
            quotationValidity: '',
            notes: 'DeepSeek AI解析に失敗したため、フォールバック処理を実行'
        };
        logger_1.logger.debug('[OCRAIOrchestrator] Fallback data created:', fallbackData);
        return fallbackData;
    }
    /**
     * OCRデータをコンパクトに変換
     */
    compactOCRData(ocrResult) {
        // 必要な情報のみを抽出
        const compactData = {
            content: ocrResult.content || '',
            pages: []
        };
        if (ocrResult.pages) {
            for (const page of ocrResult.pages) {
                const compactPage = {
                    pageNumber: page.pageNumber,
                    lines: []
                };
                if (page.lines) {
                    for (const line of page.lines) {
                        // contentのみを保持（boundingBoxなどは除外）
                        compactPage.lines.push({
                            content: line.content || ''
                        });
                    }
                }
                compactData.pages.push(compactPage);
            }
        }
        // テーブルデータがある場合は簡潔に含める
        if (ocrResult.tables && ocrResult.tables.length > 0) {
            compactData.tables = ocrResult.tables.map((table) => ({
                rowCount: table.rowCount,
                columnCount: table.columnCount,
                cells: table.cells?.map((cell) => ({
                    content: cell.content,
                    rowIndex: cell.rowIndex,
                    columnIndex: cell.columnIndex
                })) || []
            }));
        }
        return JSON.stringify(compactData, null, 2);
    }
    /**
     * 会社名かどうかを判定
     */
    isCompanyName(text) {
        const companyPatterns = [
            /株式会社/,
            /有限会社/,
            /合同会社/,
            /一般社団法人/,
            /Corporation/,
            /Corp/,
            /LLC/,
            /Inc/,
            /\(株\)/,
            /\(有\)/,
            /アソウタイセイ/,
            /ピアソラ/
        ];
        return companyPatterns.some(pattern => pattern.test(text)) && !text.includes('御中');
    }
    /**
     * OCRから会社名を抽出
     */
    extractCompanyFromOCR(ocrResult) {
        if (!ocrResult.pages)
            return null;
        for (const page of ocrResult.pages) {
            if (page.lines) {
                for (const line of page.lines) {
                    const content = line.content || '';
                    if (this.isCompanyName(content)) {
                        return content.trim();
                    }
                }
            }
        }
        return null;
    }
    /**
     * OCRから顧客名を抽出
     */
    extractCustomerFromOCR(ocrResult) {
        if (!ocrResult.pages)
            return null;
        for (const page of ocrResult.pages) {
            if (page.lines) {
                for (const line of page.lines) {
                    const content = line.content || '';
                    if (content.includes('御中') || content.includes('様')) {
                        return content.trim();
                    }
                }
            }
        }
        return null;
    }
    /**
     * OCRから総額を抽出
     */
    extractTotalAmountFromOCR(ocrResult) {
        if (!ocrResult.pages)
            return null;
        const amounts = [];
        for (const page of ocrResult.pages) {
            if (page.lines) {
                for (const line of page.lines) {
                    const content = line.content || '';
                    const amountMatch = content.match(/[\d,]+/g);
                    if (amountMatch) {
                        for (const match of amountMatch) {
                            const num = parseInt(match.replace(/,/g, ''));
                            if (!isNaN(num) && num > 1000) {
                                amounts.push(num);
                            }
                        }
                    }
                }
            }
        }
        // 最大値を総額と仮定
        return amounts.length > 0 ? Math.max(...amounts) : null;
    }
    /**
     * DeepSeek用プロンプトの構築（簡潔版）
     */
    buildDeepSeekPrompt(documentType, ocrData) {
        const docTypeJa = {
            'invoice': '請求書',
            'supplier-quote': '見積書',
            'receipt': '領収書',
            'purchase-invoice': '仕入請求書'
        }[documentType] || '書類';
        return `Extract structured data from Japanese ${docTypeJa} OCR.

CRITICAL RULES:
1. 「御中」「様」 = customer (the recipient)
2. No honorific = vendor (the issuer)
3. Recognize company names like 合同会社アソウタイセイプリンティング, アソウタイセイプリンティング, アソウタイセイ
4. IMPORTANT: Rows in product table with text in name column but EMPTY quantity, unit price, AND amount are NOT products - these are remarks/notes
5. Only treat rows as products if they have at least ONE of: quantity, unit price, or amount
6. Extract content from 備考 columns as notes
7. For invoices (請求書), extract balance/carryover information:
   - 前回請求額 = previousBalance
   - 今回入金額 = currentPayment  
   - 繰越金額 = carryoverAmount
   - 今回売上高 = currentSales
   - 今回請求額 = currentInvoiceAmount
8. Extract bank transfer information (振込先) - IMPORTANT: Look for these patterns:
   - "振込先", "お振込先", "振込先情報", "銀行口座"
   - Bank names often end with "銀行", "信用金庫", "信用組合"
   - Branch names often end with "支店", "本店"
   - Account types: "普通", "当座", "普通預金", "当座預金"
   - Account numbers are typically 7 digits
   - Look in footer area, notes section, or separate box
   - Extract as:
     - 銀行名 = bankName (e.g., "三菱UFJ銀行")
     - 支店名 = branchName (e.g., "新宿支店")
     - 口座種別 = accountType (e.g., "普通")
     - 口座番号 = accountNumber (e.g., "1234567")
     - 口座名義 = accountName (e.g., "カ）アソウタイセイプリンティング")
     - Additional info = additionalInfo (e.g., "振込手数料はお客様負担")

Example:
- "CROP様分" with no quantity/price/amount → This is a REMARK, not a product
- "領収書（3枚複写・1冊50組）" with quantity=200, price=570, amount=114,000 → This is a PRODUCT
- Long specification text with no quantity/price/amount → This is a REMARK, not a product

OCR data:
${ocrData}

Return ONLY JSON:
\`\`\`json
{
  "documentNumber": "string",
  "issueDate": "YYYY-MM-DD",
  "subject": "string",
  "vendor": {
    "name": "vendor name (no 御中)",
    "address": "string",
    "phone": "string",
    "email": "string",
    "fax": "string"
  },
  "customer": {
    "name": "customer name (with 御中)",
    "address": "string"
  },
  "items": [{
    "itemName": "string",
    "description": "string",
    "quantity": 1,
    "unitPrice": 5000,
    "amount": 5000,
    "remarks": "string"
  }],
  "previousBalance": 25260,
  "currentPayment": 2250,
  "carryoverAmount": 23010,
  "currentSales": 107863,
  "currentInvoiceAmount": 130873,
  "subtotal": 5000,
  "taxAmount": 500,
  "totalAmount": 5500,
  "notes": "string (combined remarks/notes from non-product rows and 備考 column)",
  "deliveryLocation": "string",
  "paymentTerms": "string",
  "quotationValidity": "string",
  "bankTransferInfo": {
    "bankName": "銀行名",
    "branchName": "支店名",
    "accountType": "普通",
    "accountNumber": "1234567",
    "accountName": "口座名義",
    "additionalInfo": "振込手数料はお客様負担"
  }
}
\`\`\``;
    }
    /**
     * プロンプトの構築（Claude用・フォールバック用）
     */
    buildPrompt(documentType, ocrData) {
        const docTypeJa = {
            'invoice': '請求書',
            'supplier-quote': '見積書',
            'receipt': '領収書'
        }[documentType] || '書類';
        return `あなたは日本のビジネス文書処理の専門家です。以下のOCR結果から、${docTypeJa}の情報を正確に抽出し、構造化されたJSONで返してください。

## 📋 日本の見積書・請求書の基本理解

### 重要な判別ルール
1. **「御中」「様」**: 必ず顧客（宛先）を示す
2. **「御中」「様」なし**: 発行元（仕入先）を示す
3. **住所・電話番号**: 通常は発行元（仕入先）のもの

### 特殊な会社名パターン
- 「合同会社アソウタイセイプリンティング」
- 「アソウタイセイプリンティング」
- 「アソウタイセイ」
- 「ピアソラ」
これらは全て正しい会社名として認識すること

## 🔍 OCR結果の分析

${ocrData}

## 🎯 期待される出力

\`\`\`json
{
  "documentNumber": "見積書番号または請求書番号",
  "issueDate": "YYYY-MM-DD形式",
  "subject": "件名",
  "vendor": {
    "name": "仕入先名（御中がつかない方）",
    "address": "仕入先住所",
    "phone": "仕入先電話番号"
  },
  "customer": {
    "name": "顧客名（御中がつく方）",
    "address": "顧客住所"
  },
  "items": [
    {
      "itemName": "商品名",
      "quantity": 数量,
      "unitPrice": 単価,
      "amount": 金額
    }
  ],
  "subtotal": 小計,
  "taxAmount": 税額,
  "totalAmount": 総額
}
\`\`\`

正確な日本語の商習慣を理解して解析してください。`;
    }
}
exports.OCRAIOrchestrator = OCRAIOrchestrator;
