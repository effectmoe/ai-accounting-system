import { TaxCalculator } from './tax-calculator';
import { calculateMonthlyTaxSummary } from './tax-utils';

import { logger } from '@/lib/logger';
export interface SalesReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSales: number;
    totalTax: number;
    documentCount: number;
  };
  byType: {
    estimates: { count: number; amount: number };
    invoices: { count: number; amount: number };
    deliveryNotes: { count: number; amount: number };
    receipts: { count: number; amount: number };
  };
  byStatus: {
    draft: { count: number; amount: number };
    sent: { count: number; amount: number };
    paid: { count: number; amount: number };
  };
  byPartner: Array<{
    partnerName: string;
    count: number;
    amount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

export interface JournalReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalEntries: number;
    totalDebit: number;
    totalCredit: number;
  };
  byAccount: Array<{
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    balance: number;
  }>;
  bySource: {
    manual: { count: number; amount: number };
    ocr: { count: number; amount: number };
    import: { count: number; amount: number };
    document: { count: number; amount: number };
  };
}

export interface TaxReport {
  period: {
    start: string;
    end: string;
  };
  consumption_tax: {
    sales: {
      standard_rate: { subtotal: number; tax: number };
      reduced_rate: { subtotal: number; tax: number };
      export: { subtotal: number; tax: number };
      total: { subtotal: number; tax: number };
    };
    purchases: {
      standard_rate: { subtotal: number; tax: number };
      reduced_rate: { subtotal: number; tax: number };
      non_deductible: { subtotal: number; tax: number };
      total: { subtotal: number; tax: number };
    };
    payable_refundable: number;
  };
}

