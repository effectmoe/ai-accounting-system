/**
 * OCR Document Service Tests
 * 
 * Comprehensive test suite for the refactored OCR document service
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OCRDocumentService } from '@/services/ocr-document.service';
import { DatabaseService } from '@/lib/mongodb-client';
import { AccountCategoryAI } from '@/lib/account-category-ai';
import {
  convertToSnakeCase,
  copyAllFields,
  generateDocumentNumber,
  extractPartnerName,
  calculateSubtotal,
  buildComprehensiveNotes,
  validateOCRData
} from '@/lib/ocr-utils';
import {
  StructuredInvoiceData,
  CreateDocumentFromOCRRequest,
  DocumentType
} from '@/types/ocr.types';

// Mock dependencies
jest.mock('@/lib/mongodb-client');
jest.mock('@/lib/account-category-ai');
jest.mock('@/lib/logger');

describe('OCR Utility Functions', () => {
  describe('convertToSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(convertToSnakeCase('documentType')).toBe('document_type');
      expect(convertToSnakeCase('receiptNumber')).toBe('receipt_number');
      expect(convertToSnakeCase('bankTransferInfo')).toBe('bank_transfer_info');
    });

    it('should handle already snake_case strings', () => {
      expect(convertToSnakeCase('already_snake')).toBe('already_snake');
    });

    it('should handle single words', () => {
      expect(convertToSnakeCase('word')).toBe('word');
    });
  });

  describe('copyAllFields', () => {
    it('should copy all fields with snake_case conversion', () => {
      const source = {
        documentType: 'invoice',
        vendorName: 'Test Corp',
        totalAmount: 1000
      };
      
      const result = copyAllFields(source);
      
      expect(result).toEqual({
        document_type: 'invoice',
        vendor_name: 'Test Corp',
        total_amount: 1000
      });
    });

    it('should flatten nested objects', () => {
      const source = {
        vendor: {
          name: 'Test Corp',
          address: '123 Test St'
        },
        totalAmount: 1000
      };
      
      const result = copyAllFields(source);
      
      expect(result).toEqual({
        vendor_name: 'Test Corp',
        vendor_address: '123 Test St',
        total_amount: 1000
      });
    });

    it('should stringify arrays by default', () => {
      const source = {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
        tags: ['tag1', 'tag2']
      };
      
      const result = copyAllFields(source);
      
      expect(result.tags).toBe(JSON.stringify(['tag1', 'tag2']));
    });

    it('should exclude specified fields', () => {
      const source = {
        documentType: 'invoice',
        items: [{ name: 'Item 1' }],
        totalAmount: 1000
      };
      
      const result = copyAllFields(source, {}, {
        excludeFields: ['items']
      });
      
      expect(result).toEqual({
        document_type: 'invoice',
        total_amount: 1000
      });
    });

    it('should handle null and undefined values', () => {
      const source = {
        documentType: 'invoice',
        nullField: null,
        undefinedField: undefined,
        totalAmount: 1000
      };
      
      const result = copyAllFields(source);
      
      expect(result).toEqual({
        document_type: 'invoice',
        total_amount: 1000
      });
    });
  });

  describe('generateDocumentNumber', () => {
    it('should generate document numbers with correct prefixes', () => {
      expect(generateDocumentNumber('receipt')).toMatch(/^REC-\d+$/);
      expect(generateDocumentNumber('invoice')).toMatch(/^INV-\d+$/);
      expect(generateDocumentNumber('estimate')).toMatch(/^EST-\d+$/);
    });

    it('should use existing number if provided', () => {
      expect(generateDocumentNumber('receipt', 'CUSTOM-123')).toBe('CUSTOM-123');
    });

    it('should use DOC prefix for unknown types', () => {
      expect(generateDocumentNumber('unknown')).toMatch(/^DOC-\d+$/);
    });
  });

  describe('extractPartnerName', () => {
    it('should extract vendor name from various fields', () => {
      expect(extractPartnerName({ vendorName: 'Vendor A' })).toBe('Vendor A');
      expect(extractPartnerName({ vendor: { name: 'Vendor B' } })).toBe('Vendor B');
      expect(extractPartnerName({ storeName: 'Store C' })).toBe('Store C');
      expect(extractPartnerName({ companyName: 'Company D' })).toBe('Company D');
    });

    it('should prioritize vendorName over other fields', () => {
      expect(extractPartnerName({
        vendorName: 'Primary',
        storeName: 'Secondary',
        companyName: 'Tertiary'
      })).toBe('Primary');
    });

    it('should return Unknown for empty data', () => {
      expect(extractPartnerName({})).toBe('Unknown');
    });
  });

  describe('calculateSubtotal', () => {
    it('should calculate subtotal from total and tax', () => {
      expect(calculateSubtotal(1100, 100)).toBe(1000);
      expect(calculateSubtotal(540, 40)).toBe(500);
    });

    it('should use provided subtotal if available', () => {
      expect(calculateSubtotal(1100, 100, 999)).toBe(999);
    });

    it('should return 0 for negative calculations', () => {
      expect(calculateSubtotal(50, 100)).toBe(0);
    });
  });

  describe('buildComprehensiveNotes', () => {
    it('should build notes for regular receipts', () => {
      const data = {
        subject: 'Office Supplies',
        paymentAmount: 1000,
        changeAmount: 100,
        receiptNumber: 'R-123'
      };
      
      const notes = buildComprehensiveNotes(data);
      
      expect(notes).toContain('件名: Office Supplies');
      expect(notes).toContain('お預かり: ¥1,000');
      expect(notes).toContain('お釣り: ¥100');
      expect(notes).toContain('領収書番号: R-123');
    });

    it('should build notes for parking receipts', () => {
      const data = {
        receiptType: 'parking',
        facilityName: 'Times Parking',
        entryTime: '14:00',
        exitTime: '16:00',
        parkingDuration: '2 hours',
        baseFee: 400,
        additionalFee: 200
      };
      
      const notes = buildComprehensiveNotes(data);
      
      expect(notes).toContain('【駐車場領収書】');
      expect(notes).toContain('施設名: Times Parking');
      expect(notes).toContain('入庫時刻: 14:00');
      expect(notes).toContain('出庫時刻: 16:00');
      expect(notes).toContain('基本料金: ¥400');
      expect(notes).toContain('追加料金: ¥200');
    });

    it('should include bank transfer information', () => {
      const data = {
        bankTransferInfo: {
          bankName: 'Test Bank',
          branchName: 'Main Branch',
          accountNumber: '1234567'
        }
      };
      
      const notes = buildComprehensiveNotes(data);
      
      expect(notes).toContain('【振込先情報】');
      expect(notes).toContain('銀行名: Test Bank');
      expect(notes).toContain('支店名: Main Branch');
      expect(notes).toContain('口座番号: 1234567');
    });

    it('should append additional notes', () => {
      const data = { subject: 'Test' };
      const additional = ['Additional Note 1', 'Additional Note 2'];
      
      const notes = buildComprehensiveNotes(data, additional);
      
      expect(notes).toContain('Additional Note 1');
      expect(notes).toContain('Additional Note 2');
    });
  });

  describe('validateOCRData', () => {
    it('should validate string fields', () => {
      const data = {
        documentType: 'invoice',
        documentNumber: 'INV-123',
        invalidField: 123 // Should be ignored
      };
      
      const validated = validateOCRData(data);
      
      expect(validated.documentType).toBe('invoice');
      expect(validated.documentNumber).toBe('INV-123');
      expect(validated.invalidField).toBeUndefined();
    });

    it('should validate numeric fields', () => {
      const data = {
        subtotalAmount: 1000,
        taxAmount: '100', // String should be parsed
        totalAmount: 'invalid', // Should be ignored
        baseFee: NaN // Should be ignored
      };
      
      const validated = validateOCRData(data);
      
      expect(validated.subtotalAmount).toBe(1000);
      expect(validated.taxAmount).toBe(100);
      expect(validated.totalAmount).toBeUndefined();
      expect(validated.baseFee).toBeUndefined();
    });

    it('should validate vendor object', () => {
      const data = {
        vendor: {
          name: 'Test Vendor',
          address: '123 Test St',
          invalid: 'field' // Should be ignored
        }
      };
      
      const validated = validateOCRData(data);
      
      expect(validated.vendor?.name).toBe('Test Vendor');
      expect(validated.vendor?.address).toBe('123 Test St');
      expect((validated.vendor as any)?.invalid).toBeUndefined();
    });

    it('should validate items array', () => {
      const data = {
        items: [
          {
            itemName: 'Item 1',
            quantity: 2,
            unitPrice: 500,
            invalid: 'field'
          },
          {
            itemName: null, // Should default to empty string
            quantity: 'invalid', // Should default to 1
            unitPrice: null // Should default to 0
          }
        ]
      };
      
      const validated = validateOCRData(data);
      
      expect(validated.items).toHaveLength(2);
      expect(validated.items![0].itemName).toBe('Item 1');
      expect(validated.items![0].quantity).toBe(2);
      expect(validated.items![1].itemName).toBe('');
      expect(validated.items![1].quantity).toBe(1);
      expect(validated.items![1].unitPrice).toBe(0);
    });
  });
});

describe('OCRDocumentService', () => {
  let service: OCRDocumentService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      create: jest.fn().mockResolvedValue({ _id: 'doc123' }),
      findById: jest.fn(),
      updateById: jest.fn().mockResolvedValue(true)
    } as any;
    
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    
    service = new OCRDocumentService({
      defaultCompanyId: 'test-company-id'
    });
  });

  describe('createDocument', () => {
    it('should create document from AI structured data', async () => {
      const aiData: StructuredInvoiceData = {
        documentType: 'invoice',
        issueDate: '2024-01-20',
        vendor: {
          name: 'Test Vendor',
          address: '123 Test St'
        },
        customer: {
          name: 'Test Customer'
        },
        items: [
          {
            itemName: 'Service',
            quantity: 1,
            unitPrice: 1000,
            taxRate: 0.1,
            amount: 1000
          }
        ],
        subtotal: 1000,
        taxAmount: 100,
        totalAmount: 1100
      };

      const request: CreateDocumentFromOCRRequest = {
        aiStructuredData: aiData,
        companyId: 'test-company'
      };

      const result = await service.createDocument(request);

      expect(result.processingMethod).toBe('AI-driven');
      expect(result.id).toBe('doc123');
      expect(result.summary?.itemsCount).toBe(1);
      expect(result.summary?.totalAmount).toBe(1100);
      expect(mockDb.create).toHaveBeenCalledTimes(2); // Document + 1 item
    });

    it('should create document from OCR result ID', async () => {
      mockDb.findById.mockResolvedValueOnce({
        _id: 'ocr123',
        companyId: 'test-company',
        extractedData: {
          vendorName: 'OCR Vendor',
          totalAmount: 500,
          taxAmount: 50
        }
      });

      const request: CreateDocumentFromOCRRequest = {
        ocrResultId: 'ocr123'
      };

      const result = await service.createDocument(request);

      expect(result.processingMethod).toBe('Legacy');
      expect(result.id).toBe('doc123');
      expect(mockDb.findById).toHaveBeenCalledWith('ocrResults', 'ocr123');
      expect(mockDb.updateById).toHaveBeenCalledWith(
        'ocrResults',
        'ocr123',
        expect.objectContaining({
          linkedDocumentId: 'doc123',
          status: 'processed'
        })
      );
    });

    it('should create document from simple data', async () => {
      const request: CreateDocumentFromOCRRequest = {
        vendor_name: 'Simple Vendor',
        total_amount: 1000,
        tax_amount: 100,
        receipt_date: '2024-01-20'
      };

      const result = await service.createDocument(request);

      expect(result.processingMethod).toBe('Simple');
      expect(result.id).toBe('doc123');
      expect(mockDb.create).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          partnerName: 'Simple Vendor',
          totalAmount: 1000,
          taxAmount: 100
        })
      );
    });

    it('should handle parking receipts', async () => {
      const request: CreateDocumentFromOCRRequest = {
        vendor_name: 'Times Parking',
        receiptType: 'parking',
        facilityName: 'Shibuya Station',
        entryTime: '14:00',
        exitTime: '16:00',
        baseFee: 400,
        additionalFee: 200,
        total_amount: 600
      };

      const result = await service.createDocument(request);

      expect(mockDb.create).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          receipt_type: 'parking',
          facility_name: 'Shibuya Station',
          entry_time: '14:00',
          exit_time: '16:00',
          base_fee: 400,
          additional_fee: 200
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.create.mockRejectedValueOnce(new Error('Database error'));

      const request: CreateDocumentFromOCRRequest = {
        vendor_name: 'Test Vendor',
        total_amount: 1000
      };

      await expect(service.createDocument(request)).rejects.toThrow('Database error');
    });
  });
});