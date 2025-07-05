import { createClient } from '@supabase/supabase-js';
import { OCRResult } from '@/lib/ocr-processor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface JournalEntry {
  id?: string;
  companyId: string;
  entryDate: string;
  entryNumber?: string;
  description: string;
  lines: JournalEntryLine[];
  sourceType: 'manual' | 'ocr' | 'import' | 'document';
  sourceDocumentId?: string;
  status: 'draft' | 'posted' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalEntryLine {
  id?: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  taxRate?: number;
  taxAmount?: number;
  isTaxIncluded?: boolean;
  partnerId?: string;
  departmentId?: string;
  memoTagId?: string;
  notes?: string;
}

export class JournalService {
  /**
   * 仕訳を保存
   */
  static async saveJournalEntry(
    entry: JournalEntry,
    userId?: string
  ): Promise<JournalEntry> {
    try {
      // 仕訳番号を生成（未設定の場合）
      if (!entry.entryNumber) {
        entry.entryNumber = await this.generateEntryNumber(entry.companyId, entry.entryDate);
      }

      // 仕訳本体を保存
      const { data: savedEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: entry.companyId,
          entry_date: entry.entryDate,
          entry_number: entry.entryNumber,
          description: entry.description,
          source_type: entry.sourceType,
          source_document_id: entry.sourceDocumentId,
          status: entry.status || 'draft',
          created_by: userId
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // 仕訳明細を保存
      const linesToInsert = entry.lines.map((line, index) => ({
        journal_entry_id: savedEntry.id,
        line_order: index + 1,
        account_id: line.accountId,
        account_code: line.accountCode,
        account_name: line.accountName,
        debit_amount: line.debitAmount,
        credit_amount: line.creditAmount,
        tax_rate: line.taxRate,
        tax_amount: line.taxAmount,
        is_tax_included: line.isTaxIncluded,
        partner_id: line.partnerId,
        department_id: line.departmentId,
        memo_tag_id: line.memoTagId,
        notes: line.notes
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;

      return {
        ...entry,
        id: savedEntry.id,
        createdAt: savedEntry.created_at,
        updatedAt: savedEntry.updated_at
      };
    } catch (error) {
      console.error('Error saving journal entry:', error);
      throw new Error('仕訳の保存に失敗しました');
    }
  }

  /**
   * OCR結果から仕訳を作成
   */
  static async createJournalEntryFromOCR(
    ocrResult: OCRResult,
    journalData: {
      date: string;
      description: string;
      debitAccount: string;
      creditAccount: string;
      amount: number;
      taxAmount: number;
      taxRate: number;
      isTaxIncluded: boolean;
    },
    companyId: string,
    ocrResultId: string,
    userId?: string
  ): Promise<JournalEntry> {
    try {
      // 勘定科目を取得
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('company_id', companyId)
        .in('name', [journalData.debitAccount, journalData.creditAccount]);

      const debitAccount = accounts?.find(a => a.name === journalData.debitAccount);
      const creditAccount = accounts?.find(a => a.name === journalData.creditAccount);

      if (!debitAccount || !creditAccount) {
        throw new Error('勘定科目が見つかりません');
      }

      // 仕訳エントリを作成
      const entry: JournalEntry = {
        companyId,
        entryDate: journalData.date,
        description: journalData.description,
        sourceType: 'ocr',
        status: 'draft',
        lines: [
          {
            accountId: debitAccount.id,
            accountCode: debitAccount.code,
            accountName: debitAccount.name,
            debitAmount: journalData.amount,
            creditAmount: 0,
            taxRate: journalData.taxRate,
            taxAmount: journalData.taxAmount,
            isTaxIncluded: journalData.isTaxIncluded
          },
          {
            accountId: creditAccount.id,
            accountCode: creditAccount.code,
            accountName: creditAccount.name,
            debitAmount: 0,
            creditAmount: journalData.amount,
            taxRate: journalData.taxRate,
            taxAmount: journalData.taxAmount,
            isTaxIncluded: journalData.isTaxIncluded
          }
        ]
      };

      // 仕訳を保存
      const savedEntry = await this.saveJournalEntry(entry, userId);

      // OCR結果に仕訳IDを紐付け
      await supabase
        .from('ocr_results')
        .update({ journal_entry_id: savedEntry.id })
        .eq('id', ocrResultId);

      return savedEntry;
    } catch (error) {
      console.error('Error creating journal entry from OCR:', error);
      throw error;
    }
  }

  /**
   * 仕訳番号を生成
   */
  private static async generateEntryNumber(
    companyId: string,
    entryDate: string
  ): Promise<string> {
    const year = new Date(entryDate).getFullYear();
    const month = String(new Date(entryDate).getMonth() + 1).padStart(2, '0');
    
    // 当月の最新番号を取得
    const { data, error } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', companyId)
      .gte('entry_date', `${year}-${month}-01`)
      .lt('entry_date', `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`)
      .order('entry_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (data && data.length > 0 && data[0].entry_number) {
      const match = data[0].entry_number.match(/\d+$/);
      if (match) {
        sequence = parseInt(match[0]) + 1;
      }
    }

    return `J${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * 仕訳を取得
   */
  static async getJournalEntry(entryId: string): Promise<JournalEntry | null> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (*)
        `)
        .eq('id', entryId)
        .single();

      if (error) throw error;

      return this.mapToJournalEntry(data);
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      return null;
    }
  }

  /**
   * 仕訳一覧を取得
   */
  static async getJournalEntries(
    companyId: string,
    filters?: {
      status?: string;
      sourceType?: string;
      dateFrom?: string;
      dateTo?: string;
      accountId?: string;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ entries: JournalEntry[]; total: number }> {
    try {
      let query = supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (*)
        `, { count: 'exact' })
        .eq('company_id', companyId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.sourceType) {
        query = query.eq('source_type', filters.sourceType);
      }
      if (filters?.dateFrom) {
        query = query.gte('entry_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('entry_date', filters.dateTo);
      }

      query = query
        .order('entry_date', { ascending: false })
        .order('entry_number', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const entries = data?.map(entry => this.mapToJournalEntry(entry)) || [];

      return {
        entries,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return { entries: [], total: 0 };
    }
  }

  /**
   * 仕訳を転記（ステータスを posted に更新）
   */
  static async postJournalEntry(entryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .eq('status', 'draft'); // draft状態のみ転記可能

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error posting journal entry:', error);
      return false;
    }
  }

  /**
   * データベースの結果をJournalEntryにマッピング
   */
  private static mapToJournalEntry(dbEntry: any): JournalEntry {
    return {
      id: dbEntry.id,
      companyId: dbEntry.company_id,
      entryDate: dbEntry.entry_date,
      entryNumber: dbEntry.entry_number,
      description: dbEntry.description,
      sourceType: dbEntry.source_type,
      sourceDocumentId: dbEntry.source_document_id,
      status: dbEntry.status,
      createdAt: dbEntry.created_at,
      updatedAt: dbEntry.updated_at,
      lines: dbEntry.journal_entry_lines?.sort((a: any, b: any) => a.line_order - b.line_order).map((line: any) => ({
        id: line.id,
        accountId: line.account_id,
        accountCode: line.account_code,
        accountName: line.account_name,
        debitAmount: parseFloat(line.debit_amount || '0'),
        creditAmount: parseFloat(line.credit_amount || '0'),
        taxRate: line.tax_rate ? parseFloat(line.tax_rate) : undefined,
        taxAmount: line.tax_amount ? parseFloat(line.tax_amount) : undefined,
        isTaxIncluded: line.is_tax_included,
        partnerId: line.partner_id,
        departmentId: line.department_id,
        memoTagId: line.memo_tag_id,
        notes: line.notes
      })) || []
    };
  }
}