// ===================================================
// 財務諸表サービス
// 試算表・貸借対照表(B/S)・損益計算書(P/L)・shinkokuエクスポート
// ===================================================

import { db } from '@/lib/mongodb-client';
import type { Account } from '@/types/collections';
import type {
  TrialBalanceEntry,
  TrialBalanceResult,
  BalanceSheetResult,
  BSSection,
  BSLineItem,
  ProfitLossResult,
  PLSection,
  PLLineItem,
  ProfitLossOptions,
  ShinkokuExportResult,
  ShinkokuJournalExport,
  ShinkokuAccountExport,
} from '@/types/financial-statements';
import {
  getAccountSubcategory,
  isBSAccount,
  isPLAccount,
  getFiscalYearStart,
  getFiscalYear,
} from '@/lib/account-subcategory-map';
import {
  mapToShinkokuCode,
  getShinkokuTaxCategory,
  validateShinkokuMapping,
  SHINKOKU_MASTER_ACCOUNTS,
  LEGACY_CODE_MAP,
} from '@/lib/shinkoku-account-map';

export class FinancialStatementService {
  // ==========================================
  // 残高試算表
  // ==========================================

  async generateTrialBalance(
    companyId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<TrialBalanceResult> {
    // 仕訳の集計（confirmed/posted のみ）
    const pipeline = [
      {
        $match: {
          ...(companyId !== 'all' ? { companyId } : {}),
          entryDate: {
            $gte: new Date(dateFrom),
            $lte: new Date(dateTo + 'T23:59:59.999Z'),
          },
          status: { $in: ['confirmed', 'posted'] },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountCode',
          accountName: { $first: '$lines.accountName' },
          debitTotal: { $sum: '$lines.debitAmount' },
          creditTotal: { $sum: '$lines.creditAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const rawEntries = await db.aggregate<{
      _id: string;
      accountName: string;
      debitTotal: number;
      creditTotal: number;
    }>('journals', pipeline);

    // 勘定科目マスタを取得してaccountTypeを付与
    const accounts = await db.find<Account>('accounts', {});
    const accountMap = new Map(accounts.map((a) => [a.accountCode, a]));

    const entries: TrialBalanceEntry[] = rawEntries.map((raw) => {
      const account = accountMap.get(raw._id);
      const accountType = account?.accountType || this.inferAccountType(raw._id);
      const balance = this.computeBalance(accountType, raw.debitTotal, raw.creditTotal);

      return {
        accountCode: raw._id,
        accountName: raw.accountName || account?.accountName || '不明',
        accountType,
        debitTotal: raw.debitTotal,
        creditTotal: raw.creditTotal,
        balance,
      };
    });

    const totalDebit = entries.reduce((sum, e) => sum + e.debitTotal, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.creditTotal, 0);

    return {
      dateFrom,
      dateTo,
      companyId,
      entries,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 1, // 1円未満の差は誤差
    };
  }

  // ==========================================
  // 貸借対照表 (B/S)
  // ==========================================

  async generateBalanceSheet(
    companyId: string,
    asOfDate: string,
    fiscalYear?: number
  ): Promise<BalanceSheetResult> {
    const fy = fiscalYear || getFiscalYear(asOfDate);
    const fyStart = getFiscalYearStart(asOfDate);

    // B/S: 全期間の仕訳を集計（B/S科目は累積残高）
    const allTimeTB = await this.generateTrialBalance(companyId, '2000-01-01', asOfDate);

    // 当期純利益は当会計年度のP/L科目のみで計算（二重計上防止）
    const currentFYTB = await this.generateTrialBalance(companyId, fyStart, asOfDate);

    // 勘定科目マスタ
    const accounts = await db.find<Account>('accounts', {});
    const accountMap = new Map(accounts.map((a) => [a.accountCode, a]));

    // B/S科目のみ抽出（全期間）
    const bsEntries = allTimeTB.entries.filter((e) => isBSAccount(e.accountCode));

    // 当期純利益（当会計年度のP/L科目のみ）
    const plEntries = currentFYTB.entries.filter((e) => isPLAccount(e.accountCode));
    const revenueTotal = plEntries
      .filter((e) => e.accountType === 'revenue')
      .reduce((sum, e) => sum + e.balance, 0);
    const expenseTotal = plEntries
      .filter((e) => e.accountType === 'expense')
      .reduce((sum, e) => sum + e.balance, 0);
    const netIncome = revenueTotal - expenseTotal;

    // 各セクションに振り分け
    const currentAssets: BSLineItem[] = [];
    const fixedAssets: BSLineItem[] = [];
    const deferredAssets: BSLineItem[] = [];
    const currentLiabilities: BSLineItem[] = [];
    const fixedLiabilities: BSLineItem[] = [];
    const equityItems: BSLineItem[] = [];

    for (const entry of bsEntries) {
      if (entry.balance === 0) continue; // 残高ゼロは除外

      const account = accountMap.get(entry.accountCode);
      const subcategory = getAccountSubcategory(
        entry.accountCode,
        account?.subcategory
      );

      const item: BSLineItem = {
        accountCode: entry.accountCode,
        accountName: entry.accountName,
        balance: entry.balance,
        subcategory: (subcategory as BSLineItem['subcategory']) || '流動資産',
      };

      switch (subcategory) {
        case '流動資産': currentAssets.push(item); break;
        case '固定資産': fixedAssets.push(item); break;
        case '繰延資産': deferredAssets.push(item); break;
        case '流動負債': currentLiabilities.push(item); break;
        case '固定負債': fixedLiabilities.push(item); break;
        case '株主資本': equityItems.push(item); break;
        default:
          // accountTypeで判定
          if (entry.accountType === 'asset') currentAssets.push(item);
          else if (entry.accountType === 'liability') currentLiabilities.push(item);
          else if (entry.accountType === 'equity') equityItems.push(item);
          break;
      }
    }

    // 当期純利益を純資産に追加
    if (netIncome !== 0) {
      equityItems.push({
        accountCode: '3201',
        accountName: '当期純利益',
        balance: netIncome,
        subcategory: '株主資本',
      });
    }

    // セクション構築
    const buildSection = (title: string, items: BSLineItem[]): BSSection => ({
      title,
      items,
      subtotal: items.reduce((sum, i) => sum + i.balance, 0),
    });

    const assets = {
      current: buildSection('流動資産', currentAssets),
      fixed: buildSection('固定資産', fixedAssets),
      deferred: buildSection('繰延資産', deferredAssets),
      total: 0,
    };
    assets.total = assets.current.subtotal + assets.fixed.subtotal + assets.deferred.subtotal;

    const liabilities = {
      current: buildSection('流動負債', currentLiabilities),
      fixed: buildSection('固定負債', fixedLiabilities),
      total: 0,
    };
    liabilities.total = liabilities.current.subtotal + liabilities.fixed.subtotal;

    const equity = {
      capital: buildSection('株主資本', equityItems),
      total: 0,
    };
    equity.total = equity.capital.subtotal;

    const totalLiabilitiesAndEquity = liabilities.total + equity.total;
    const balanceDifference = assets.total - totalLiabilitiesAndEquity;

    return {
      asOfDate,
      fiscalYear: fy,
      companyId,
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(balanceDifference) < 1,
      balanceDifference,
    };
  }

  // ==========================================
  // 損益計算書 (P/L)
  // ==========================================

  async generateProfitLoss(
    companyId: string,
    periodStart: string,
    periodEnd: string,
    options?: ProfitLossOptions
  ): Promise<ProfitLossResult> {
    const fy = getFiscalYear(periodStart);

    // 当期の試算表
    const trialBalance = await this.generateTrialBalance(companyId, periodStart, periodEnd);

    // 勘定科目マスタ
    const accounts = await db.find<Account>('accounts', {});
    const accountMap = new Map(accounts.map((a) => [a.accountCode, a]));

    // P/L科目のみ抽出
    const plEntries = trialBalance.entries.filter((e) => isPLAccount(e.accountCode));

    // サブカテゴリ別に振り分け
    const revenueItems: PLLineItem[] = [];
    const cogsItems: PLLineItem[] = [];
    const sgaItems: PLLineItem[] = [];
    const nonOpRevenueItems: PLLineItem[] = [];
    const nonOpExpenseItems: PLLineItem[] = [];
    const extraGainItems: PLLineItem[] = [];
    const extraLossItems: PLLineItem[] = [];

    for (const entry of plEntries) {
      if (entry.balance === 0) continue;

      const account = accountMap.get(entry.accountCode);
      const subcategory = getAccountSubcategory(
        entry.accountCode,
        account?.subcategory
      );

      const item: PLLineItem = {
        accountCode: entry.accountCode,
        accountName: entry.accountName,
        amount: Math.abs(entry.balance),
        subcategory: (subcategory as PLLineItem['subcategory']) || '販売費及び一般管理費',
      };

      switch (subcategory) {
        case '売上高': revenueItems.push(item); break;
        case '売上原価': cogsItems.push(item); break;
        case '販売費及び一般管理費': sgaItems.push(item); break;
        case '営業外収益': nonOpRevenueItems.push(item); break;
        case '営業外費用': nonOpExpenseItems.push(item); break;
        case '特別利益': extraGainItems.push(item); break;
        case '特別損失': extraLossItems.push(item); break;
        default:
          if (entry.accountType === 'revenue') revenueItems.push(item);
          else if (entry.accountType === 'expense') sgaItems.push(item);
          break;
      }
    }

    // セクション構築
    const buildPLSection = (title: string, items: PLLineItem[]): PLSection => ({
      title,
      items,
      subtotal: items.reduce((sum, i) => sum + i.amount, 0),
    });

    const revenue = buildPLSection('売上高', revenueItems);
    const costOfGoodsSold = buildPLSection('売上原価', cogsItems);
    const grossProfit = revenue.subtotal - costOfGoodsSold.subtotal;

    const sellingAndAdmin = buildPLSection('販売費及び一般管理費', sgaItems);
    const operatingProfit = grossProfit - sellingAndAdmin.subtotal;

    const nonOperatingRevenue = buildPLSection('営業外収益', nonOpRevenueItems);
    const nonOperatingExpenses = buildPLSection('営業外費用', nonOpExpenseItems);
    const ordinaryProfit = operatingProfit + nonOperatingRevenue.subtotal - nonOperatingExpenses.subtotal;

    const extraordinaryGains = buildPLSection('特別利益', extraGainItems);
    const extraordinaryLosses = buildPLSection('特別損失', extraLossItems);
    const profitBeforeTax = ordinaryProfit + extraordinaryGains.subtotal - extraordinaryLosses.subtotal;

    const netIncome = profitBeforeTax; // 税金計算はshinkoku側で実施

    // 前年同期比較
    let previousYear: ProfitLossResult['previousYear'];
    if (options?.includeYoY) {
      const prevStart = this.shiftDateByYear(periodStart, -1);
      const prevEnd = this.shiftDateByYear(periodEnd, -1);
      const prevPL = await this.generateProfitLoss(companyId, prevStart, prevEnd);
      previousYear = {
        grossProfit: prevPL.grossProfit,
        operatingProfit: prevPL.operatingProfit,
        ordinaryProfit: prevPL.ordinaryProfit,
        netIncome: prevPL.netIncome,
      };
    }

    return {
      periodStart,
      periodEnd,
      fiscalYear: fy,
      companyId,
      revenue,
      costOfGoodsSold,
      grossProfit,
      sellingAndAdmin,
      operatingProfit,
      nonOperatingRevenue,
      nonOperatingExpenses,
      ordinaryProfit,
      extraordinaryGains,
      extraordinaryLosses,
      profitBeforeTax,
      netIncome,
      previousYear,
    };
  }

  // ==========================================
  // shinkoku エクスポート
  // ==========================================

  async exportForShinkoku(
    companyId: string,
    fiscalYear: number,
    periodStart: string,
    periodEnd: string
  ): Promise<ShinkokuExportResult> {
    // confirmed/posted の仕訳を取得
    const filter: any = {
      ...(companyId !== 'all' ? { companyId } : {}),
      entryDate: {
        $gte: new Date(periodStart),
        $lte: new Date(periodEnd + 'T23:59:59.999Z'),
      },
      status: { $in: ['confirmed', 'posted'] },
    };

    const journalDocs = await db.find<any>('journals', filter, {
      sort: { entryDate: 1 },
    });

    // 仕訳をshinkoku形式に変換
    const journals: ShinkokuJournalExport[] = journalDocs.map((j: any) => ({
      fiscal_year: fiscalYear,
      date: new Date(j.entryDate).toISOString().split('T')[0],
      description: j.description || '',
      journal_id: j.journalNumber || j._id?.toString() || '',
      source: j.sourceType || 'manual',
      lines: (j.lines || []).map((line: any) => ({
        account_code: mapToShinkokuCode(line.accountCode),
        account_name: line.accountName || '',
        debit: line.debitAmount || 0,
        credit: line.creditAmount || 0,
        tax_category: getShinkokuTaxCategory(line.accountCode, line.taxRate),
      })),
    }));

    // 使用されている勘定科目一覧
    const usedCodes = new Set<string>();
    for (const j of journals) {
      for (const line of j.lines) {
        usedCodes.add(line.account_code);
      }
    }

    const chart_of_accounts: ShinkokuAccountExport[] = Array.from(usedCodes)
      .sort()
      .map((code) => {
        const master = SHINKOKU_MASTER_ACCOUNTS[code];
        return {
          code,
          name: master?.name || code,
          account_type: (master?.type || 'expense') as any,
          tax_category: master?.taxCategory || 'out_of_scope',
        };
      });

    return {
      fiscal_year: fiscalYear,
      period_start: periodStart,
      period_end: periodEnd,
      journal_count: journals.length,
      journals,
      chart_of_accounts,
    };
  }

  // ==========================================
  // 勘定科目マッピング検証
  // ==========================================

  async validateAccountMappings(): Promise<{
    total: number;
    mapped: number;
    unmapped: { accountCode: string; accountName: string }[];
  }> {
    const accounts = await db.find<Account>('accounts', {});
    const unmapped: { accountCode: string; accountName: string }[] = [];

    for (const account of accounts) {
      const result = validateShinkokuMapping(account.accountCode);
      if (!result.mapped) {
        unmapped.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
        });
      }
    }

    return {
      total: accounts.length,
      mapped: accounts.length - unmapped.length,
      unmapped,
    };
  }

  // ==========================================
  // プライベートヘルパー
  // ==========================================

  private computeBalance(
    accountType: string,
    debitTotal: number,
    creditTotal: number
  ): number {
    // 資産・費用: 借方残高（debit - credit）
    // 負債・純資産・収益: 貸方残高（credit - debit）
    if (accountType === 'asset' || accountType === 'expense') {
      return debitTotal - creditTotal;
    }
    return creditTotal - debitTotal;
  }

  private inferAccountType(accountCode: string): 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' {
    // 1. SHINKOKU_MASTER_ACCOUNTSから直接取得
    const master = SHINKOKU_MASTER_ACCOUNTS[accountCode];
    if (master) {
      return master.type as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    }

    // 2. レガシー3桁コードを4桁に変換して再検索
    const mapped = LEGACY_CODE_MAP[accountCode];
    if (mapped) {
      const mappedMaster = SHINKOKU_MASTER_ACCOUNTS[mapped];
      if (mappedMaster) {
        return mappedMaster.type as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      }
    }

    // 3. コード範囲で判定（4桁コード前提）
    const code = parseInt(accountCode, 10);
    if (code >= 1000 && code < 2000) return 'asset';
    if (code >= 2000 && code < 3000) return 'liability';
    if (code >= 3000 && code < 4000) return 'equity';
    if (code >= 4000 && code < 5000) return 'revenue';
    if (code >= 5000 && code < 7000) return 'expense';

    // 4. 3桁以下のコードもカバー（レガシー対応）
    if (code >= 100 && code < 200) return 'asset';
    if (code >= 200 && code < 300) return 'liability';
    if (code >= 300 && code < 400) return 'equity';
    if (code >= 400 && code < 500) return 'revenue';
    return 'expense';
  }

  private shiftDateByYear(dateStr: string, years: number): string {
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split('T')[0];
  }
}
