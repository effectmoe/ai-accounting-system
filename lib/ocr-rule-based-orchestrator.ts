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
      // デバッグ: 受信したOCRデータの構造を確認
      console.log('[RuleBasedOrchestrator] 受信したOCRデータ:', {
        hasFields: !!ocrResult.fields,
        hasTables: !!ocrResult.tables,
        hasPages: !!ocrResult.pages,
        fieldsKeys: ocrResult.fields ? Object.keys(ocrResult.fields) : [],
        tablesLength: ocrResult.tables?.length || 0,
        pagesLength: ocrResult.pages?.length || 0
      });
      
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
      
      // 仕入先と顧客の判別
      const vendorName = fields.vendorName || fields.VendorName || '';
      const customerName = fields.customerName || fields.CustomerName || '';
      const vendorAddressRecipient = fields.VendorAddressRecipient || '';
      
      // デバッグ: 御中判定前の状態
      console.log('[RuleBasedOrchestrator] 御中判定前:', {
        vendorName,
        customerName,
        vendorAddressRecipient
      });
      
      // 「御中」で判別（見積書の場合、御中が付いているのは顧客）
      if (vendorName && vendorName.includes('御中')) {
        // vendorNameに「御中」がある = Azure OCRが逆転している
        console.log('[RuleBasedOrchestrator] vendorNameに御中を検出 - 逆転を修正');
        data.customer = { name: vendorName };
        data.vendor = {
          name: customerName || vendorAddressRecipient || '不明',
          address: fields.vendorAddress || fields.VendorAddress,
          phone: fields.vendorPhoneNumber || fields.vendorPhone
        };
      } else if (customerName && customerName.includes('御中')) {
        // customerNameに「御中」がある = 正しい
        console.log('[RuleBasedOrchestrator] customerNameに御中を検出 - 正しい');
        data.customer = { name: customerName };
        data.vendor = {
          name: vendorName || vendorAddressRecipient || '不明',
          address: fields.vendorAddress || fields.VendorAddress,
          phone: fields.vendorPhoneNumber || fields.vendorPhone
        };
      } else if (vendorAddressRecipient && vendorAddressRecipient.includes('御中')) {
        // VendorAddressRecipientに「御中」がある = これが顧客
        console.log('[RuleBasedOrchestrator] VendorAddressRecipientに御中を検出');
        data.customer = { name: vendorAddressRecipient };
        data.vendor = {
          name: vendorName || customerName || '不明',
          address: fields.vendorAddress || fields.VendorAddress,
          phone: fields.vendorPhoneNumber || fields.vendorPhone
        };
      } else {
        // 「御中」がない場合のフォールバック
        console.log('[RuleBasedOrchestrator] 御中が見つからない - フォールバック');
        data.vendor = {
          name: vendorName || vendorAddressRecipient || '不明',
          address: fields.vendorAddress || fields.VendorAddress,
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
      
      // 4. pagesデータから仕入先情報を補完（日本の見積書は右側が発行元）
      if ((!data.vendor || data.vendor.name === '不明') && ocrResult.pages && ocrResult.pages.length > 0) {
        console.log('[RuleBasedOrchestrator] pagesから仕入先情報を探索');
        
        // 右側にある会社名を優先的に収集
        const rightSideCompanies: Array<{content: string, boundingBox?: any}> = [];
        const allCompanies: Array<{content: string, boundingBox?: any}> = [];
        
        for (const page of ocrResult.pages) {
          if (page.lines) {
            for (const line of page.lines) {
              if (line.content) {
                const content = line.content.trim();
                
                // 会社名パターン（株式会社、有限会社など）
                if ((content.includes('株式会社') || content.includes('有限会社') || 
                     content.includes('合同会社') || content.includes('(株)') || content.includes('(有)')) &&
                    !content.includes('御中')) {
                  
                  const companyInfo = { content, boundingBox: line.boundingBox };
                  allCompanies.push(companyInfo);
                  
                  // boundingBoxがある場合、X座標で右側判定（ページ幅の50%以上）
                  if (line.boundingBox && line.boundingBox[0]) {
                    const pageWidth = page.width || 8.5; // A4の幅（インチ）
                    const xPosition = line.boundingBox[0].x || line.boundingBox[0];
                    if (xPosition > pageWidth * 0.5) {
                      rightSideCompanies.push(companyInfo);
                      console.log('[RuleBasedOrchestrator] 右側の会社名を発見:', content);
                    }
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