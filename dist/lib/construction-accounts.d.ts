export interface ConstructionAccount {
    code: string;
    name: string;
    category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    industry: 'construction';
    taxType?: 'taxable_10' | 'taxable_8' | 'non_taxable';
    description?: string;
}
export declare const CONSTRUCTION_ACCOUNTS: ConstructionAccount[];
export declare const CONSTRUCTION_KEYWORDS: Record<string, string>;
export declare function getConstructionAccountByKeyword(description: string): ConstructionAccount | null;
export declare function getConstructionAccountByCode(code: string): ConstructionAccount | null;
export declare function getConstructionAccountByName(name: string): ConstructionAccount | null;
