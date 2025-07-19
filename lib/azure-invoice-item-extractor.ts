import { AnalysisResult } from './azure-form-recognizer';

import { logger } from '@/lib/logger';
/**
 * 日本の請求書・見積書から商品明細を抽出するためのヘルパークラス
 */
export class InvoiceItemExtractor {
  /**
   * Azure Form Recognizerの結果から商品明細を抽出（強化版）
   */
  static extractItems(analysisResult: AnalysisResult): any[] {
    const items: any[] = [];
    
    logger.debug('[InvoiceItemExtractor] 商品抽出開始:', {
      hasFields: !!analysisResult.fields,
      fieldsCount: analysisResult.fields ? Object.keys(analysisResult.fields).length : 0,
      hasRawResult: !!analysisResult.rawResult,
      hasPages: !!analysisResult.pages,
      hasTables: !!analysisResult.tables
    });
    
    // 1. 標準のitemsフィールドから抽出を試行
    if (analysisResult.fields?.items && Array.isArray(analysisResult.fields.items)) {
      logger.debug('[InvoiceItemExtractor] 標準itemsフィールドから抽出');
      return analysisResult.fields.items;
    }
    
    // 2. rawResultから直接抽出を試行
    if (analysisResult.rawResult) {
      const rawItems = this.extractItemsFromRawResult(analysisResult.rawResult);
      if (rawItems.length > 0) {
        logger.debug('[InvoiceItemExtractor] rawResultから商品明細を抽出:', rawItems);
        return rawItems;
      }
    }
    
    // 3. customFieldsから商品情報を探す
    if (analysisResult.fields?.customFields) {
      const customItems = this.extractItemsFromCustomFields(analysisResult.fields.customFields);
      if (customItems.length > 0) {
        logger.debug('[InvoiceItemExtractor] customFieldsから商品明細を抽出:', customItems);
        return customItems;
      }
    }
    
    // 4. ページコンテンツから商品情報を抽出（最後の手段）
    if (analysisResult.pages && analysisResult.pages.length > 0) {
      const pageItems = this.extractItemsFromPages(analysisResult.pages);
      if (pageItems.length > 0) {
        logger.debug('[InvoiceItemExtractor] ページコンテンツから商品明細を抽出:', pageItems);
        return pageItems;
      }
    }
    
    // 5. テーブルから抽出（既存のロジック）
    if (analysisResult.tables && analysisResult.tables.length > 0) {
      const tableItems = this.extractItemsFromTables(analysisResult.tables);
      if (tableItems.length > 0) {
        logger.debug('[InvoiceItemExtractor] テーブルから商品明細を抽出:', tableItems);
        return tableItems;
      }
    }
    
    // 商品情報が全く見つからない場合は空配列を返す
    logger.warn('[InvoiceItemExtractor] 商品明細を抽出できませんでした');
    return [];
  }
  
  /**
   * rawResultから商品明細を抽出
   */
  private static extractItemsFromRawResult(rawResult: any): any[] {
    const items: any[] = [];
    
    try {
      // documentsフィールドをチェック
      if (rawResult.documents && rawResult.documents.length > 0) {
        const doc = rawResult.documents[0];
        
        // fields.Itemsをチェック
        if (doc.fields?.Items?.values && Array.isArray(doc.fields.Items.values)) {
          for (const item of doc.fields.Items.values) {
            const fields = item.fields || {};
            const extractedItem = this.extractItemFromFields(fields);
            if (extractedItem) {
              items.push(extractedItem);
            }
          }
        }
      }
      
      // analyzedTextのlinesから商品情報を抽出
      if (rawResult.content || rawResult.analyzeResult?.content) {
        const content = rawResult.content || rawResult.analyzeResult.content;
        const contentItems = this.extractItemsFromText(content);
        items.push(...contentItems);
      }
      
    } catch (error) {
      logger.error('[InvoiceItemExtractor] rawResult解析エラー:', error);
    }
    
    return items;
  }
  
  /**
   * customFieldsから商品明細を抽出
   */
  private static extractItemsFromCustomFields(customFields: any): any[] {
    const items: any[] = [];
    
    try {
      // カスタムフィールドに商品情報が含まれているかチェック
      for (const [key, value] of Object.entries(customFields)) {
        if (key.toLowerCase().includes('item') || 
            key.toLowerCase().includes('product') ||
            key.includes('商品') ||
            key.includes('品名')) {
          
          // 値が配列の場合
          if (Array.isArray(value)) {
            for (const item of value) {
              if (typeof item === 'object') {
                const extractedItem = this.extractItemFromFields(item);
                if (extractedItem) {
                  items.push(extractedItem);
                }
              }
            }
          }
          // 値がオブジェクトの場合
          else if (typeof value === 'object' && value !== null) {
            const extractedItem = this.extractItemFromFields(value);
            if (extractedItem) {
              items.push(extractedItem);
            }
          }
        }
      }
    } catch (error) {
      logger.error('[InvoiceItemExtractor] customFields解析エラー:', error);
    }
    
    return items;
  }
  
