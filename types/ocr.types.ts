/**
 * OCR Type Definitions
 * 
 * Comprehensive type definitions for OCR processing throughout the application
 */

import { ObjectId } from 'mongodb';

/**
 * Document types supported by the system
 */
export type DocumentType = 'invoice' | 'receipt' | 'estimate' | 'delivery_note' | 'quotation' | 'purchase_order';

/**
 * Receipt types for specialized processing
 */
export type ReceiptType = 'parking' | 'general' | 'transport' | 'meal' | 'accommodation';

/**
 * Document status values
 */
export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'processed';

/**
 * Bank account types
 */
export type BankAccountType = '普通' | '当座' | 'savings' | 'checking';

/**
 * Vendor/Partner information structure
 */
export interface VendorInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  fax?: string;
  postalCode?: string;
  registrationNumber?: string;
}

/**
 * Customer information structure
 */
export interface CustomerInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  department?: string;
  contactPerson?: string;
}

/**
 * Bank transfer information
 */
export interface BankTransferInfo {
  bankName?: string;
  branchName?: string;
  accountType?: BankAccountType;
  accountNumber?: string;
  accountName?: string;
  swiftCode?: string;
  additionalInfo?: string;
}

/**
 * Line item in a document
 */
export interface DocumentItem {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  taxRate: number;
  amount: number;
  category?: string;
  notes?: string;
}

/**
 * AI prediction result for account categories
 */
export interface AIPrediction {
  category: string;
  confidence: number;
  reasoning?: string;
  alternativeCategories?: Array<{
    category: string;
    confidence: number;
  }>;
  taxNotes?: string;
  sources?: string[];
  predictedAt: Date;
}

/**
 * Structured invoice data from AI-driven OCR
 */
export interface StructuredInvoiceData {
  // Document identification
  documentNumber?: string;
  documentType: DocumentType;
  receiptType?: ReceiptType;
  
  // Basic information
  subject?: string;
  issueDate: string;
  dueDate?: string;
  
  // Parties involved
  vendor: VendorInfo;
  customer: CustomerInfo;
  
  // Financial details
  items: DocumentItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  
  // Payment information
  paymentTerms?: string;
  paymentMethod?: string;
  paymentAmount?: number;
  changeAmount?: number;
  bankTransferInfo?: BankTransferInfo;
  
  // Additional information
  notes?: string;
  deliveryLocation?: string;
  quotationValidity?: string;
  
  // Parking-specific fields
  facilityName?: string;
  companyName?: string;
  entryTime?: string;
  exitTime?: string;
  parkingDuration?: string;
  baseFee?: number;
  additionalFee?: number;
  
  // Metadata
  confidence?: number;
  processingTime?: number;
  extractedAt?: Date;
}

/**
 * MongoDB document structure
 */
export interface MongoDocument {
  _id?: ObjectId;
  companyId: string;
  documentType: DocumentType;
  type: string; // Legacy field for compatibility
  documentNumber: string;
  displayNumber: string;
  issueDate: string;
  dueDate?: string;
  
  // Partner information
  partnerName: string;
  partnerAddress?: string;
  partnerPhone?: string;
  partnerEmail?: string;
  partnerFax?: string;
  partnerPostalCode?: string;
  
  // Project/Subject
  projectName?: string;
  subject?: string;
  
  // Financial summary
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  
  // Status and metadata
  status: DocumentStatus;
  notes?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  
  // AI predictions
  aiPrediction?: AIPrediction;
  
  // OCR source information
  ocrResultId?: ObjectId;
  originalOcrData?: string;
  sourceFileId?: ObjectId;
  
  // Parking-specific fields (snake_case for MongoDB)
  receipt_type?: ReceiptType;
  facility_name?: string;
  company_name?: string;
  entry_time?: string;
  exit_time?: string;
  parking_duration?: string;
  base_fee?: number;
  additional_fee?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

/**
 * MongoDB item structure
 */
export interface MongoItem {
  _id?: ObjectId;
  documentId: ObjectId;
  itemOrder: number;
  itemName: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
  category?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OCR result structure in MongoDB
 */
export interface OCRResult {
  _id?: ObjectId;
  companyId: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  
  // Processing status
  status: 'pending' | 'processing' | 'processed' | 'failed';
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  processingTime?: number;
  
  // Extracted data
  extractedData?: any;
  ocrResult?: any;
  structuredData?: StructuredInvoiceData;
  
  // Linked document
  linkedDocumentId?: ObjectId;
  documentType?: DocumentType;
  
  // Quality metrics
  confidence?: number;
  warnings?: string[];
  errors?: string[];
  
  // File storage
  sourceFileId?: ObjectId;
  gridfsFileId?: ObjectId;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API request structure for creating document from OCR
 */
export interface CreateDocumentFromOCRRequest {
  // For AI-driven processing
  aiStructuredData?: StructuredInvoiceData;
  
  // For simple/legacy processing
  ocrResultId?: string;
  document_type?: DocumentType;
  vendor_name?: string;
  receipt_date?: string;
  subtotal_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  payment_amount?: number;
  change_amount?: number;
  receipt_number?: string;
  store_name?: string;
  store_phone?: string;
  company_name?: string;
  notes?: string;
  file_name?: string;
  
  // Common fields
  companyId?: string;
  approvedBy?: string;
  extracted_text?: string;
  
  // Parking-specific fields
  receiptType?: ReceiptType;
  facilityName?: string;
  entryTime?: string;
  exitTime?: string;
  parkingDuration?: string;
  baseFee?: number;
  additionalFee?: number;
}

/**
 * API response structure
 */
export interface CreateDocumentFromOCRResponse {
  id: string;
  message: string;
  processingMethod?: 'AI-driven' | 'Legacy' | 'Simple';
  extractedData?: any;
  summary?: {
    documentId: string;
    documentNumber: string;
    documentType: DocumentType;
    totalFieldsExtracted: number;
    itemsCount: number;
    totalAmount: number;
  };
}

/**
 * Processing configuration
 */
export interface OCRProcessingConfig {
  useAIOrchestrator: boolean;
  enableAccountPrediction: boolean;
  confidenceThreshold: number;
  maxProcessingTime: number;
  retryAttempts: number;
  defaultCompanyId: string;
}