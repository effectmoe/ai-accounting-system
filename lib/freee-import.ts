// Freee CSV Import Module
import { parse } from 'csv-parse/sync';
import * as fs from 'fs/promises';
import * as iconv from 'iconv-lite';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase-singleton';

// Freee Partner Schema
const FreeePartnerSchema = z.object({
  '名前（通称）': z.string(),
  'ショートカット1': z.string().optional(),
  'ショートカット2': z.string().optional(),
  '正式名称（帳票出力時に使用される名称）': z.string().optional(),
  'カナ名称': z.string().optional(),
  '敬称': z.string().optional(),
  '事業所種別': z.string().optional(),
  '地域': z.string().optional(),
  '郵便番号': z.string().optional(),
  '都道府県': z.string().optional(),
  '市区町村・番地': z.string().optional(),
  '建物名・部屋番号など': z.string().optional(),
  '電話番号': z.string().optional(),
  '営業担当者名': z.string().optional(),
  '営業担当者メールアドレス': z.string().optional(),
  '適格請求書発行事業者の登録番号': z.string().optional(),
});

// Freee Account Item Schema
const FreeeAccountItemSchema = z.object({
  '勘定科目': z.string(),
  '表示名（決算書）': z.string().optional(),
  '小分類': z.string().optional(),
  '中分類': z.string().optional(),
  '大分類': z.string().optional(),
  '収入取引相手方勘定科目': z.string().optional(),
  '支出取引相手方勘定科目': z.string().optional(),
  '税区分': z.string().optional(),
  'ショートカット1': z.string().optional(),
  'ショートカット2': z.string().optional(),
  '入力候補': z.string().optional(),
  '補助科目優先タグ': z.string().optional(),
});

// Freee Transaction Schema (仕訳帳)
const FreeeTransactionSchema = z.object({
  '発生日': z.string(),
  '決済期日': z.string().optional(),
  '取引先': z.string().optional(),
  '勘定科目': z.string(),
  '税区分': z.string().optional(),
  '金額': z.string(),
  '税額': z.string().optional(),
  'タグ': z.string().optional(),
  'メモ': z.string().optional(),
  '品目': z.string().optional(),
  '部門': z.string().optional(),
  'セグメント1': z.string().optional(),
  'セグメント2': z.string().optional(),
  'セグメント3': z.string().optional(),
  '備考': z.string().optional(),
});

// Freee Deal Schema (取引データ)
const FreeeDealSchema = z.object({
  '収支区分': z.string(),
  '管理番号': z.string().optional(),
  '発生日': z.string(),
  '支払期日': z.string().optional(),
  '取引先': z.string().optional(),
  '勘定科目': z.string(),
  '税区分': z.string(),
  '金額': z.string(),
  '内消費税等': z.string().optional(),
  '税額': z.string().optional(),
  '備考': z.string().optional(),
  '品目': z.string().optional(),
  '部門': z.string().optional(),
  'メモタグ（複数指定可、カンマ区切り）': z.string().optional(),
  '支払日': z.string().optional(),
  '支払口座': z.string().optional(),
  '支払金額': z.string().optional(),
});

// Freee Item Schema
const FreeeItemSchema = z.object({
  '種類': z.string(),
  '品目': z.string(),
  'ショートカット1': z.string().optional(),
  'ショートカット2': z.string().optional(),
  '単位': z.string().optional(),
  '入力候補': z.string().optional(),
});

// Freee Memo Tag Schema
const FreeeMemoTagSchema = z.object({
  'メモタグ': z.string(),
  '入力候補': z.string().optional(),
});

// Freee Department Schema
const FreeeDepartmentSchema = z.object({
  '部門': z.string(),
  '部門コード': z.string().optional(),
  '親部門': z.string().optional(),
  '入力候補': z.string().optional(),
});

export interface ImportOptions {
  companyId: string;
  fileType: 'partners' | 'accounts' | 'transactions' | 'items' | 'tags' | 'departments';
  encoding?: 'utf8' | 'sjis';
  dryRun?: boolean;
}

