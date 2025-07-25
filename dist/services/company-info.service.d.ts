import { ObjectId } from 'mongodb';
import { SpeechSettings } from '@/types/collections';
export interface CompanyInfo {
    _id?: ObjectId;
    companyName: string;
    registrationNumber?: string;
    postalCode?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string;
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
    fiscalYearEnd?: string;
    invoiceNumberFormat?: string;
    invoicePrefix?: string;
    paymentTerms?: string;
    invoiceNotes?: string;
    logoUrl?: string;
    logoImage?: string;
    stampImage?: string;
    representative?: string;
    establishedDate?: string;
    capital?: number;
    quoteValidityDays?: number;
    speechSettings?: SpeechSettings;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class CompanyInfoService {
    private collectionName;
    getCompanyInfo(): Promise<CompanyInfo | null>;
    upsertCompanyInfo(companyData: Omit<CompanyInfo, '_id' | 'createdAt' | 'updatedAt'>): Promise<CompanyInfo>;
    updateCompanyInfo(updateData: Partial<CompanyInfo>): Promise<CompanyInfo | null>;
    deleteCompanyInfo(): Promise<boolean>;
    generateInvoiceNumber(): Promise<string>;
}
