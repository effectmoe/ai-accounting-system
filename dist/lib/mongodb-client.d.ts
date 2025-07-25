import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
export declare class DatabaseError extends Error {
    code: string;
    constructor(message: string, code: string);
}
declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}
export declare function getDatabase(): Promise<Db>;
export declare function getCollection<T = any>(collectionName: string): Promise<Collection<T>>;
export declare function getClientPromise(): Promise<MongoClient>;
export declare function getMongoClient(): Promise<MongoClient>;
export declare const mongoClientPromise: Promise<MongoClient>;
export declare function getGridFSBucket(): Promise<any>;
export declare function withTransaction<T>(callback: (session: any) => Promise<T>): Promise<T>;
export declare class DatabaseService {
    private static instance;
    private constructor();
    static getInstance(): DatabaseService;
    create<T>(collectionName: string, document: Omit<T, '_id'>): Promise<T>;
    findById<T>(collectionName: string, id: string | ObjectId): Promise<T | null>;
    find<T>(collectionName: string, filter?: any, options?: {
        sort?: any;
        limit?: number;
        skip?: number;
        projection?: any;
    }): Promise<T[]>;
    update<T>(collectionName: string, id: string | ObjectId, update: Partial<T>): Promise<T | null>;
    delete(collectionName: string, id: string | ObjectId): Promise<boolean>;
    bulkInsert<T>(collectionName: string, documents: Omit<T, '_id'>[]): Promise<T[]>;
    count(collectionName: string, filter?: any): Promise<number>;
    aggregate<T>(collectionName: string, pipeline: any[]): Promise<T[]>;
    createIndex(collectionName: string, indexSpec: any, options?: any): Promise<string>;
    search<T>(collectionName: string, searchText: string, filter?: any, options?: any): Promise<T[]>;
    deleteMany(collectionName: string, filter?: any): Promise<number>;
    findMany<T>(collectionName: string, filter?: any, options?: {
        sort?: any;
        limit?: number;
        skip?: number;
        projection?: any;
    }): Promise<T[]>;
    updateMany<T>(collectionName: string, filter: any, update: Partial<T>): Promise<number>;
    findOne<T>(collectionName: string, filter?: any, options?: any): Promise<T | null>;
}
export declare function checkConnection(): Promise<boolean>;
export declare const Collections: {
    readonly INVOICES: "invoices";
    readonly RECEIPTS: "receipts";
    readonly DOCUMENTS: "documents";
    readonly COMPANIES: "companies";
    readonly ACCOUNTS: "accounts";
    readonly TRANSACTIONS: "transactions";
    readonly JOURNAL_ENTRIES: "journal_entries";
    readonly JOURNAL_ENTRY_LINES: "journal_entry_lines";
    readonly PARTNERS: "partners";
    readonly AUDIT_LOGS: "audit_logs";
    readonly OCR_RESULTS: "ocr_results";
    readonly IMPORT_BATCHES: "import_batches";
    readonly ITEMS: "items";
    readonly TAGS: "tags";
    readonly CUSTOMERS: "customers";
    readonly COMPANY_INFO: "companyInfo";
    readonly BANK_ACCOUNTS: "bankAccounts";
    readonly PRODUCTS: "products";
    readonly QUOTES: "quotes";
    readonly SUPPLIERS: "suppliers";
    readonly SUPPLIER_QUOTES: "supplierQuotes";
    readonly PURCHASE_ORDERS: "purchaseOrders";
};
export declare const db: DatabaseService;
export declare class VercelDatabaseService extends DatabaseService {
    private static instance;
    private constructor();
    static getInstance(): VercelDatabaseService;
    create<T>(collectionName: string, document: Omit<T, '_id'>): Promise<T>;
}
export declare const vercelDb: VercelDatabaseService;
declare const clientPromise: Promise<any>;
export default clientPromise;