export class FreeeImporter {
  private supabase: ReturnType<typeof getSupabaseClient>;
  
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // supabaseUrl と supabaseKey が提供された場合は警告を表示
    if (supabaseUrl || supabaseKey) {
      console.warn('FreeeImporter: supabaseUrl and supabaseKey parameters are deprecated. Using singleton instance.');
    }
    this.supabase = getSupabaseClient();
  }
  
  async importFile(filePath: string, options: ImportOptions) {
    const { fileType, encoding = 'sjis', dryRun = false, companyId } = options;
    
    console.log(`[Freee Import] Starting import of ${fileType} from ${filePath}`);
    
    // Read and decode file
    const buffer = await fs.readFile(filePath);
    const content = encoding === 'sjis' 
      ? iconv.decode(buffer, 'Shift_JIS')
      : buffer.toString('utf8');
    
    // Parse CSV
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    });
    
    // Debug: Log first record keys
    if (records.length > 0) {
      console.log('[Freee Import] CSV headers:', Object.keys(records[0]));
      console.log('[Freee Import] First record:', records[0]);
      
      // Additional debug for partner import
      if (fileType === 'partners') {
        console.log('[Freee Import] Debug - Looking for field "名前（通称）"');
        console.log('[Freee Import] Debug - Available fields:', Object.keys(records[0]).map(k => `"${k}"`).join(', '));
      }
    }
    
    console.log(`[Freee Import] Found ${records.length} records`);
    
    switch (fileType) {
      case 'partners':
        return await this.importPartners(records, companyId, dryRun);
      case 'accounts':
        return await this.importAccounts(records, companyId, dryRun);
      case 'transactions':
        return await this.importTransactions(records, companyId, dryRun);
      case 'items':
        return await this.importItems(records, companyId, dryRun);
      case 'tags':
        return await this.importMemoTags(records, companyId, dryRun);
      case 'departments':
        return await this.importDepartments(records, companyId, dryRun);
      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }
  }
  
  private async importPartners(records: any[], companyId: string, dryRun: boolean) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    for (const record of records) {
      try {
        const validated = FreeePartnerSchema.parse(record);
        
        // Generate customer code
        const customerCode = this.generateCustomerCode(validated['名前（通称）']);
        
        const customerData = {
          company_id: companyId,
          customer_code: customerCode,
          name: validated['正式名称（帳票出力時に使用される名称）'] || validated['名前（通称）'],
          name_kana: validated['カナ名称'] || '',
          type: validated['事業所種別'] === '法人' ? 'corporate' : 'individual',
          tax_number: validated['適格請求書発行事業者の登録番号'] || null,
          postal_code: validated['郵便番号'] || null,
          prefecture: validated['都道府県'] || null,
          city: validated['市区町村・番地'] || null,
          address: validated['建物名・部屋番号など'] || null,
          phone: validated['電話番号'] || null,
          email: validated['営業担当者メールアドレス'] || null,
          person_in_charge: validated['営業担当者名'] || null,
          payment_terms: 30, // Default
          is_active: true,
        };
        
        if (!dryRun) {
          const { error } = await this.supabase
            .from('customers')
            .upsert(customerData, { onConflict: 'company_id,customer_code' });
            
          if (error) throw error;
        }
        
        console.log(`[Freee Import] Imported partner: ${customerData.name}`);
        results.success++;
        
      } catch (error) {
        console.error(`[Freee Import] Failed to import partner:`, error);
        results.failed++;
        results.errors.push({ record, error });
      }
    }
    
    return results;
  }
  
  private async importAccounts(records: any[], companyId: string, dryRun: boolean) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    for (const record of records) {
      try {
        const validated = FreeeAccountItemSchema.parse(record);
        
        let accountType = this.mapAccountType(validated['大分類'] || '');
        
        // freeeの「負債及び純資産」カテゴリの場合、名前から判定
        if (validated['大分類'] === '負債及び純資産') {
          if (validated['勘定科目'].includes('資本') || 
              validated['勘定科目'].includes('剰余金') ||
              validated['勘定科目'].includes('利益') ||
              validated['勘定科目'].includes('株式')) {
            accountType = 'equity';
          } else {
            accountType = 'liability';
          }
        }
        
        // freeeの「損益」カテゴリの場合、名前から判定
        if (validated['大分類'] === '損益') {
          if (validated['勘定科目'].includes('売上') || 
              validated['勘定科目'].includes('収入') ||
              validated['勘定科目'].includes('収益') ||
              validated['勘定科目'].includes('受取')) {
            accountType = 'revenue';
          } else {
            accountType = 'expense';
          }
        }
        
        // Generate account code based on account name
        const accountCode = this.generateAccountCode(validated['勘定科目'], accountType);
        
        const accountData = {
          company_id: companyId,
          code: accountCode,
          name: validated['勘定科目'],
          name_kana: '', // freeeにはカナ名称がない
          account_type: accountType,
          tax_category: validated['税区分'] || null,
          display_name: validated['表示名（決算書）'] || validated['勘定科目'],
          balance: 0,
          is_active: true,
          meta_data: {
            small_category: validated['小分類'],
            medium_category: validated['中分類'],
            large_category: validated['大分類'],
            shortcut1: validated['ショートカット1'],
            shortcut2: validated['ショートカット2'],
          },
        };
        
        if (!dryRun) {
          const { error } = await this.supabase
            .from('accounts')
            .upsert(accountData, { onConflict: 'company_id,code' });
            
          if (error) throw error;
        }
        
        console.log(`[Freee Import] Imported account: ${accountData.name}`);
        results.success++;
        
      } catch (error) {
        console.error(`[Freee Import] Failed to import account:`, error);
        results.failed++;
        results.errors.push({ record, error });
      }
    }
    
    return results;
  }
  
  private async importTransactions(records: any[], companyId: string, dryRun: boolean) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    for (const record of records) {
      try {
        const validated = FreeeTransactionSchema.parse(record);
        
        // Parse amount and determine transaction type
        const amount = parseFloat(validated['金額'].replace(/[,円]/g, ''));
        const taxAmount = validated['税額'] ? parseFloat(validated['税額'].replace(/[,円]/g, '')) : 0;
        const transactionType = amount > 0 ? 'income' : 'expense';
        
        // Generate transaction number
        const transactionNumber = await this.generateTransactionNumber(companyId, validated['発生日']);
        
        const transactionData = {
          company_id: companyId,
          transaction_number: transactionNumber,
          type: transactionType,
          status: 'completed',
          transaction_date: this.parseDate(validated['発生日']),
          due_date: validated['決済期日'] ? this.parseDate(validated['決済期日']) : null,
          description: validated['備考'] || validated['品目'] || validated['メモ'] || validated['勘定科目'],
          amount: Math.abs(amount),
          tax_amount: Math.abs(taxAmount),
          partner_name: validated['取引先'] || null,
          tags: validated['タグ'] ? [validated['タグ']] : [],
          department: validated['部門'] || null,
          segment1: validated['セグメント1'] || null,
          segment2: validated['セグメント2'] || null,
          segment3: validated['セグメント3'] || null,
        };
        
        if (!dryRun) {
          // Insert transaction
          const { data: transaction, error: txError } = await this.supabase
            .from('transactions')
            .insert(transactionData)
            .select()
            .single();
            
          if (txError) throw txError;
          
          // Get account ID
          const { data: account, error: accError } = await this.supabase
            .from('accounts')
            .select('id')
            .eq('company_id', companyId)
            .eq('name', validated['勘定科目'])
            .single();
            
          if (accError) {
            console.warn(`Account not found: ${validated['勘定科目']}`);
          } else {
            // Create transaction line
            const lineData = {
              transaction_id: transaction.id,
              account_id: account.id,
              debit_amount: transactionType === 'expense' ? Math.abs(amount) : 0,
              credit_amount: transactionType === 'income' ? Math.abs(amount) : 0,
              tax_rate: taxAmount > 0 ? (taxAmount / amount) : 0,
              tax_amount: Math.abs(taxAmount),
              description: validated['品目'] || validated['勘定科目'],
            };
            
            const { error: lineError } = await this.supabase
              .from('transaction_lines')
              .insert(lineData);
              
            if (lineError) throw lineError;
          }
        }
        
        console.log(`[Freee Import] Imported transaction: ${transactionData.description}`);
        results.success++;
        
      } catch (error) {
        console.error(`[Freee Import] Failed to import transaction:`, error);
        results.failed++;
        results.errors.push({ record, error });
      }
    }
    
    return results;
  }
  
  private generateCustomerCode(name: string): string {
    // Simple customer code generation
    const cleanName = name.replace(/[株式会社|有限会社|\s]/g, '');
    const prefix = cleanName.slice(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${random}`;
  }
  
  private async generateTransactionNumber(companyId: string, date: string): Promise<string> {
    const year = new Date(this.parseDate(date)).getFullYear();
    const { count } = await this.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('transaction_number', `TXN-${year}-%`);
      
    const nextNumber = (count || 0) + 1;
    return `TXN-${year}-${nextNumber.toString().padStart(5, '0')}`;
  }
  
  private parseDate(dateStr: string): string {
    // Handle various date formats from freee
    // Example: "2024/06/15", "2024-06-15", "2024年6月15日"
    const cleaned = dateStr.replace(/[年月日]/g, '-').replace(/\//g, '-');
    const parts = cleaned.split('-').filter(p => p);
    
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Fallback to current date if parsing fails
    return new Date().toISOString().split('T')[0];
  }
  
  private mapAccountType(category: string): string {
    const mapping: Record<string, string> = {
      '資産': 'asset',
      '流動資産': 'asset',
      '固定資産': 'asset',
      '繰延資産': 'asset',
      '負債': 'liability',
      '流動負債': 'liability',
      '固定負債': 'liability',
      '純資産': 'equity',
      '資本': 'equity',
      '収益': 'revenue',
      '売上高': 'revenue',
      '営業外収益': 'revenue',
      '特別利益': 'revenue',
      '費用': 'expense',
      '売上原価': 'expense',
      '販管費': 'expense',
      '営業外費用': 'expense',
      '特別損失': 'expense',
      // freee特有のカテゴリ
      '負債及び純資産': 'liability', // デフォルトは負債として、後で名前から判定
      '損益': 'expense', // デフォルトは費用として、後で名前から判定
      '振替': 'expense', // 振替仕訳用
    };
    
    return mapping[category] || 'expense';
  }
  
  private generateAccountCode(name: string, type: string): string {
    // Account code mapping based on standard Japanese accounting
    const codeMapping: Record<string, string> = {
      // Assets
      '現金': '101',
      '当座預金': '102',
      '普通預金': '102',
      '売掛金': '103',
      '未収入金': '104',
      // Liabilities
      '買掛金': '201',
      '未払金': '202',
      '預り金': '203',
      // Equity
      '資本金': '301',
      '繰越利益剰余金': '302',
      // Revenue
      '売上高': '401',
      '受取利息': '402',
      // Expenses
      '仕入高': '501',
      '外注費': '502',
      '交通費': '503',
      '通信費': '504',
      '消耗品費': '505',
    };
    
    // Check for exact match
    if (codeMapping[name]) {
      return codeMapping[name];
    }
    
    // Generate based on type
    const typePrefix: Record<string, string> = {
      'asset': '1',
      'liability': '2',
      'equity': '3',
      'revenue': '4',
      'expense': '5',
    };
    
    const prefix = typePrefix[type] || '9';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `${prefix}${(hash % 100).toString().padStart(2, '0')}`;
  }
  
  private async importItems(records: any[], companyId: string, dryRun: boolean) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    for (const record of records) {
      try {
        const validated = FreeeItemSchema.parse(record);
        
        // 品目のみをインポート（種類が「品目」のもの）
        if (validated['種類'] !== '品目') {
          continue;
        }
        
        const itemData = {
          company_id: companyId,
          name: validated['品目'],
          shortcut1: validated['ショートカット1'] || null,
          shortcut2: validated['ショートカット2'] || null,
          unit: validated['単位'] || null,
          is_active: validated['入力候補'] === '使用する',
        };
        
        if (!dryRun) {
          const { error } = await this.supabase
            .from('items')
            .upsert(itemData, { onConflict: 'company_id,name' });
            
          if (error) throw error;
        }
        
        console.log(`[Freee Import] Imported item: ${itemData.name}`);
        results.success++;
        
      } catch (error) {
        console.error(`[Freee Import] Failed to import item:`, error);
        results.failed++;
        results.errors.push({ record, error });
      }
    }
    
    return results;
  }
  
  private async importMemoTags(records: any[], companyId: string, dryRun: boolean) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    for (const record of records) {
      try {
        const validated = FreeeMemoTagSchema.parse(record);
        
        const tagData = {
          company_id: companyId,
          name: validated['メモタグ'],
          is_active: validated['入力候補'] === '使用する',
        };
        
        if (!dryRun) {
          const { error } = await this.supabase
            .from('memo_tags')
            .upsert(tagData, { onConflict: 'company_id,name' });
            
          if (error) throw error;
        }
        
        console.log(`[Freee Import] Imported memo tag: ${tagData.name}`);
        results.success++;
        
      } catch (error) {
        console.error(`[Freee Import] Failed to import memo tag:`, error);
        results.failed++;
        results.errors.push({ record, error });
      }
    }
    
    return results;
  }
  
  private async importDepartments(records: any[], companyId: string, dryRun: boolean) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    // 部門コードを生成
    let departmentCounter = 1;
    
    for (const record of records) {
      try {
        const validated = FreeeDepartmentSchema.parse(record);
        
        const departmentData = {
          company_id: companyId,
          code: validated['部門コード'] || `DEPT${departmentCounter.toString().padStart(3, '0')}`,
          name: validated['部門'],
          is_active: validated['入力候補'] === '使用する',
        };
        
        if (!validated['部門コード']) {
          departmentCounter++;
        }
        
        if (!dryRun) {
          const { error } = await this.supabase
            .from('departments')
            .upsert(departmentData, { onConflict: 'company_id,code' });
            
          if (error) throw error;
        }
        
        console.log(`[Freee Import] Imported department: ${departmentData.name}`);
        results.success++;
        
      } catch (error) {
        console.error(`[Freee Import] Failed to import department:`, error);
        results.failed++;
        results.errors.push({ record, error });
      }
    }
    
    return results;
  }
}