export class ReportGenerator {
  // サーバーサイドでのAPIリクエスト用のベースURL
  private static getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      // クライアントサイド
      return '';
    }
    // サーバーサイド
    return process.env.NEXT_PUBLIC_APP_URL || 
           process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
           'http://localhost:3000';
  }
  /**
   * 売上レポートを生成
   */
  static async generateSalesReport(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<SalesReport> {
    // MongoDBが設定されていない場合はモックデータを返す
    if (!process.env.MONGODB_URI) {
      return this.getMockSalesReport(startDate, endDate);
    }

    try {
      // 期間内の文書を取得
      const params = new URLSearchParams({
        companyId,
        dateFrom: startDate,
        dateTo: endDate,
        limit: '1000'
      });
      
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/documents/list?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const result = await response.json();
      const docs = result.documents || [];

      // サマリー計算
      const summary = {
        totalSales: docs.reduce((sum, doc) => sum + parseFloat(doc.total_amount), 0),
        totalTax: docs.reduce((sum, doc) => sum + parseFloat(doc.tax_amount), 0),
        documentCount: docs.length
      };

      // 文書タイプ別集計
      const byType = {
        estimates: this.aggregateByField(docs, 'document_type', 'estimate'),
        invoices: this.aggregateByField(docs, 'document_type', 'invoice'),
        deliveryNotes: this.aggregateByField(docs, 'document_type', 'delivery_note'),
        receipts: this.aggregateByField(docs, 'document_type', 'receipt')
      };

      // ステータス別集計
      const byStatus = {
        draft: this.aggregateByField(docs, 'status', 'draft'),
        sent: this.aggregateByField(docs, 'status', 'sent'),
        paid: this.aggregateByField(docs, 'status', 'paid')
      };

      // 取引先別集計
      const partnerGroups = this.groupByField(docs, 'partner_name');
      const byPartner = Object.entries(partnerGroups)
        .map(([partnerName, docs]) => ({
          partnerName,
          count: docs.length,
          amount: docs.reduce((sum, doc) => sum + parseFloat(doc.total_amount), 0)
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // トップ10

      // 月次トレンド
      const monthlyGroups = this.groupByMonth(docs, 'issue_date');
      const monthlyTrend = Object.entries(monthlyGroups)
        .map(([month, docs]) => ({
          month,
          count: docs.length,
          amount: docs.reduce((sum, doc) => sum + parseFloat(doc.total_amount), 0)
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        period: { start: startDate, end: endDate },
        summary,
        byType,
        byStatus,
        byPartner,
        monthlyTrend
      };
    } catch (error) {
      logger.error('Error generating sales report:', error);
      throw error;
    }
  }

  /**
   * 仕訳レポートを生成
   */
  static async generateJournalReport(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<JournalReport> {
    // MongoDBが設定されていない場合はモックデータを返す
    if (!process.env.MONGODB_URI) {
      return this.getMockJournalReport(startDate, endDate);
    }

    try {
      // 期間内の仕訳を取得
      const params = new URLSearchParams({
        companyId,
        dateFrom: startDate,
        dateTo: endDate,
        limit: '1000'
      });
      
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/journals?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch journal entries: ${response.statusText}`);
      }

      const result = await response.json();
      const journalEntries = result.journals || [];
      const allLines = journalEntries.flatMap((entry: any) => entry.lines || []);

      // サマリー計算
      const summary = {
        totalEntries: journalEntries.length,
        totalDebit: allLines.reduce((sum: number, line: any) => sum + (line.debitAmount || 0), 0),
        totalCredit: allLines.reduce((sum: number, line: any) => sum + (line.creditAmount || 0), 0)
      };

      // 勘定科目別集計
      const accountGroups = this.groupByField(allLines, 'accountCode');
      const byAccount = Object.entries(accountGroups)
        .map(([accountCode, lines]) => {
          const firstLine = lines[0];
          const debitAmount = lines.reduce((sum: number, line: any) => sum + (line.debitAmount || 0), 0);
          const creditAmount = lines.reduce((sum: number, line: any) => sum + (line.creditAmount || 0), 0);
          
          return {
            accountCode,
            accountName: firstLine.accountName,
            debitAmount,
            creditAmount,
            balance: debitAmount - creditAmount
          };
        })
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

      // 入力元別集計
      const bySource = {
        manual: this.aggregateJournalByField(journalEntries, 'sourceType', 'manual'),
        ocr: this.aggregateJournalByField(journalEntries, 'sourceType', 'ocr'),
        import: this.aggregateJournalByField(journalEntries, 'sourceType', 'import'),
        document: this.aggregateJournalByField(journalEntries, 'sourceType', 'document')
      };

      return {
        period: { start: startDate, end: endDate },
        summary,
        byAccount,
        bySource
      };
    } catch (error) {
      logger.error('Error generating journal report:', error);
      throw error;
    }
  }

  /**
   * 税務レポートを生成
   */
  static async generateTaxReport(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<TaxReport> {
    // MongoDBが設定されていない場合はモックデータを返す
    if (!process.env.MONGODB_URI) {
      return this.getMockTaxReport(startDate, endDate);
    }

    try {
      // 売上データを取得
      const salesParams = new URLSearchParams({
        companyId,
        documentType: 'invoice,receipt',
        dateFrom: startDate,
        dateTo: endDate,
        limit: '1000'
      });
      
      const baseUrl = this.getBaseUrl();
      const salesResponse = await fetch(`${baseUrl}/api/documents/list?${salesParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!salesResponse.ok) {
        throw new Error(`Failed to fetch sales documents: ${salesResponse.statusText}`);
      }

      const salesResult = await salesResponse.json();
      const salesDocs = salesResult.documents || [];

      // 仕入データを取得（簡略化）
      const journalParams = new URLSearchParams({
        companyId,
        dateFrom: startDate,
        dateTo: endDate,
        limit: '1000'
      });
      
      const journalResponse = await fetch(`${baseUrl}/api/journals?${journalParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!journalResponse.ok) {
        throw new Error(`Failed to fetch journal entries: ${journalResponse.statusText}`);
      }

      const journalResult = await journalResponse.json();
      const journalEntries = journalResult.journals || [];

      // 売上の税計算
      let salesStandardSubtotal = 0, salesStandardTax = 0;
      let salesReducedSubtotal = 0, salesReducedTax = 0;
      let salesExportSubtotal = 0, salesExportTax = 0;

      (salesDocs || []).forEach((doc: any) => {
        // document_itemsがない場合は、ドキュメント全体から税率を推定
        const items = doc.document_items || [{
          amount: doc.subtotal || (doc.total_amount - doc.tax_amount),
          tax_rate: doc.tax_amount > 0 ? (doc.tax_amount / (doc.total_amount - doc.tax_amount)) : 0
        }];
        
        items.forEach((item: any) => {
          const taxRate = item.tax_rate || 0;
          const amount = item.amount || 0;
          
          if (Math.abs(taxRate - 0.10) < 0.001) {
            salesStandardSubtotal += amount;
            salesStandardTax += Math.floor(amount * 0.10);
          } else if (Math.abs(taxRate - 0.08) < 0.001) {
            salesReducedSubtotal += amount;
            salesReducedTax += Math.floor(amount * 0.08);
          } else if (taxRate === 0) {
            salesExportSubtotal += amount;
            salesExportTax += 0;
          }
        });
      });

      // 仕入の税計算（簡略化）
      let purchasesStandardSubtotal = 0, purchasesStandardTax = 0;
      let purchasesReducedSubtotal = 0, purchasesReducedTax = 0;

      (journalEntries || []).forEach((entry: any) => {
        const lines = entry.lines || [];
        lines.forEach((line: any) => {
          if ((line.debitAmount || 0) > 0 && line.taxRate) {
            const taxRate = line.taxRate || 0;
            const amount = line.debitAmount || 0;
            
            if (Math.abs(taxRate - 0.10) < 0.001) {
              purchasesStandardSubtotal += amount;
              purchasesStandardTax += line.taxAmount || 0;
            } else if (Math.abs(taxRate - 0.08) < 0.001) {
              purchasesReducedSubtotal += amount;
              purchasesReducedTax += line.taxAmount || 0;
            }
          }
        });
      });

      const totalSalesTax = salesStandardTax + salesReducedTax;
      const totalPurchasesTax = purchasesStandardTax + purchasesReducedTax;
      const payableRefundable = totalSalesTax - totalPurchasesTax;

      return {
        period: { start: startDate, end: endDate },
        consumption_tax: {
          sales: {
            standard_rate: { subtotal: salesStandardSubtotal, tax: salesStandardTax },
            reduced_rate: { subtotal: salesReducedSubtotal, tax: salesReducedTax },
            export: { subtotal: salesExportSubtotal, tax: salesExportTax },
            total: { 
              subtotal: salesStandardSubtotal + salesReducedSubtotal + salesExportSubtotal,
              tax: totalSalesTax
            }
          },
          purchases: {
            standard_rate: { subtotal: purchasesStandardSubtotal, tax: purchasesStandardTax },
            reduced_rate: { subtotal: purchasesReducedSubtotal, tax: purchasesReducedTax },
            non_deductible: { subtotal: 0, tax: 0 },
            total: {
              subtotal: purchasesStandardSubtotal + purchasesReducedSubtotal,
              tax: totalPurchasesTax
            }
          },
          payable_refundable: payableRefundable
        }
      };
    } catch (error) {
      logger.error('Error generating tax report:', error);
      throw error;
    }
  }

  // ヘルパーメソッド
  private static aggregateByField(
    items: any[],
    field: string,
    value: string
  ): { count: number; amount: number } {
    const filtered = items.filter(item => item[field] === value);
    return {
      count: filtered.length,
      amount: filtered.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    };
  }

  private static groupByField(items: any[], field: string): Record<string, any[]> {
    return items.reduce((groups, item) => {
      const key = item[field] || 'その他';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  private static groupByMonth(items: any[], dateField: string): Record<string, any[]> {
    return items.reduce((groups, item) => {
      const date = new Date(item[dateField]);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  // モックデータメソッド
  private static getMockSalesReport(startDate: string, endDate: string): SalesReport {
    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalSales: 1500000,
        totalTax: 150000,
        documentCount: 25
      },
      byType: {
        estimates: { count: 5, amount: 300000 },
        invoices: { count: 10, amount: 800000 },
        deliveryNotes: { count: 5, amount: 200000 },
        receipts: { count: 5, amount: 200000 }
      },
      byStatus: {
        draft: { count: 3, amount: 150000 },
        sent: { count: 12, amount: 850000 },
        paid: { count: 10, amount: 500000 }
      },
      byPartner: [
        { partnerName: '株式会社サンプル', count: 5, amount: 500000 },
        { partnerName: '合同会社テスト', count: 3, amount: 300000 },
        { partnerName: '有限会社デモ', count: 2, amount: 200000 }
      ],
      monthlyTrend: [
        { month: '2024-01', count: 8, amount: 500000 },
        { month: '2024-02', count: 10, amount: 600000 },
        { month: '2024-03', count: 7, amount: 400000 }
      ]
    };
  }

  private static getMockJournalReport(startDate: string, endDate: string): JournalReport {
    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEntries: 50,
        totalDebit: 2500000,
        totalCredit: 2500000
      },
      byAccount: [
        { accountCode: '1110', accountName: '現金', debitAmount: 500000, creditAmount: 300000, balance: 200000 },
        { accountCode: '4110', accountName: '売上高', debitAmount: 0, creditAmount: 1500000, balance: -1500000 },
        { accountCode: '5110', accountName: '仕入高', debitAmount: 800000, creditAmount: 0, balance: 800000 }
      ],
      bySource: {
        manual: { count: 20, amount: 1000000 },
        ocr: { count: 15, amount: 750000 },
        import: { count: 10, amount: 500000 },
        document: { count: 5, amount: 250000 }
      }
    };
  }

  private static getMockTaxReport(startDate: string, endDate: string): TaxReport {
    return {
      period: { start: startDate, end: endDate },
      consumption_tax: {
        sales: {
          standard_rate: { subtotal: 1000000, tax: 100000 },
          reduced_rate: { subtotal: 200000, tax: 16000 },
          export: { subtotal: 300000, tax: 0 },
          total: { subtotal: 1500000, tax: 116000 }
        },
        purchases: {
          standard_rate: { subtotal: 600000, tax: 60000 },
          reduced_rate: { subtotal: 100000, tax: 8000 },
          non_deductible: { subtotal: 50000, tax: 0 },
          total: { subtotal: 750000, tax: 68000 }
        },
        payable_refundable: 48000
      }
    };
  }

  private static aggregateJournalByField(
    items: any[],
    field: string,
    value: string
  ): { count: number; amount: number } {
    const filtered = items.filter(item => item[field] === value);
    return {
      count: filtered.length,
      amount: filtered.reduce((sum, item) => sum + (item.totalDebit || 0), 0)
    };
  }
}