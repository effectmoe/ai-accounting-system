"use strict";
/**
 * OCR結果から商品情報を抽出するユーティリティ
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRItemExtractor = void 0;
class OCRItemExtractor {
    /**
     * Azure Form Recognizerの結果から商品情報を抽出
     */
    static extractItemsFromOCR(ocrData) {
        const items = [];
        // 0. 最優先：tablesデータから抽出（構造化されたデータ）
        if (ocrData.tables && Array.isArray(ocrData.tables) && ocrData.tables.length > 0) {
            console.log('[OCRItemExtractor] tablesデータから商品情報を抽出します');
            const tableItems = this.extractItemsFromTables(ocrData.tables);
            if (tableItems.length > 0) {
                console.log(`[OCRItemExtractor] テーブルから${tableItems.length}個の商品を抽出しました`);
                return tableItems;
            }
        }
        // 1. 次にpagesデータから抽出（行ベースのデータ）
        if (ocrData.pages && Array.isArray(ocrData.pages) && ocrData.pages.length > 0) {
            console.log('[OCRItemExtractor] pagesデータから商品情報を抽出します');
            const pageItems = this.extractItemsFromPages(ocrData.pages);
            if (pageItems.length > 0) {
                console.log(`[OCRItemExtractor] ページから${pageItems.length}個の商品を抽出しました`);
                return pageItems;
            }
        }
        // 2. itemsフィールドから抽出を試みる
        if (ocrData.items && Array.isArray(ocrData.items) && ocrData.items.length > 0) {
            ocrData.items.forEach((item, index) => {
                const extractedItem = this.extractSingleItem(item, index);
                if (extractedItem) {
                    items.push(extractedItem);
                }
            });
        }
        // 3. itemsが空または不完全な場合、OCR全体から商品情報を探す
        if (items.length === 0 || items.every(item => this.isDefaultItemName(item.itemName))) {
            console.log('[OCRItemExtractor] itemsフィールドが不完全。OCR全体から商品情報を抽出します');
            // OCRデータ全体を文字列として検索
            const fullText = this.extractFullText(ocrData);
            const extractedItems = this.extractItemsFromFullText(fullText, ocrData);
            if (extractedItems.length > 0) {
                // 既存のデフォルト項目を置き換え
                if (items.length > 0) {
                    items.splice(0, items.length, ...extractedItems);
                }
                else {
                    items.push(...extractedItems);
                }
            }
        }
        return items;
    }
    /**
     * 単一の商品項目を抽出
     */
    static extractSingleItem(item, index) {
        // 商品名の抽出
        let itemName = this.extractItemName(item, index);
        // 数量の抽出
        const quantity = this.extractQuantity(item);
        // 単価の抽出
        const unitPrice = this.extractUnitPrice(item);
        // 金額の抽出
        let amount = this.extractAmount(item);
        // 金額が0で単価と数量がある場合は計算
        if (amount === 0 && unitPrice > 0 && quantity > 0) {
            amount = unitPrice * quantity;
        }
        // 単価が0で金額と数量がある場合は逆算
        let finalUnitPrice = unitPrice;
        if (unitPrice === 0 && amount > 0 && quantity > 0) {
            finalUnitPrice = Math.round(amount / quantity);
        }
        return {
            itemName,
            description: itemName,
            quantity,
            unitPrice: finalUnitPrice,
            amount,
            taxRate: 10,
            taxAmount: Math.round(amount * 0.1)
        };
    }
    /**
     * 商品名を抽出
     */
    static extractItemName(item, index) {
        // 様々なフィールドから商品名を探す
        const possibleFields = [
            item?.description,
            item?.name,
            item?.itemName,
            item?.productName,
            item?.Description,
            item?.Name,
            item?.ItemName,
            item?.ProductName,
            item?.description?.content,
            item?.name?.content,
            item?.Description?.content,
            item?.Name?.content
        ];
        for (const field of possibleFields) {
            if (field && typeof field === 'string' && field.trim()) {
                return field.trim();
            }
        }
        return `商品${index + 1}`;
    }
    /**
     * 数量を抽出
     */
    static extractQuantity(item) {
        const possibleFields = [
            item?.quantity,
            item?.Quantity,
            item?.qty,
            item?.Qty,
            item?.quantity?.value,
            item?.Quantity?.value
        ];
        for (const field of possibleFields) {
            const value = this.parseNumber(field);
            if (value > 0)
                return value;
        }
        return 1; // デフォルト
    }
    /**
     * 単価を抽出
     */
    static extractUnitPrice(item) {
        const possibleFields = [
            item?.unitPrice,
            item?.UnitPrice,
            item?.price,
            item?.Price,
            item?.unitPrice?.value,
            item?.UnitPrice?.value,
            item?.price?.value,
            item?.Price?.value
        ];
        for (const field of possibleFields) {
            const value = this.parseNumber(field);
            if (value > 0)
                return value;
        }
        return 0;
    }
    /**
     * 金額を抽出
     */
    static extractAmount(item) {
        const possibleFields = [
            item?.amount,
            item?.Amount,
            item?.totalPrice,
            item?.TotalPrice,
            item?.total,
            item?.Total,
            item?.amount?.value,
            item?.Amount?.value,
            item?.totalPrice?.value,
            item?.TotalPrice?.value
        ];
        for (const field of possibleFields) {
            const value = this.parseNumber(field);
            if (value > 0)
                return value;
        }
        return 0;
    }
    /**
     * 数値をパース
     */
    static parseNumber(value) {
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[,\\s円￥¥]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }
    /**
     * デフォルトの商品名かどうかチェック
     */
    static isDefaultItemName(name) {
        return /^商品\\d*$/.test(name) ||
            name.includes('デフォルト') ||
            name === '抽出商品' ||
            name.length < 3;
    }
    /**
     * テーブルデータから商品情報を抽出
     */
    static extractItemsFromTables(tables) {
        const items = [];
        const remarks = []; // 備考行を収集
        for (const table of tables) {
            console.log(`[OCRItemExtractor] テーブル: ${table.rowCount}行 x ${table.columnCount}列`);
            // テーブルのヘッダー行をスキップして、データ行を処理
            const rows = this.groupCellsByRow(table.cells);
            for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                if (!row || row.length === 0)
                    continue;
                // 最初の列が商品名の可能性が高い
                const productName = row[0]?.content || '';
                // 空行またはヘッダー行をスキップ
                if (!productName || this.isHeaderOrEmptyRow(productName))
                    continue;
                // 数量、単価、金額を探す
                let quantity = 0;
                let unitPrice = 0;
                let amount = 0;
                let hasNumericData = false;
                // 各セルから数値を抽出
                for (let colIndex = 1; colIndex < row.length; colIndex++) {
                    const cellContent = row[colIndex]?.content || '';
                    const numericValue = this.parseNumber(cellContent);
                    if (numericValue > 0) {
                        hasNumericData = true;
                        // 金額の大きさで判定
                        if (numericValue >= 10000) {
                            // 大きな値は金額の可能性が高い
                            if (amount === 0)
                                amount = numericValue;
                            else if (unitPrice === 0)
                                unitPrice = numericValue;
                        }
                        else if (numericValue < 100) {
                            // 小さな値は数量の可能性が高い
                            quantity = numericValue;
                        }
                        else {
                            // 中間の値は単価の可能性
                            if (unitPrice === 0)
                                unitPrice = numericValue;
                        }
                    }
                }
                // 重要: 数量、単価、金額が全て0または未設定の場合は備考として扱う
                if (!hasNumericData || (quantity === 0 && unitPrice === 0 && amount === 0)) {
                    console.log(`[OCRItemExtractor] 備考として認識: "${productName}"`);
                    remarks.push(productName);
                    continue;
                }
                // デフォルト数量を1に設定（数値データがある場合のみ）
                if (quantity === 0 && hasNumericData) {
                    quantity = 1;
                }
                // 金額が設定されていない場合は計算
                if (amount === 0 && unitPrice > 0) {
                    amount = unitPrice * quantity;
                }
                // 有効な商品情報の場合のみ追加
                if (productName && !this.isDefaultItemName(productName) && (amount > 0 || unitPrice > 0)) {
                    items.push({
                        itemName: productName,
                        description: '',
                        quantity: quantity,
                        unitPrice: unitPrice || amount,
                        amount: amount || unitPrice,
                        taxRate: 10,
                        taxAmount: Math.floor((amount || unitPrice) * 0.1),
                        remarks: ''
                    });
                    console.log(`[OCRItemExtractor] テーブルから商品抽出: ${productName}, 数量: ${quantity}, 単価: ${unitPrice}, 金額: ${amount}`);
                }
            }
        }
        // 備考をnotesとして結合
        if (remarks.length > 0 && items.length > 0) {
            const combinedRemarks = remarks.join('\n');
            // 最後の商品に備考を追加
            items[items.length - 1].remarks = combinedRemarks;
            console.log(`[OCRItemExtractor] 備考を追加: ${combinedRemarks}`);
        }
        return items;
    }
    /**
     * セルを行ごとにグループ化
     */
    static groupCellsByRow(cells) {
        if (!cells || cells.length === 0)
            return [];
        const rows = [];
        for (const cell of cells) {
            const rowIndex = cell.rowIndex || 0;
            if (!rows[rowIndex])
                rows[rowIndex] = [];
            rows[rowIndex][cell.columnIndex || 0] = cell;
        }
        return rows;
    }
    /**
     * ヘッダー行または空行かどうかチェック
     */
    static isHeaderOrEmptyRow(text) {
        const headerKeywords = ['品名', '商品名', '項目', '内容', '摘要', '品目', 'Item', 'Description'];
        return headerKeywords.some(keyword => text.includes(keyword)) || text.trim().length === 0;
    }
    /**
     * ページデータから商品情報を抽出（行ベース）
     */
    static extractItemsFromPages(pages) {
        const items = [];
        for (const page of pages) {
            if (!page.lines || page.lines.length === 0)
                continue;
            console.log(`[OCRItemExtractor] ページの行数: ${page.lines.length}`);
            for (let i = 0; i < page.lines.length; i++) {
                const line = page.lines[i];
                const content = line.content || '';
                // 金額パターンを含む行を探す
                const amountMatch = content.match(/([\\d,]+)\\s*円|¥\\s*([\\d,]+)|([\\d,]+)\\s*$/);
                if (amountMatch) {
                    const amountStr = amountMatch[1] || amountMatch[2] || amountMatch[3];
                    const amount = this.parseNumber(amountStr);
                    if (amount > 1000) { // 1000円以上を商品として認識
                        // 同じ行または前の行から商品名を探す
                        let productName = '';
                        // 同じ行の金額より前の部分
                        const beforeAmount = content.substring(0, content.indexOf(amountMatch[0])).trim();
                        if (beforeAmount && !this.isNumericOnly(beforeAmount)) {
                            productName = beforeAmount;
                        }
                        // 商品名が見つからない場合は前の行を確認
                        if (!productName && i > 0) {
                            const prevLine = page.lines[i - 1].content || '';
                            if (!this.isNumericOnly(prevLine) && !this.isHeaderOrEmptyRow(prevLine)) {
                                productName = prevLine.trim();
                            }
                        }
                        if (productName && !this.isDefaultItemName(productName)) {
                            items.push({
                                itemName: productName,
                                description: '',
                                quantity: 1,
                                unitPrice: amount,
                                amount: amount,
                                taxRate: 10,
                                taxAmount: Math.floor(amount * 0.1)
                            });
                            console.log(`[OCRItemExtractor] ページから商品抽出: ${productName}, 金額: ${amount}`);
                        }
                    }
                }
            }
        }
        return items;
    }
    /**
     * 数値のみかどうかチェック
     */
    static isNumericOnly(text) {
        return /^[\\d,\\.\\s]+$/.test(text.trim());
    }
    /**
     * OCRデータから全テキストを抽出
     */
    static extractFullText(ocrData) {
        // OCRデータを再帰的に探索してテキストを抽出
        const texts = [];
        const processedKeys = new Set();
        const extract = (obj, path = '') => {
            if (!obj)
                return;
            if (typeof obj === 'string') {
                texts.push(obj);
            }
            else if (Array.isArray(obj)) {
                obj.forEach((item, index) => extract(item, `${path}[${index}]`));
            }
            else if (typeof obj === 'object') {
                // content, value, textなどのフィールドを優先的にチェック
                if (obj.content)
                    texts.push(String(obj.content));
                if (obj.value)
                    texts.push(String(obj.value));
                if (obj.text)
                    texts.push(String(obj.text));
                // 特定のフィールドから直接テキストを取得
                const importantFields = ['Description', 'description', 'ItemDescription', 'itemDescription',
                    'ProductName', 'productName', 'ItemName', 'itemName'];
                for (const field of importantFields) {
                    if (obj[field] && !processedKeys.has(`${path}.${field}`)) {
                        processedKeys.add(`${path}.${field}`);
                        if (typeof obj[field] === 'string') {
                            texts.push(obj[field]);
                            console.log(`[OCRItemExtractor] 重要フィールド発見 ${field}:`, obj[field]);
                        }
                        else if (obj[field]?.content || obj[field]?.value) {
                            const value = obj[field].content || obj[field].value;
                            texts.push(String(value));
                            console.log(`[OCRItemExtractor] 重要フィールド発見 ${field}:`, value);
                        }
                    }
                }
                // その他のフィールドも探索
                Object.entries(obj).forEach(([key, value]) => {
                    if (!['content', 'value', 'text'].includes(key) && !processedKeys.has(`${path}.${key}`)) {
                        extract(value, path ? `${path}.${key}` : key);
                    }
                });
            }
        };
        extract(ocrData);
        const fullText = texts.join(' ');
        console.log('[OCRItemExtractor] 抽出されたテキスト総数:', texts.length);
        return fullText;
    }
    /**
     * フルテキストから商品情報を抽出
     */
    static extractItemsFromFullText(fullText, ocrData) {
        const items = [];
        console.log('[OCRItemExtractor] フルテキスト:', fullText);
        console.log('[OCRItemExtractor] OCRデータ構造:', JSON.stringify(ocrData, null, 2));
        // 商品名パターン（より具体的なパターンを追加）
        const productPatterns = [
            /【([^】]+)】[^【]*(?:用紙[:：])?([^\\n\\r,，、。]+)/g, // 【】で囲まれた商品名とその後の詳細
            /商品名[:：\\s]*([^\\n\\r,，、。]+)/g, // 「商品名:」の後
            /品名[:：\\s]*([^\\n\\r,，、。]+)/g, // 「品名:」の後
            /用紙[:：\\s]*([^\\n\\r,，、。]+)/g, // 「用紙:」の後
            /印刷[^\\n\\r,，、。]*[窓|セロ|特白][^\\n\\r,，、。]*/g, // 印刷関連キーワード
            /【既製品印刷加工】[^【\\n\\r]*/g, // 既製品印刷加工を含む行全体
        ];
        let bestMatch = '';
        let bestMatchLength = 0;
        // 最も長い一致を見つける
        for (const pattern of productPatterns) {
            const matches = fullText.match(pattern);
            console.log(`[OCRItemExtractor] パターン ${pattern} の結果:`, matches);
            if (matches) {
                for (const match of matches) {
                    const cleaned = match.replace(/[【】]/g, '').trim();
                    if (cleaned.length > bestMatchLength && cleaned.length > 5) {
                        bestMatch = cleaned;
                        bestMatchLength = cleaned.length;
                        console.log(`[OCRItemExtractor] より良い商品名を発見: "${bestMatch}" (長さ: ${bestMatchLength})`);
                    }
                }
            }
        }
        // 数量パターン
        const quantityMatch = fullText.match(/(\\d{1,3}(?:,\\d{3})*)\\s*(?:枚|個|本|台|セット|部|冊)/);
        const quantity = quantityMatch ?
            parseInt(quantityMatch[1].replace(/,/g, '')) :
            1;
        // 単価パターン（改善版）
        const unitPricePatterns = [
            /単価[:：\\s]*[¥￥]?\\s*(\\d+(?:\\.\\d+)?)/,
            /@\\s*[¥￥]?\\s*(\\d+(?:\\.\\d+)?)/, // @記号の後の価格
            /[¥￥]\\s*(\\d+(?:\\.\\d+)?)\\s*[／/]\\s*(?:枚|個|本|台|セット|部|冊)/ // ¥11.20/枚 のようなパターン
        ];
        let unitPrice = 0;
        for (const pattern of unitPricePatterns) {
            const match = fullText.match(pattern);
            if (match) {
                unitPrice = parseFloat(match[1]);
                break;
            }
        }
        // 金額の抽出（総額から推定）
        const totalAmount = this.extractTotalAmount(ocrData);
        const taxAmount = this.extractTaxAmount(ocrData);
        const subtotal = totalAmount - taxAmount;
        // 商品情報を構築
        if (bestMatch || quantity > 1 || unitPrice > 0) {
            let amount = subtotal; // デフォルトは小計
            // 単価と数量から金額を計算
            if (unitPrice > 0 && quantity > 0) {
                amount = unitPrice * quantity;
            }
            // 単価がない場合は逆算
            else if (amount > 0 && quantity > 0) {
                unitPrice = Math.round(amount / quantity * 100) / 100;
            }
            items.push({
                itemName: bestMatch || '抽出商品',
                description: bestMatch || '',
                quantity,
                unitPrice,
                amount,
                taxRate: 10,
                taxAmount: Math.round(amount * 0.1)
            });
        }
        return items;
    }
    /**
     * 総額を抽出
     */
    static extractTotalAmount(ocrData) {
        const possibleFields = [
            ocrData?.InvoiceTotal,
            ocrData?.totalAmount,
            ocrData?.total,
            ocrData?.Total,
            ocrData?.TotalAmount,
            ocrData?.Amount,
            ocrData?.customFields?.InvoiceTotal
        ];
        for (const field of possibleFields) {
            const value = this.parseNumber(field);
            if (value > 0)
                return value;
        }
        return 0;
    }
    /**
     * 税額を抽出
     */
    static extractTaxAmount(ocrData) {
        const possibleFields = [
            ocrData?.taxAmount,
            ocrData?.tax,
            ocrData?.Tax,
            ocrData?.TotalTax,
            ocrData?.customFields?.Tax
        ];
        for (const field of possibleFields) {
            const value = this.parseNumber(field);
            if (value > 0)
                return value;
        }
        return 0;
    }
}
exports.OCRItemExtractor = OCRItemExtractor;
