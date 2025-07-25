"use strict";
/**
 * ルールベースのOCRオーケストレータ
 * AIを使わずにルールベースで日本の請求書・見積書を解析
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRRuleBasedOrchestrator = void 0;
class OCRRuleBasedOrchestrator {
    /**
     * tablesデータから構造化データを抽出
     */
    static orchestrateFromTables(ocrResult) {
        const errors = [];
        const data = {};
        try {
            console.log('[RuleBasedOrchestrator] === オーケストレータ開始 ===');
            // デバッグ: 受信したOCRデータの構造を確認
            console.log('[RuleBasedOrchestrator] 受信したOCRデータ:', {
                hasFields: !!ocrResult.fields,
                hasTables: !!ocrResult.tables,
                hasPages: !!ocrResult.pages,
                fieldsKeys: ocrResult.fields ? Object.keys(ocrResult.fields) : [],
                tablesLength: ocrResult.tables?.length || 0,
                pagesLength: ocrResult.pages?.length || 0
            });
            // 入力データの検証
            if (!ocrResult) {
                const error = 'OCR結果が未定義です';
                console.error('[RuleBasedOrchestrator] ' + error);
                return { success: false, errors: [error] };
            }
            if (!ocrResult.fields && !ocrResult.tables && !ocrResult.pages) {
                const error = 'OCR結果にfields、tables、pagesのいずれも含まれていません';
                console.error('[RuleBasedOrchestrator] ' + error);
                return { success: false, errors: [error] };
            }
            // 1. 基本フィールドから情報を抽出
            const fields = ocrResult.fields || {};
            // デバッグ: フィールドの内容を確認
            console.log('[RuleBasedOrchestrator] fieldsの内容:', {
                vendorName: fields.vendorName,
                VendorName: fields.VendorName,
                vendorAddress: fields.vendorAddress,
                VendorAddress: fields.VendorAddress,
                vendorAddressRecipient: fields.VendorAddressRecipient,
                customerName: fields.customerName,
                CustomerName: fields.CustomerName,
                subject: fields.subject,
                Subject: fields.Subject
            });
            // 件名の抽出（subjectフィールドを優先）
            data.subject = fields.subject || fields.Subject || '';
            // 仕入先と顧客の判別（日本の見積書レイアウトに基づく）
            const vendorName = fields.vendorName || fields.VendorName || '';
            const customerName = fields.customerName || fields.CustomerName || '';
            const vendorAddressRecipient = fields.VendorAddressRecipient || '';
            const remittanceAddressRecipient = fields.RemittanceAddressRecipient || '';
            // デバッグ: 御中判定前の状態
            console.log('[RuleBasedOrchestrator] 御中判定前:', {
                vendorName,
                customerName,
                vendorAddressRecipient,
                remittanceAddressRecipient
            });
            // 日本のビジネス文書レイアウト判定ロジック
            // 基本方針：OCRテキストから正しい位置に情報を配置
            console.log('[RuleBasedOrchestrator] 会社名・顧客名の判定を開始');
            let identifiedCustomer = null;
            let identifiedVendor = null;
            // まず全フィールドから会社名を収集
            const allFields = [vendorName, customerName, vendorAddressRecipient, remittanceAddressRecipient];
            const allFieldValues = allFields.filter(field => field && field.trim());
            console.log('[RuleBasedOrchestrator] 全フィールド値:', allFieldValues);
            // 1. 「御中」で判別（確実な判定）
            for (const fieldValue of allFieldValues) {
                if (fieldValue.includes('御中')) {
                    identifiedCustomer = fieldValue;
                    console.log('[RuleBasedOrchestrator] 「御中」で顧客を特定:', fieldValue);
                    break;
                }
            }
            // 2. 残りの会社名から仕入先を特定
            if (identifiedCustomer) {
                // 顧客が特定できた場合、残りから仕入先を探す
                for (const fieldValue of allFieldValues) {
                    if (fieldValue !== identifiedCustomer && this.isCompanyName(fieldValue)) {
                        identifiedVendor = fieldValue;
                        console.log('[RuleBasedOrchestrator] 残りから仕入先を特定:', fieldValue);
                        break;
                    }
                }
            }
            else {
                // 「御中」がない場合：会社形態を持つものを仕入先として優先
                for (const fieldValue of allFieldValues) {
                    if (this.isCompanyName(fieldValue)) {
                        identifiedVendor = fieldValue;
                        console.log('[RuleBasedOrchestrator] 会社形態で仕入先を特定:', fieldValue);
                        break;
                    }
                }
                // 顧客は残りから選択
                for (const fieldValue of allFieldValues) {
                    if (fieldValue !== identifiedVendor) {
                        identifiedCustomer = fieldValue;
                        console.log('[RuleBasedOrchestrator] 残りから顧客を特定:', fieldValue);
                        break;
                    }
                }
            }
            // 3. データ構造を設定
            data.customer = {
                name: identifiedCustomer || customerName || '不明'
            };
            data.vendor = {
                name: identifiedVendor || vendorName || '不明',
                address: fields.vendorAddress || fields.VendorAddress,
                phone: fields.vendorPhoneNumber || fields.vendorPhone
            };
            console.log('[RuleBasedOrchestrator] 判定完了:', {
                customer: data.customer.name,
                vendor: data.vendor.name
            });
            // 2. テーブルから商品情報を抽出
            data.items = [];
            if (ocrResult.tables && ocrResult.tables.length > 0) {
                console.log('[RuleBasedOrchestrator] テーブルから商品を抽出');
                for (const table of ocrResult.tables) {
                    const items = this.extractItemsFromTable(table);
                    data.items.push(...items);
                }
            }
            // 3. pagesデータから商品情報を補完
            if (data.items.length === 0 && ocrResult.pages && ocrResult.pages.length > 0) {
                console.log('[RuleBasedOrchestrator] ページから商品を抽出');
                for (const page of ocrResult.pages) {
                    const items = this.extractItemsFromPage(page);
                    data.items.push(...items);
                }
            }
            // 4. pagesデータから仕入先情報を補完（日本の見積書は右側が発行元）
            if ((!data.vendor || data.vendor.name === '不明') && ocrResult.pages && ocrResult.pages.length > 0) {
                console.log('[RuleBasedOrchestrator] pagesから仕入先情報を探索');
                // 右側にある会社名を優先的に収集
                const rightSideCompanies = [];
                const allCompanies = [];
                for (const page of ocrResult.pages) {
                    if (page.lines) {
                        for (const line of page.lines) {
                            if (line.content) {
                                const content = line.content.trim();
                                // 会社名パターン（株式会社、有限会社、合同会社など）
                                const companyPatterns = [
                                    /株式会社.*/,
                                    /有限会社.*/,
                                    /合同会社.*/,
                                    /.*株式会社/,
                                    /.*有限会社/,
                                    /.*合同会社/,
                                    /.*Corporation/,
                                    /.*Corp/,
                                    /.*LLC/,
                                    /.*Inc/,
                                    /.*\(株\)/,
                                    /.*\(有\)/,
                                    // 特定の会社名パターン
                                    /アソウタイセイプリンティング/,
                                    /アソウタイセイ/,
                                    /ピアソラ/
                                ];
                                let isCompanyName = false;
                                for (const pattern of companyPatterns) {
                                    if (pattern.test(content) && !content.includes('御中')) {
                                        isCompanyName = true;
                                        break;
                                    }
                                }
                                if (isCompanyName) {
                                    const companyInfo = { content, boundingBox: line.boundingBox };
                                    allCompanies.push(companyInfo);
                                    console.log('[RuleBasedOrchestrator] 会社名候補を発見:', content);
                                    // boundingBoxがある場合、X座標で右側判定（ページ幅の50%以上）
                                    if (line.boundingBox && line.boundingBox.length > 0) {
                                        // Azure Form RecognizerのboundingBoxは配列形式：[x1, y1, x2, y2, x3, y3, x4, y4]
                                        // または {x, y} オブジェクトの配列の場合もある
                                        let xPosition = 0;
                                        if (typeof line.boundingBox[0] === 'number') {
                                            // 数値配列の場合：[x1, y1, x2, y2, ...]
                                            xPosition = line.boundingBox[0];
                                        }
                                        else if (line.boundingBox[0] && typeof line.boundingBox[0] === 'object' && line.boundingBox[0].x !== undefined) {
                                            // オブジェクト配列の場合：[{x, y}, {x, y}, ...]
                                            xPosition = line.boundingBox[0].x;
                                        }
                                        console.log('[RuleBasedOrchestrator] boundingBox情報:', {
                                            content: content,
                                            boundingBox: line.boundingBox,
                                            xPosition: xPosition,
                                            pageWidth: page.width
                                        });
                                        // ページ幅の情報を取得（Azure Form Recognizerはポイント単位）
                                        const pageWidth = page.width || 612; // A4の幅（ポイント）
                                        // 右側判定（ページ幅の50%以上）
                                        if (xPosition > pageWidth * 0.5) {
                                            rightSideCompanies.push(companyInfo);
                                            console.log('[RuleBasedOrchestrator] 右側の会社名を発見:', content, 'at x:', xPosition);
                                        }
                                        else {
                                            console.log('[RuleBasedOrchestrator] 左側の会社名:', content, 'at x:', xPosition);
                                        }
                                    }
                                    else {
                                        console.log('[RuleBasedOrchestrator] boundingBox情報なし:', content);
                                    }
                                }
                            }
                        }
                    }
                }
                // 右側の会社名を優先、なければ全体から選択
                const selectedCompany = rightSideCompanies.length > 0 ? rightSideCompanies[0] : allCompanies[0];
                if (selectedCompany) {
                    data.vendor = data.vendor || {};
                    data.vendor.name = selectedCompany.content;
                    console.log('[RuleBasedOrchestrator] 仕入先名を決定:', selectedCompany.content);
                }
                // 住所と電話番号の抽出（元のロジック）
                for (const page of ocrResult.pages) {
                    if (page.lines) {
                        for (const line of page.lines) {
                            if (line.content) {
                                const content = line.content.trim();
                                // 住所パターン（都道府県を含む）
                                if ((content.includes('県') || content.includes('都') || content.includes('府') ||
                                    content.includes('市') || content.includes('区')) &&
                                    !content.includes('御中') && !data.vendor?.address) {
                                    data.vendor = data.vendor || {};
                                    data.vendor.address = content;
                                    console.log('[RuleBasedOrchestrator] pagesから住所を抽出:', content);
                                }
                                // 電話番号パターン
                                const phoneMatch = content.match(/\d{2,4}-\d{2,4}-\d{3,4}/);
                                if (phoneMatch && !data.vendor?.phone) {
                                    data.vendor = data.vendor || {};
                                    data.vendor.phone = phoneMatch[0];
                                    console.log('[RuleBasedOrchestrator] pagesから電話番号を抽出:', phoneMatch[0]);
                                }
                            }
                        }
                    }
                }
            }
            // 5. 件名を正しく抽出（pagesデータから「件名」ラベルを探す）
            if (ocrResult.pages && ocrResult.pages.length > 0) {
                console.log('[RuleBasedOrchestrator] pagesから件名を探索');
                for (const page of ocrResult.pages) {
                    if (page.lines) {
                        for (let i = 0; i < page.lines.length; i++) {
                            const line = page.lines[i];
                            if (line.content && line.content.includes('件名')) {
                                console.log('[RuleBasedOrchestrator] 「件名」ラベルを発見:', line.content);
                                // 同じ行の「件名」の後の部分を確認
                                const sameLineMatch = line.content.match(/件名[:\s：]*(.+)/);
                                if (sameLineMatch && sameLineMatch[1].trim()) {
                                    data.subject = sameLineMatch[1].trim();
                                    console.log('[RuleBasedOrchestrator] 同じ行から件名を抽出:', data.subject);
                                    break;
                                }
                                // 次の行が実際の件名
                                if (i + 1 < page.lines.length) {
                                    const nextLine = page.lines[i + 1].content;
                                    if (nextLine && !nextLine.includes('件名')) {
                                        data.subject = nextLine.trim();
                                        console.log('[RuleBasedOrchestrator] 次の行から件名を抽出:', data.subject);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // 6. 件名が「CROP様分」のような顧客向けテキストの場合は修正
            if (data.subject && data.subject.includes('様分')) {
                console.log('[RuleBasedOrchestrator] 件名が顧客向けテキストになっています。正しい件名を再検索。');
                data.subject = ''; // 一旦クリアして、正しい件名がない場合は空にする
            }
            // 結果の検証
            let hasValidData = false;
            // 最低限の情報が抽出されているかチェック
            if (data.vendor && data.vendor.name && data.vendor.name !== '不明') {
                hasValidData = true;
            }
            if (data.customer && data.customer.name && data.customer.name !== '不明') {
                hasValidData = true;
            }
            if (data.subject && data.subject.trim() !== '') {
                hasValidData = true;
            }
            if (data.items && data.items.length > 0) {
                hasValidData = true;
            }
            console.log('[RuleBasedOrchestrator] 最終結果:', {
                hasValidData,
                vendorName: data.vendor?.name || 'none',
                customerName: data.customer?.name || 'none',
                subject: data.subject || 'none',
                itemsCount: data.items?.length || 0,
                errors: errors.length
            });
            console.log('[RuleBasedOrchestrator] === オーケストレータ完了 ===');
            return {
                success: hasValidData,
                data: hasValidData ? data : undefined,
                errors: errors.length > 0 ? errors : undefined
            };
        }
        catch (error) {
            console.error('[RuleBasedOrchestrator] エラー:', error);
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    /**
     * テーブルから商品情報を抽出
     */
    static extractItemsFromTable(table) {
        const items = [];
        if (!table.cells || table.cells.length === 0) {
            return items;
        }
        // セルを行ごとにグループ化
        const rows = [];
        for (const cell of table.cells) {
            const rowIndex = cell.rowIndex || 0;
            const colIndex = cell.columnIndex || 0;
            if (!rows[rowIndex]) {
                rows[rowIndex] = [];
            }
            rows[rowIndex][colIndex] = cell;
        }
        // ヘッダー行をスキップして処理
        for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            if (!row || row.length === 0)
                continue;
            // 商品名候補を探す
            let productName = '';
            let quantity = 1;
            let unitPrice = 0;
            let amount = 0;
            // 各セルを確認
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const cell = row[colIndex];
                if (!cell || !cell.content)
                    continue;
                const content = cell.content.trim();
                // 数値を抽出
                const numericValue = this.extractNumber(content);
                if (colIndex === 0 && !this.isNumericOnly(content)) {
                    // 最初の列は通常商品名
                    productName = content;
                }
                else if (numericValue > 0) {
                    // 数値の大きさで判定
                    if (numericValue >= 10000) {
                        // 大きな値は金額
                        if (amount === 0)
                            amount = numericValue;
                        else if (unitPrice === 0)
                            unitPrice = numericValue;
                    }
                    else if (numericValue < 1000) {
                        // 小さな値は数量
                        quantity = numericValue;
                    }
                    else {
                        // 中間の値は単価
                        if (unitPrice === 0)
                            unitPrice = numericValue;
                    }
                }
            }
            // 有効な商品情報の場合のみ追加
            if (productName && !this.isHeaderText(productName) && (amount > 0 || unitPrice > 0)) {
                items.push({
                    itemName: productName,
                    quantity: quantity,
                    unitPrice: unitPrice || amount,
                    amount: amount || (unitPrice * quantity)
                });
                console.log(`[RuleBasedOrchestrator] 商品抽出: ${productName}, 数量: ${quantity}, 単価: ${unitPrice}, 金額: ${amount}`);
            }
        }
        return items;
    }
    /**
     * ページから商品情報を抽出
     */
    static extractItemsFromPage(page) {
        const items = [];
        if (!page.lines || page.lines.length === 0) {
            return items;
        }
        for (let i = 0; i < page.lines.length; i++) {
            const line = page.lines[i];
            const content = line.content || '';
            // 金額を含む行を探す
            const amountMatch = content.match(/([\\d,]+)\\s*円|¥\\s*([\\d,]+)|([\\d,]+)\\s*$/);
            if (amountMatch) {
                const amountStr = amountMatch[1] || amountMatch[2] || amountMatch[3];
                const amount = this.extractNumber(amountStr);
                if (amount > 1000) {
                    // 商品名を探す
                    let productName = '';
                    // 同じ行の金額より前の部分
                    const beforeAmount = content.substring(0, content.indexOf(amountMatch[0])).trim();
                    if (beforeAmount && !this.isNumericOnly(beforeAmount)) {
                        productName = beforeAmount;
                    }
                    // 商品名が見つからない場合は前の行を確認
                    if (!productName && i > 0) {
                        const prevLine = page.lines[i - 1].content || '';
                        if (!this.isNumericOnly(prevLine) && !this.isHeaderText(prevLine)) {
                            productName = prevLine.trim();
                        }
                    }
                    if (productName) {
                        items.push({
                            itemName: productName,
                            quantity: 1,
                            unitPrice: amount,
                            amount: amount
                        });
                    }
                }
            }
        }
        return items;
    }
    /**
     * 数値を抽出
     */
    static extractNumber(text) {
        if (!text)
            return 0;
        const cleaned = text.replace(/[,\\s円￥¥]/g, '');
        const parsed = parseInt(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    /**
     * 数値のみかチェック
     */
    static isNumericOnly(text) {
        return /^[\\d,\\.\\s円￥¥]+$/.test(text.trim());
    }
    /**
     * ヘッダーテキストかチェック
     */
    static isHeaderText(text) {
        const headers = ['品名', '商品名', '項目', '数量', '単価', '金額', '備考', '内容'];
        return headers.some(h => text.includes(h));
    }
    /**
     * 会社名かどうかを判定
     */
    static isCompanyName(text) {
        if (!text || text.trim() === '')
            return false;
        // 会社形態のパターン
        const companyPatterns = [
            /株式会社/,
            /有限会社/,
            /合同会社/,
            /一般社団法人/,
            /一般財団法人/,
            /公益社団法人/,
            /公益財団法人/,
            /特定非営利活動法人/,
            /NPO法人/,
            /Corporation/,
            /Corp/,
            /LLC/,
            /Inc/,
            /\(株\)/,
            /\(有\)/,
            /\(合\)/
        ];
        // いずれかのパターンにマッチし、「御中」を含まない場合
        return companyPatterns.some(pattern => pattern.test(text)) && !text.includes('御中');
    }
}
exports.OCRRuleBasedOrchestrator = OCRRuleBasedOrchestrator;