  /**
   * ページコンテンツから商品明細を抽出
   */
  private static extractItemsFromPages(pages: any[]): any[] {
    const items: any[] = [];
    
    try {
      logger.debug('[InvoiceItemExtractor] ページ数:', pages.length);
      
      for (const page of pages) {
        if (page.lines && Array.isArray(page.lines)) {
          logger.debug('[InvoiceItemExtractor] ページの行数:', page.lines.length);
          
          // すべての行をログ出力（商品情報を探すため）
          page.lines.forEach((line: any, index: number) => {
            const content = line.content || '';
            // 商品に関連しそうな行を特定
            if (content.includes('【') || content.includes('用紙') || 
                content.includes('印刷') || content.includes('枚') || 
                content.includes('¥') || /\d{1,3}(?:,\d{3})*/.test(content)) {
              logger.debug(`[InvoiceItemExtractor] 行[${index}]:`, content);
            }
          });
          
          const pageText = page.lines.map((line: any) => line.content).join('\n');
          const pageItems = this.extractItemsFromText(pageText);
          items.push(...pageItems);
        }
      }
    } catch (error) {
      logger.error('[InvoiceItemExtractor] ページ解析エラー:', error);
    }
    
    return items;
  }
  
  /**
   * テキストから商品明細を抽出（パターンマッチング）
   */
  private static extractItemsFromText(text: string): any[] {
    const items: any[] = [];
    
    try {
      // 日本の請求書・見積書でよく使われるパターン
      const patterns = [
        // 「商品名 数量 単価 金額」のパターン
        /(.+?)\s+(\d+(?:\.\d+)?)\s*(?:個|枚|本|箱|セット|式)?\s*[@￥¥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*[￥¥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g,
        // 「商品名 金額」のシンプルなパターン
        /^(.+?)\s+[￥¥]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*円?$/gm,
        // 表形式のパターン（| で区切られている場合）
        /\|?\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(\d{1,3}(?:,\d{3})*)\s*\|\s*(\d{1,3}(?:,\d{3})*)\s*\|?/g,
      ];
      
      // 商品名として除外するパターン
      const excludePatterns = [
        /^(小計|合計|消費税|税込|税抜|振込手数料|送料|値引き|割引)/,
        /^(subtotal|total|tax|discount|shipping)/i,
        /^[\d\s\-\.,]+$/,  // 数字のみ
        /^[A-Z]{1,3}$/,    // 短い大文字のみ（IDなど）
      ];
      
      for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        
        for (const match of matches) {
          const itemName = match[1]?.trim();
          
          // 商品名の妥当性チェック
          if (itemName && 
              itemName.length > 1 && 
              itemName.length < 100 &&
              !excludePatterns.some(p => p.test(itemName))) {
            
            const item: any = {
              description: itemName,
              name: itemName,
              quantity: 1,
              unitPrice: 0,
              amount: 0,
            };
            
            // パターンに応じて値を設定
            if (match.length === 5) {
              // 「商品名 数量 単価 金額」パターン
              item.quantity = parseFloat(match[2]) || 1;
              item.unitPrice = this.parseAmount(match[3]);
              item.amount = this.parseAmount(match[4]);
            } else if (match.length === 3) {
              // 「商品名 金額」パターン
              item.amount = this.parseAmount(match[2]);
              item.unitPrice = item.amount;
            }
            
            // 単価が0で金額がある場合、単価を計算
            if (item.unitPrice === 0 && item.amount > 0 && item.quantity > 0) {
              item.unitPrice = Math.round(item.amount / item.quantity);
            }
            
            // 金額が0で単価がある場合、金額を計算
            if (item.amount === 0 && item.unitPrice > 0 && item.quantity > 0) {
              item.amount = item.unitPrice * item.quantity;
            }
            
            // 有効な商品情報のみ追加
            if (item.amount > 0 || item.unitPrice > 0) {
              items.push(item);
              logger.debug('[InvoiceItemExtractor] テキストから商品を抽出:', item);
            }
          }
        }
      }
      
      // 特定の商品名パターンを探す（例：印刷加工関連）
      const specificPatterns = [
        /【(.+?)】(.+?)(?:\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)円)?/g,
        /用紙[：:]\s*(.+?)(?:\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)円)?/g,
      ];
      
      for (const pattern of specificPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        
        for (const match of matches) {
          const itemName = match[0].replace(/\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?円$/, '').trim();
          
          if (itemName && !items.some(item => item.description.includes(itemName))) {
            const amount = match[match.length - 1] ? this.parseAmount(match[match.length - 1]) : 0;
            
            items.push({
              description: itemName,
              name: itemName,
              quantity: 1,
              unitPrice: amount,
              amount: amount,
            });
            
            logger.debug('[InvoiceItemExtractor] 特定パターンから商品を抽出:', itemName);
          }
        }
      }
      
    } catch (error) {
      logger.error('[InvoiceItemExtractor] テキスト解析エラー:', error);
    }
    
