import { ObjectId } from 'mongodb';
export interface BaseDocument {
    _id?: ObjectId | string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface TimestampedDocument extends BaseDocument {
    createdAt: Date;
    updatedAt: Date;
}
export interface SoftDeletableDocument extends TimestampedDocument {
    deletedAt?: Date | null;
    isDeleted?: boolean;
}
export interface PaginationParams {
    page: number;
    limit: number;
    skip?: number;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export type SortOrder = 'asc' | 'desc' | 1 | -1;
export interface SortOptions<T> {
    field: keyof T;
    order: SortOrder;
}
export interface FilterOptions<T> {
    where?: Partial<T>;
    search?: string;
    searchFields?: (keyof T)[];
}
export interface QueryOptions<T> {
    filter?: FilterOptions<T>;
    sort?: SortOptions<T>;
    pagination?: PaginationParams;
    projection?: Partial<Record<keyof T, 0 | 1>>;
}
export interface OperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface BulkOperationResult {
    success: boolean;
    insertedCount: number;
    modifiedCount: number;
    deletedCount: number;
    errors?: string[];
}
export type AggregationPipeline = Array<Record<string, any>>;
export interface TransactionOptions {
    readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
    readConcern?: {
        level: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot';
    };
    writeConcern?: {
        w: number | 'majority';
        j?: boolean;
        wtimeout?: number;
    };
}
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
export interface AuditFields {
    createdBy?: string | ObjectId;
    updatedBy?: string | ObjectId;
    deletedBy?: string | ObjectId;
}
export interface AuditableDocument extends SoftDeletableDocument, AuditFields {
    version?: number;
    status?: EntityStatus;
}
export interface SearchableDocument extends BaseDocument {
    searchText?: string;
    searchKeywords?: string[];
    searchScore?: number;
}
export interface TaggableDocument extends BaseDocument {
    tags?: string[];
    categories?: string[];
}
export interface FileMetadata {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    encoding?: string;
    hash?: string;
    url?: string;
    publicUrl?: string;
    thumbnailUrl?: string;
}
export interface Address {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string;
    country?: string;
}
export interface ContactInfo {
    name?: string;
    nameKana?: string;
    email?: string;
    phone?: string;
    fax?: string;
    mobile?: string;
    position?: string;
    department?: string;
}
export interface MoneyAmount {
    amount: number;
    currency?: string;
    taxIncluded?: boolean;
}
export interface TaxCalculation {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    taxType?: '内税' | '外税';
}
export interface DateRange {
    start: Date | string;
    end: Date | string;
}
export interface ValidationError {
    field: string;
    message: string;
    code?: string;
    value?: any;
}
export interface ValidationResult {
    isValid: boolean;
    errors?: ValidationError[];
}
export type WithId<T> = T & {
    _id: ObjectId | string;
};
export type WithoutId<T> = Omit<T, '_id'>;
export type CreateInput<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, '_id' | 'createdAt' | 'updatedAt'>>;
export type ObjectIdString = string;
export type DateString = string;
export interface NumberRange {
    min?: number;
    max?: number;
}
export type StringEnum<T extends readonly string[]> = T[number];
export type Nullable<T> = T | null | undefined;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
