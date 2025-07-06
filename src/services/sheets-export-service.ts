import { Transaction } from '../lib/supabase-client';
import { MCPService } from './mcp-service';

export interface SheetExportOptions {
  spreadsheetId?: string;
  sheetName?: string;
  createNew?: boolean;
}

export class SheetsExportService {
  /**
   * トランザクションをGoogle Sheetsにエクスポート
   */
  static async exportTransactions(
    transactions: Transaction[],
    options: SheetExportOptions = {}
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    try {
      // 新しいスプレッドシートを作成するか、既存のものを使用
      let spreadsheetId = options.spreadsheetId;
      
      if (options.createNew || !spreadsheetId) {
        // 新しいスプレッドシートを作成
        const sheetName = `AI会計データ_${new Date().toISOString().split('T')[0]}`;
        const createResult = await MCPService.sheets.createSpreadsheet(sheetName);
        spreadsheetId = (createResult as any).spreadsheetId;
      }

      // シート名を決定
      const sheetName = options.sheetName || 'トランザクション';

      // ヘッダー行を準備
      const headers = [
        '日付',
        '店舗名',
        '説明',
        '金額（税込）',
        '消費税',
        '税率',
        '借方科目',
        '貸方科目',
        'ステータス',
        'ID'
      ];

      // データ行を準備
      const rows = transactions.map(tx => [
        tx.date,
        tx.vendor,
        tx.description,
        tx.amount,
        tx.tax_amount,
        `${(tx.tax_rate * 100).toFixed(0)}%`,
        tx.debit_account,
        tx.credit_account,
        tx.status,
        tx.id || ''
      ]);

      // ヘッダーとデータを結合
      const allData = [headers, ...rows];

      // データを書き込み
      await MCPService.sheets.updateValues(
        spreadsheetId!,
        `${sheetName}!A1`,
        allData
      );

      // フォーマットを適用
      await this.applyFormatting(spreadsheetId!, sheetName, allData.length);

      // スプレッドシートのURLを構築
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      return {
        spreadsheetId: spreadsheetId!,
        spreadsheetUrl
      };
    } catch (error) {
      console.error('Sheets export error:', error);
      throw new Error(`Google Sheetsへのエクスポートに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 月次レポートをGoogle Sheetsにエクスポート
   */
  static async exportMonthlyReport(
    summary: Record<string, { count: number; amount: number; taxAmount: number }>,
    year: number,
    month: number,
    options: SheetExportOptions = {}
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    try {
      // 新しいスプレッドシートを作成するか、既存のものを使用
      let spreadsheetId = options.spreadsheetId;
      
      if (options.createNew || !spreadsheetId) {
        // 新しいスプレッドシートを作成
        const sheetName = `月次レポート_${year}年${month}月`;
        const createResult = await MCPService.sheets.createSpreadsheet(sheetName);
        spreadsheetId = (createResult as any).spreadsheetId;
      }

      // シート名を決定
      const sheetName = options.sheetName || `${year}年${month}月`;

      // ヘッダー行を準備
      const headers = [
        '勘定科目',
        '件数',
        '金額（税抜）',
        '消費税',
        '合計（税込）'
      ];

      // データ行を準備
      const rows = Object.entries(summary).map(([account, data]) => [
        account,
        data.count,
        data.amount,
        data.taxAmount,
        data.amount + data.taxAmount
      ]);

      // 合計行を追加
      const totals = rows.reduce(
        (acc, row) => ({
          count: acc.count + (row[1] as number),
          amount: acc.amount + (row[2] as number),
          taxAmount: acc.taxAmount + (row[3] as number),
          total: acc.total + (row[4] as number)
        }),
        { count: 0, amount: 0, taxAmount: 0, total: 0 }
      );

      rows.push(['合計', totals.count, totals.amount, totals.taxAmount, totals.total]);

      // ヘッダーとデータを結合
      const allData = [headers, ...rows];

      // データを書き込み
      await MCPService.sheets.updateValues(
        spreadsheetId!,
        `${sheetName}!A1`,
        allData
      );

      // フォーマットを適用
      await this.applyMonthlyReportFormatting(spreadsheetId!, sheetName, allData.length);

      // スプレッドシートのURLを構築
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      return {
        spreadsheetId: spreadsheetId!,
        spreadsheetUrl
      };
    } catch (error) {
      console.error('Monthly report export error:', error);
      throw new Error(`月次レポートのエクスポートに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * スプレッドシートにフォーマットを適用
   */
  private static async applyFormatting(
    spreadsheetId: string,
    sheetName: string,
    rowCount: number
  ): Promise<void> {
    try {
      // ヘッダー行を太字に
      await MCPService.sheets.formatCells(spreadsheetId, `${sheetName}!A1:J1`, {
        textFormat: { bold: true },
        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
      });

      // 金額列に通貨フォーマットを適用
      await MCPService.sheets.formatCells(spreadsheetId, `${sheetName}!D2:E${rowCount}`, {
        numberFormat: {
          type: 'CURRENCY',
          pattern: '¥#,##0'
        }
      });

      // 日付列に日付フォーマットを適用
      await MCPService.sheets.formatCells(spreadsheetId, `${sheetName}!A2:A${rowCount}`, {
        numberFormat: {
          type: 'DATE',
          pattern: 'yyyy-mm-dd'
        }
      });

      // 列幅を自動調整
      await MCPService.sheets.autoResizeColumns(spreadsheetId, sheetName, 0, 9);
    } catch (error) {
      console.error('Formatting error:', error);
      // フォーマットエラーは無視（データは正常に書き込まれている）
    }
  }

  /**
   * 月次レポートにフォーマットを適用
   */
  private static async applyMonthlyReportFormatting(
    spreadsheetId: string,
    sheetName: string,
    rowCount: number
  ): Promise<void> {
    try {
      // ヘッダー行を太字に
      await MCPService.sheets.formatCells(spreadsheetId, `${sheetName}!A1:E1`, {
        textFormat: { bold: true },
        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
      });

      // 合計行を太字に
      await MCPService.sheets.formatCells(spreadsheetId, `${sheetName}!A${rowCount}:E${rowCount}`, {
        textFormat: { bold: true },
        backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }
      });

      // 金額列に通貨フォーマットを適用
      await MCPService.sheets.formatCells(spreadsheetId, `${sheetName}!C2:E${rowCount}`, {
        numberFormat: {
          type: 'CURRENCY',
          pattern: '¥#,##0'
        }
      });

      // 列幅を自動調整
      await MCPService.sheets.autoResizeColumns(spreadsheetId, sheetName, 0, 4);
    } catch (error) {
      console.error('Formatting error:', error);
      // フォーマットエラーは無視（データは正常に書き込まれている）
    }
  }
}