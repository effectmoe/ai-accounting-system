import { Invoice, InvoiceStatus } from '@/types/collections';
export interface InvoiceSearchParams {
    customerId?: string;
    status?: InvoiceStatus;
    dateFrom?: Date;
    dateTo?: Date;
    isGeneratedByAI?: boolean;
    limit?: number;
    skip?: number;
}
export interface InvoiceSearchResult {
    invoices: Invoice[];
    total: number;
    hasMore: boolean;
}
export declare class InvoiceService {
    private collectionName;
    searchInvoices(params: InvoiceSearchParams): Promise<InvoiceSearchResult>;
    createInvoice(invoiceData: Omit<Invoice, '_id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
    getInvoice(id: string): Promise<Invoice | null>;
    updateInvoice(id: string, updateData: Partial<Invoice>): Promise<Invoice | null>;
    deleteInvoice(id: string): Promise<boolean>;
    updateInvoiceStatus(id: string, status: InvoiceStatus, paidDate?: Date, paidAmount?: number): Promise<Invoice | null>;
    generateInvoiceNumber(format?: string): Promise<string>;
    recordPayment(id: string, paidAmount: number, paymentDate: Date): Promise<Invoice | null>;
    cancelInvoice(id: string): Promise<Invoice | null>;
    getMonthlyAggregation(year: number, month: number): Promise<any>;
}
