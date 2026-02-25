// ===================================================
// 財務諸表 型定義
// B/S（貸借対照表）・P/L（損益計算書）・試算表・shinkokuエクスポート
// ===================================================

// === B/S サブカテゴリ ===
export type BSAccountSubcategory =
  | '流動資産'
  | '固定資産'
  | '繰延資産'
  | '流動負債'
  | '固定負債'
  | '株主資本';

// === P/L サブカテゴリ ===
export type PLAccountSubcategory =
  | '売上高'
  | '売上原価'
  | '販売費及び一般管理費'
  | '営業外収益'
  | '営業外費用'
  | '特別利益'
  | '特別損失';

// === 残高試算表 ===
export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  debitTotal: number;
  creditTotal: number;
  balance: number; // 資産・費用: debit - credit / 負債・純資産・収益: credit - debit
}

export interface TrialBalanceResult {
  dateFrom: string;
  dateTo: string;
  companyId: string;
  entries: TrialBalanceEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

// === 貸借対照表 (B/S) ===
export interface BSLineItem {
  accountCode: string;
  accountName: string;
  balance: number;
  subcategory: BSAccountSubcategory;
}

export interface BSSection {
  title: string;
  items: BSLineItem[];
  subtotal: number;
}

export interface BalanceSheetResult {
  asOfDate: string;
  fiscalYear: number;
  companyId: string;

  assets: {
    current: BSSection;   // 流動資産
    fixed: BSSection;     // 固定資産
    deferred: BSSection;  // 繰延資産
    total: number;
  };

  liabilities: {
    current: BSSection;   // 流動負債
    fixed: BSSection;     // 固定負債
    total: number;
  };

  equity: {
    capital: BSSection;   // 株主資本（元入金・繰越利益等）
    total: number;
  };

  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  balanceDifference: number;
}

// === 損益計算書 (P/L) ===
export interface PLLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
  subcategory: PLAccountSubcategory;
  previousYearAmount?: number;
}

export interface PLSection {
  title: string;
  items: PLLineItem[];
  subtotal: number;
  previousYearSubtotal?: number;
}

export interface ProfitLossResult {
  periodStart: string;
  periodEnd: string;
  fiscalYear: number;
  companyId: string;

  revenue: PLSection;              // 売上高
  costOfGoodsSold: PLSection;      // 売上原価
  grossProfit: number;             // 売上総利益

  sellingAndAdmin: PLSection;      // 販売費及び一般管理費
  operatingProfit: number;         // 営業利益

  nonOperatingRevenue: PLSection;  // 営業外収益
  nonOperatingExpenses: PLSection; // 営業外費用
  ordinaryProfit: number;          // 経常利益

  extraordinaryGains: PLSection;   // 特別利益
  extraordinaryLosses: PLSection;  // 特別損失
  profitBeforeTax: number;         // 税引前当期純利益

  netIncome: number;               // 当期純利益

  previousYear?: {
    grossProfit: number;
    operatingProfit: number;
    ordinaryProfit: number;
    netIncome: number;
  };
}

// === P/L 生成オプション ===
export interface ProfitLossOptions {
  includeYoY?: boolean;
}

// === shinkoku エクスポート ===
export interface ShinkokuJournalLineExport {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  tax_category: string; // 'taxable_10' | 'taxable_8' | 'non_taxable' | 'out_of_scope'
}

export interface ShinkokuJournalExport {
  fiscal_year: number;
  date: string;
  description: string;
  journal_id: string;
  source: string;
  lines: ShinkokuJournalLineExport[];
}

export interface ShinkokuAccountExport {
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  tax_category: string;
}

export interface ShinkokuExportResult {
  fiscal_year: number;
  period_start: string;
  period_end: string;
  journal_count: number;
  journals: ShinkokuJournalExport[];
  chart_of_accounts: ShinkokuAccountExport[];
}

// === shinkoku ブリッジ ===
export interface ShinkokuConfig {
  taxpayer: {
    name: string;
    dateOfBirth?: string;
    taxId?: string;
  };
  business: {
    tradeName: string;
    industryType: string;
  };
  filing: {
    blueReturnType: 'complex' | 'simple';
    eTaxSubmission: boolean;
  };
}

export interface ShinkokuStatus {
  installed: boolean;
  version?: string;
  dbInitialized: boolean;
  lastImportDate?: string;
  journalCount?: number;
}

export interface ShinkokuProcessResult {
  success: boolean;
  output?: string;
  error?: string;
}
