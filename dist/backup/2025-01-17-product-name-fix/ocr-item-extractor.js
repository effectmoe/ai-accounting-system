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
        // 1. まずitemsフィールドから抽出を試みる
        if (ocrData.items && Array.isArray(ocrData.items) && ocrData.items.length > 0) {
            ocrData.items.forEach((item, index) => {
                const extractedItem = this.extractSingleItem(item, index);
                if (extractedItem) {
                    items.push(extractedItem);
                }
            });
        }
        // 2. itemsが空または不完全な場合、OCR全体から商品情報を探す
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
        return /^商品\\d+$/.test(name) ||
            name.includes('デフォルト') ||
            name === '抽出商品' ||
            name.length < 3;
    }
    /**
     * OCRデータから全テキストを抽出
     */
    static extractFullText(ocrData) {
        // OCRデータを再帰的に探索してテキストを抽出
        const texts = [];
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
                // その他のフィールドも探索
                Object.entries(obj).forEach(([key, value]) => {
                    if (!['content', 'value', 'text'].includes(key)) {
                        extract(value, path ? `${path}.${key}` : key);
                    }
                });
            }
        };
        extract(ocrData);
        return texts.join(' ');
    }
    /**
     * フルテキストから商品情報を抽出
     */
    static extractItemsFromFullText(fullText, ocrData) {
        const items = [];
        // 商品名パターン（より具体的なパターンを追加）
        const productPatterns = [
            /【([^】]+)】([^\\n\\r,，、。]+)/g, // 【】で囲まれた商品名とその後の詳細
            /商品名[:：\\s]*([^\\n\\r,，、。]+)/g, // 「商品名:」の後
            /品名[:：\\s]*([^\\n\\r,，、。]+)/g, // 「品名:」の後
            /用紙[:：\\s]*([^\\n\\r,，、。]+)/g, // 「用紙:」の後
            /印刷[^\\n\\r,，、。]*[窓|セロ|特白][^\\n\\r,，、。]*/g, // 印刷関連キーワード
        ];
        let bestMatch = '';
        let bestMatchLength = 0;
        // 最も長い一致を見つける
        for (const pattern of productPatterns) {
            const matches = fullText.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const cleaned = match.replace(/[【】]/g, '').trim();
                    if (cleaned.length > bestMatchLength && cleaned.length > 5) {
                        bestMatch = cleaned;
                        bestMatchLength = cleaned.length;
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
