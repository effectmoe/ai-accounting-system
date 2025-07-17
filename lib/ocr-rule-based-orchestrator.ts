/**
 * ルールベースのOCRオーケストレータ
 * AIを使わずにルールベースで日本の請求書・見積書を解析
 */

export interface RuleBasedOrchestrationResult {
  success: boolean;
  data?: {
    subject?: string;
    vendor?: {
      name: string;
      address?: string;
      phone?: string;
    };
    customer?: {
      name: string;
    };
    items?: Array<{
      itemName: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
  errors?: string[];
}

export class OCRRuleBasedOrchestrator {
  /**
   * tablesデータから構造化データを抽出
   */
  static orchestrateFromTables(ocrResult: any): RuleBasedOrchestrationResult {
    const errors: string[] = [];
    const data: any = {};
    
    try {
      // 1. 基本フィールドから情報を抽出
      const fields = ocrResult.fields || {};
      
      // 件名の抽出（subjectフィールドを優先）
      data.subject = fields.subject || fields.Subject || '';
      
      // 仕入先と顧客の判別
      const vendorName = fields.vendorName || fields.VendorName || '';
      const customerName = fields.customerName || fields.CustomerName || '';
      const vendorAddressRecipient = fields.VendorAddressRecipient || '';
      
      // 「御中」で判別
      if (vendorAddressRecipient && vendorAddressRecipient.includes('御中')) {
        // VendorAddressRecipientに「御中」がある = これが顧客
        data.customer = { name: vendorAddressRecipient };
        data.vendor = {
          name: vendorName || '不明',
          address: fields.vendorAddress,
          phone: fields.vendorPhoneNumber || fields.vendorPhone
        };
      } else if (customerName && customerName.includes('御中')) {
        // customerNameに「御中」がある = 正しい
        data.customer = { name: customerName };
        data.vendor = {
          name: vendorName || vendorAddressRecipient || '不明',
          address: fields.vendorAddress,
          phone: fields.vendorPhoneNumber || fields.vendorPhone
        };
      } else if (vendorName && vendorName.includes('御中')) {
        // vendorNameに「御中」がある = 逆転している
        data.customer = { name: vendorName };
        data.vendor = {
          name: vendorAddressRecipient || customerName || '不明',
          address: fields.vendorAddress,
          phone: fields.vendorPhoneNumber || fields.vendorPhone
        };
      } else {
        // 「御中」がない場合のフォールバック
        data.vendor = {
          name: vendorName || vendorAddressRecipient || '不明',
          address: fields.vendorAddress,
          phone: fields.vendorPhoneNumber || fields.vendorPhone
        };
        data.customer = {
          name: customerName || '不明'
        };
      }
      
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
      
      // 4. 件名が商品テーブルから誤って取得されている場合の修正
      if (data.subject && data.items.length > 0) {
        // 件名が商品名と同じ場合、件名をクリア
        const firstItemName = data.items[0]?.itemName;
        if (firstItemName && data.subject.includes(firstItemName)) {
          console.log('[RuleBasedOrchestrator] 件名が商品名と混同されています。修正を試みます。');
          
          // pagesから「件名」というラベルを探す
          if (ocrResult.pages && ocrResult.pages.length > 0) {
            for (const page of ocrResult.pages) {
              if (page.lines) {
                for (let i = 0; i < page.lines.length; i++) {
                  const line = page.lines[i];
                  if (line.content && line.content.includes('件名')) {
                    // 次の行または同じ行の後半が実際の件名
                    if (i + 1 < page.lines.length) {
                      const nextLine = page.lines[i + 1].content;
                      if (nextLine && !nextLine.includes('件名')) {
                        data.subject = nextLine.trim();
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      return {
        success: true,
        data,
        errors
      };
      
    } catch (error) {
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
  private static extractItemsFromTable(table: any): any[] {
    const items: any[] = [];
    
    if (!table.cells || table.cells.length === 0) {
      return items;
    }
    
    // セルを行ごとにグループ化
    const rows: any[][] = [];
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
      if (!row || row.length === 0) continue;
      
      // 商品名候補を探す
      let productName = '';
      let quantity = 1;
      let unitPrice = 0;
      let amount = 0;
      
      // 各セルを確認
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        if (!cell || !cell.content) continue;
        
        const content = cell.content.trim();
        
        // 数値を抽出
        const numericValue = this.extractNumber(content);
        
        if (colIndex === 0 && !this.isNumericOnly(content)) {
          // 最初の列は通常商品名
          productName = content;
        } else if (numericValue > 0) {
          // 数値の大きさで判定
          if (numericValue >= 10000) {
            // 大きな値は金額
            if (amount === 0) amount = numericValue;
            else if (unitPrice === 0) unitPrice = numericValue;
          } else if (numericValue < 1000) {
            // 小さな値は数量
            quantity = numericValue;
          } else {
            // 中間の値は単価
            if (unitPrice === 0) unitPrice = numericValue;
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
  private static extractItemsFromPage(page: any): any[] {
    const items: any[] = [];
    
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
  private static extractNumber(text: string): number {
    if (!text) return 0;
    const cleaned = text.replace(/[,\\s円￥¥]/g, '');
    const parsed = parseInt(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  /**
   * 数値のみかチェック
   */
  private static isNumericOnly(text: string): boolean {
    return /^[\\d,\\.\\s円￥¥]+$/.test(text.trim());
  }
  
  /**
   * ヘッダーテキストかチェック
   */
  private static isHeaderText(text: string): boolean {
    const headers = ['品名', '商品名', '項目', '数量', '単価', '金額', '備考', '内容'];
    return headers.some(h => text.includes(h));
  }
}