    return items;
  }
  
  /**
   * テーブルから商品明細を抽出（改良版）
   */
  private static extractItemsFromTables(tables: any[]): any[] {
    const items: any[] = [];
    
    try {
      for (const table of tables) {
        if (!table.cells || table.cells.length === 0) continue;
        
        // テーブル構造を解析
        const structure = this.analyzeTableStructure(table);
        
        if (structure.isValidItemTable) {
          // 各データ行から商品情報を抽出
          for (const row of structure.dataRows) {
            const item = this.extractItemFromTableRow(row, structure);
            if (item && (item.amount > 0 || item.description)) {
              items.push(item);
            }
          }
        }
      }
    } catch (error) {
      logger.error('[InvoiceItemExtractor] テーブル解析エラー:', error);
    }
    
    return items;
  }
  
  /**
   * テーブル構造を解析
   */
  private static analyzeTableStructure(table: any): any {
    const structure = {
      isValidItemTable: false,
      headerRow: -1,
      descriptionCol: -1,
      quantityCol: -1,
      unitPriceCol: -1,
      amountCol: -1,
      dataRows: [] as any[],
    };
    
    // ヘッダーパターン（日英対応）
    const headerPatterns = {
      description: ['商品', '品名', '項目', '内容', '摘要', 'item', 'product', 'description'],
      quantity: ['数量', '数', 'qty', 'quantity'],
      unitPrice: ['単価', '単位', 'unit price', 'price'],
      amount: ['金額', '価格', '小計', 'amount', 'total', 'subtotal'],
    };
    
    // ヘッダー行を特定
    const rowMap = new Map<number, any[]>();
    
    for (const cell of table.cells) {
      if (!rowMap.has(cell.rowIndex)) {
        rowMap.set(cell.rowIndex, []);
      }
      rowMap.get(cell.rowIndex)!.push(cell);
    }
    
    // 各行をチェックしてヘッダー行を見つける
    for (const [rowIndex, cells] of rowMap) {
      let matchCount = 0;
      
      for (const cell of cells) {
        const content = (cell.content || '').toLowerCase();
        
        for (const pattern of headerPatterns.description) {
          if (content.includes(pattern)) {
            structure.descriptionCol = cell.columnIndex;
            matchCount++;
            break;
          }
        }
        
        for (const pattern of headerPatterns.quantity) {
          if (content.includes(pattern)) {
            structure.quantityCol = cell.columnIndex;
            matchCount++;
            break;
          }
        }
        
        for (const pattern of headerPatterns.unitPrice) {
          if (content.includes(pattern)) {
            structure.unitPriceCol = cell.columnIndex;
            matchCount++;
            break;
          }
        }
        
        for (const pattern of headerPatterns.amount) {
          if (content.includes(pattern)) {
            structure.amountCol = cell.columnIndex;
            matchCount++;
            break;
          }
        }
      }
      
      // 2つ以上のヘッダーが見つかった場合、有効なヘッダー行とする
      if (matchCount >= 2) {
        structure.headerRow = rowIndex;
        structure.isValidItemTable = true;
        break;
      }
    }
    
    // データ行を収集
    if (structure.isValidItemTable) {
      for (const [rowIndex, cells] of rowMap) {
        if (rowIndex > structure.headerRow) {
          structure.dataRows.push(cells);
        }
      }
    }
    
    return structure;
  }
  
  /**
   * テーブル行から商品情報を抽出
   */
  private static extractItemFromTableRow(cells: any[], structure: any): any {
    const item: any = {
      description: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    };
    
    for (const cell of cells) {
      const content = cell.content || '';
      
      if (cell.columnIndex === structure.descriptionCol) {
        item.description = content.trim();
        item.name = content.trim();
      } else if (cell.columnIndex === structure.quantityCol) {
        item.quantity = this.parseNumber(content) || 1;
      } else if (cell.columnIndex === structure.unitPriceCol) {
        item.unitPrice = this.parseAmount(content);
      } else if (cell.columnIndex === structure.amountCol) {
        item.amount = this.parseAmount(content);
      }
    }
    
    // 商品名がない場合は、最初の非数値セルを商品名とする
    if (!item.description && structure.descriptionCol === -1) {
      for (const cell of cells) {
        const content = cell.content || '';
        if (content && !this.isNumericContent(content)) {
          item.description = content.trim();
          item.name = content.trim();
          break;
        }
      }
    }
    
    // 単価が0で金額がある場合、単価を計算
    if (item.unitPrice === 0 && item.amount > 0 && item.quantity > 0) {
      item.unitPrice = Math.round(item.amount / item.quantity);
    }
    
    // 金額が0で単価がある場合、金額を計算
    if (item.amount === 0 && item.unitPrice > 0 && item.quantity > 0) {
      item.amount = item.unitPrice * item.quantity;
    }
    
    return item.description ? item : null;
  }
  
  /**
   * フィールドオブジェクトから商品情報を抽出
   */
  private static extractItemFromFields(fields: any): any {
    const item: any = {
      description: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    };
    
    // 商品名の抽出
    item.description = fields.Description?.content || 
                      fields.Name?.content || 
                      fields.ItemName?.content || 
                      fields.ProductName?.content || 
                      fields.description?.content ||
                      fields.name?.content || '';
    
    item.name = item.description;
    
    // 数量の抽出
    if (fields.Quantity?.value !== undefined) {
      item.quantity = parseFloat(fields.Quantity.value) || 1;
    } else if (fields.Quantity?.content !== undefined) {
      item.quantity = this.parseNumber(fields.Quantity.content) || 1;
    } else if (fields.quantity !== undefined) {
      item.quantity = parseFloat(fields.quantity) || 1;
    }
    
    // 単価の抽出
    if (fields.UnitPrice?.value !== undefined) {
      item.unitPrice = parseFloat(fields.UnitPrice.value) || 0;
    } else if (fields.UnitPrice?.content !== undefined) {
      item.unitPrice = this.parseAmount(fields.UnitPrice.content);
    } else if (fields.Price?.value !== undefined) {
      item.unitPrice = parseFloat(fields.Price.value) || 0;
    } else if (fields.unitPrice !== undefined) {
      item.unitPrice = parseFloat(fields.unitPrice) || 0;
    }
    
    // 金額の抽出
    if (fields.Amount?.value !== undefined) {
      item.amount = parseFloat(fields.Amount.value) || 0;
    } else if (fields.Amount?.content !== undefined) {
      item.amount = this.parseAmount(fields.Amount.content);
    } else if (fields.TotalPrice?.value !== undefined) {
      item.amount = parseFloat(fields.TotalPrice.value) || 0;
    } else if (fields.amount !== undefined) {
      item.amount = parseFloat(fields.amount) || 0;
    }
    
    // 単価が0で金額がある場合、単価を計算
    if (item.unitPrice === 0 && item.amount > 0 && item.quantity > 0) {
      item.unitPrice = Math.round(item.amount / item.quantity);
    }
    
    // 金額が0で単価がある場合、金額を計算
    if (item.amount === 0 && item.unitPrice > 0 && item.quantity > 0) {
      item.amount = item.unitPrice * item.quantity;
    }
    
    return item.description ? item : null;
  }
  
  /**
   * 金額文字列をパース
   */
  private static parseAmount(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    // 通貨記号、スペース、コンマを除去
    const cleaned = text.replace(/[¥￥$,\s]/g, '');
    
    // 「円」を除去
    const withoutYen = cleaned.replace(/円$/g, '');
    
    // 数値パターンを抽出
    const match = withoutYen.match(/\d+(?:\.\d+)?/);
    
    return match ? parseFloat(match[0]) : 0;
  }
  
  /**
   * 数値文字列をパース
   */
  private static parseNumber(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    
    // コンマとスペースを除去
    const cleaned = text.replace(/[,\s]/g, '');
    
    // 単位を除去（個、枚、本、箱、セット、式など）
    const withoutUnit = cleaned.replace(/(?:個|枚|本|箱|セット|式)$/g, '');
    
    // 数値パターンを抽出
    const match = withoutUnit.match(/\d+(?:\.\d+)?/);
    
    return match ? parseFloat(match[0]) : 0;
  }
  
  /**
   * 内容が数値のみかチェック
   */
  private static isNumericContent(content: string): boolean {
    const cleaned = content.replace(/[¥￥$,\s円]/g, '');
    return /^\d+(?:\.\d+)?$/.test(cleaned);
  }
}