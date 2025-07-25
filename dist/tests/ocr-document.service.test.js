"use strict";
/**
 * OCR Document Service Tests
 *
 * Comprehensive test suite for the refactored OCR document service
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ocr_document_service_1 = require("@/services/ocr-document.service");
const mongodb_client_1 = require("@/lib/mongodb-client");
const ocr_utils_1 = require("@/lib/ocr-utils");
// Mock dependencies
globals_1.jest.mock('@/lib/mongodb-client');
globals_1.jest.mock('@/lib/account-category-ai');
globals_1.jest.mock('@/lib/logger');
(0, globals_1.describe)('OCR Utility Functions', () => {
    (0, globals_1.describe)('convertToSnakeCase', () => {
        (0, globals_1.it)('should convert camelCase to snake_case', () => {
            (0, globals_1.expect)((0, ocr_utils_1.convertToSnakeCase)('documentType')).toBe('document_type');
            (0, globals_1.expect)((0, ocr_utils_1.convertToSnakeCase)('receiptNumber')).toBe('receipt_number');
            (0, globals_1.expect)((0, ocr_utils_1.convertToSnakeCase)('bankTransferInfo')).toBe('bank_transfer_info');
        });
        (0, globals_1.it)('should handle already snake_case strings', () => {
            (0, globals_1.expect)((0, ocr_utils_1.convertToSnakeCase)('already_snake')).toBe('already_snake');
        });
        (0, globals_1.it)('should handle single words', () => {
            (0, globals_1.expect)((0, ocr_utils_1.convertToSnakeCase)('word')).toBe('word');
        });
    });
    (0, globals_1.describe)('copyAllFields', () => {
        (0, globals_1.it)('should copy all fields with snake_case conversion', () => {
            const source = {
                documentType: 'invoice',
                vendorName: 'Test Corp',
                totalAmount: 1000
            };
            const result = (0, ocr_utils_1.copyAllFields)(source);
            (0, globals_1.expect)(result).toEqual({
                document_type: 'invoice',
                vendor_name: 'Test Corp',
                total_amount: 1000
            });
        });
        (0, globals_1.it)('should flatten nested objects', () => {
            const source = {
                vendor: {
                    name: 'Test Corp',
                    address: '123 Test St'
                },
                totalAmount: 1000
            };
            const result = (0, ocr_utils_1.copyAllFields)(source);
            (0, globals_1.expect)(result).toEqual({
                vendor_name: 'Test Corp',
                vendor_address: '123 Test St',
                total_amount: 1000
            });
        });
        (0, globals_1.it)('should stringify arrays by default', () => {
            const source = {
                items: [{ name: 'Item 1' }, { name: 'Item 2' }],
                tags: ['tag1', 'tag2']
            };
            const result = (0, ocr_utils_1.copyAllFields)(source);
            (0, globals_1.expect)(result.tags).toBe(JSON.stringify(['tag1', 'tag2']));
        });
        (0, globals_1.it)('should exclude specified fields', () => {
            const source = {
                documentType: 'invoice',
                items: [{ name: 'Item 1' }],
                totalAmount: 1000
            };
            const result = (0, ocr_utils_1.copyAllFields)(source, {}, {
                excludeFields: ['items']
            });
            (0, globals_1.expect)(result).toEqual({
                document_type: 'invoice',
                total_amount: 1000
            });
        });
        (0, globals_1.it)('should handle null and undefined values', () => {
            const source = {
                documentType: 'invoice',
                nullField: null,
                undefinedField: undefined,
                totalAmount: 1000
            };
            const result = (0, ocr_utils_1.copyAllFields)(source);
            (0, globals_1.expect)(result).toEqual({
                document_type: 'invoice',
                total_amount: 1000
            });
        });
    });
    (0, globals_1.describe)('generateDocumentNumber', () => {
        (0, globals_1.it)('should generate document numbers with correct prefixes', () => {
            (0, globals_1.expect)((0, ocr_utils_1.generateDocumentNumber)('receipt')).toMatch(/^REC-\d+$/);
            (0, globals_1.expect)((0, ocr_utils_1.generateDocumentNumber)('invoice')).toMatch(/^INV-\d+$/);
            (0, globals_1.expect)((0, ocr_utils_1.generateDocumentNumber)('estimate')).toMatch(/^EST-\d+$/);
        });
        (0, globals_1.it)('should use existing number if provided', () => {
            (0, globals_1.expect)((0, ocr_utils_1.generateDocumentNumber)('receipt', 'CUSTOM-123')).toBe('CUSTOM-123');
        });
        (0, globals_1.it)('should use DOC prefix for unknown types', () => {
            (0, globals_1.expect)((0, ocr_utils_1.generateDocumentNumber)('unknown')).toMatch(/^DOC-\d+$/);
        });
    });
    (0, globals_1.describe)('extractPartnerName', () => {
        (0, globals_1.it)('should extract vendor name from various fields', () => {
            (0, globals_1.expect)((0, ocr_utils_1.extractPartnerName)({ vendorName: 'Vendor A' })).toBe('Vendor A');
            (0, globals_1.expect)((0, ocr_utils_1.extractPartnerName)({ vendor: { name: 'Vendor B' } })).toBe('Vendor B');
            (0, globals_1.expect)((0, ocr_utils_1.extractPartnerName)({ storeName: 'Store C' })).toBe('Store C');
            (0, globals_1.expect)((0, ocr_utils_1.extractPartnerName)({ companyName: 'Company D' })).toBe('Company D');
        });
        (0, globals_1.it)('should prioritize vendorName over other fields', () => {
            (0, globals_1.expect)((0, ocr_utils_1.extractPartnerName)({
                vendorName: 'Primary',
                storeName: 'Secondary',
                companyName: 'Tertiary'
            })).toBe('Primary');
        });
        (0, globals_1.it)('should return Unknown for empty data', () => {
            (0, globals_1.expect)((0, ocr_utils_1.extractPartnerName)({})).toBe('Unknown');
        });
    });
    (0, globals_1.describe)('calculateSubtotal', () => {
        (0, globals_1.it)('should calculate subtotal from total and tax', () => {
            (0, globals_1.expect)((0, ocr_utils_1.calculateSubtotal)(1100, 100)).toBe(1000);
            (0, globals_1.expect)((0, ocr_utils_1.calculateSubtotal)(540, 40)).toBe(500);
        });
        (0, globals_1.it)('should use provided subtotal if available', () => {
            (0, globals_1.expect)((0, ocr_utils_1.calculateSubtotal)(1100, 100, 999)).toBe(999);
        });
        (0, globals_1.it)('should return 0 for negative calculations', () => {
            (0, globals_1.expect)((0, ocr_utils_1.calculateSubtotal)(50, 100)).toBe(0);
        });
    });
    (0, globals_1.describe)('buildComprehensiveNotes', () => {
        (0, globals_1.it)('should build notes for regular receipts', () => {
            const data = {
                subject: 'Office Supplies',
                paymentAmount: 1000,
                changeAmount: 100,
                receiptNumber: 'R-123'
            };
            const notes = (0, ocr_utils_1.buildComprehensiveNotes)(data);
            (0, globals_1.expect)(notes).toContain('件名: Office Supplies');
            (0, globals_1.expect)(notes).toContain('お預かり: ¥1,000');
            (0, globals_1.expect)(notes).toContain('お釣り: ¥100');
            (0, globals_1.expect)(notes).toContain('領収書番号: R-123');
        });
        (0, globals_1.it)('should build notes for parking receipts', () => {
            const data = {
                receiptType: 'parking',
                facilityName: 'Times Parking',
                entryTime: '14:00',
                exitTime: '16:00',
                parkingDuration: '2 hours',
                baseFee: 400,
                additionalFee: 200
            };
            const notes = (0, ocr_utils_1.buildComprehensiveNotes)(data);
            (0, globals_1.expect)(notes).toContain('【駐車場領収書】');
            (0, globals_1.expect)(notes).toContain('施設名: Times Parking');
            (0, globals_1.expect)(notes).toContain('入庫時刻: 14:00');
            (0, globals_1.expect)(notes).toContain('出庫時刻: 16:00');
            (0, globals_1.expect)(notes).toContain('基本料金: ¥400');
            (0, globals_1.expect)(notes).toContain('追加料金: ¥200');
        });
        (0, globals_1.it)('should include bank transfer information', () => {
            const data = {
                bankTransferInfo: {
                    bankName: 'Test Bank',
                    branchName: 'Main Branch',
                    accountNumber: '1234567'
                }
            };
            const notes = (0, ocr_utils_1.buildComprehensiveNotes)(data);
            (0, globals_1.expect)(notes).toContain('【振込先情報】');
            (0, globals_1.expect)(notes).toContain('銀行名: Test Bank');
            (0, globals_1.expect)(notes).toContain('支店名: Main Branch');
            (0, globals_1.expect)(notes).toContain('口座番号: 1234567');
        });
        (0, globals_1.it)('should append additional notes', () => {
            const data = { subject: 'Test' };
            const additional = ['Additional Note 1', 'Additional Note 2'];
            const notes = (0, ocr_utils_1.buildComprehensiveNotes)(data, additional);
            (0, globals_1.expect)(notes).toContain('Additional Note 1');
            (0, globals_1.expect)(notes).toContain('Additional Note 2');
        });
    });
    (0, globals_1.describe)('validateOCRData', () => {
        (0, globals_1.it)('should validate string fields', () => {
            const data = {
                documentType: 'invoice',
                documentNumber: 'INV-123',
                invalidField: 123 // Should be ignored
            };
            const validated = (0, ocr_utils_1.validateOCRData)(data);
            (0, globals_1.expect)(validated.documentType).toBe('invoice');
            (0, globals_1.expect)(validated.documentNumber).toBe('INV-123');
            (0, globals_1.expect)(validated.invalidField).toBeUndefined();
        });
        (0, globals_1.it)('should validate numeric fields', () => {
            const data = {
                subtotalAmount: 1000,
                taxAmount: '100', // String should be parsed
                totalAmount: 'invalid', // Should be ignored
                baseFee: NaN // Should be ignored
            };
            const validated = (0, ocr_utils_1.validateOCRData)(data);
            (0, globals_1.expect)(validated.subtotalAmount).toBe(1000);
            (0, globals_1.expect)(validated.taxAmount).toBe(100);
            (0, globals_1.expect)(validated.totalAmount).toBeUndefined();
            (0, globals_1.expect)(validated.baseFee).toBeUndefined();
        });
        (0, globals_1.it)('should validate vendor object', () => {
            const data = {
                vendor: {
                    name: 'Test Vendor',
                    address: '123 Test St',
                    invalid: 'field' // Should be ignored
                }
            };
            const validated = (0, ocr_utils_1.validateOCRData)(data);
            (0, globals_1.expect)(validated.vendor?.name).toBe('Test Vendor');
            (0, globals_1.expect)(validated.vendor?.address).toBe('123 Test St');
            (0, globals_1.expect)(validated.vendor?.invalid).toBeUndefined();
        });
        (0, globals_1.it)('should validate items array', () => {
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
            const validated = (0, ocr_utils_1.validateOCRData)(data);
            (0, globals_1.expect)(validated.items).toHaveLength(2);
            (0, globals_1.expect)(validated.items[0].itemName).toBe('Item 1');
            (0, globals_1.expect)(validated.items[0].quantity).toBe(2);
            (0, globals_1.expect)(validated.items[1].itemName).toBe('');
            (0, globals_1.expect)(validated.items[1].quantity).toBe(1);
            (0, globals_1.expect)(validated.items[1].unitPrice).toBe(0);
        });
    });
});
(0, globals_1.describe)('OCRDocumentService', () => {
    let service;
    let mockDb;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockDb = {
            create: globals_1.jest.fn().mockResolvedValue({ _id: 'doc123' }),
            findById: globals_1.jest.fn(),
            updateById: globals_1.jest.fn().mockResolvedValue(true)
        };
        mongodb_client_1.DatabaseService.getInstance.mockReturnValue(mockDb);
        service = new ocr_document_service_1.OCRDocumentService({
            defaultCompanyId: 'test-company-id'
        });
    });
    (0, globals_1.describe)('createDocument', () => {
        (0, globals_1.it)('should create document from AI structured data', async () => {
            const aiData = {
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
            const request = {
                aiStructuredData: aiData,
                companyId: 'test-company'
            };
            const result = await service.createDocument(request);
            (0, globals_1.expect)(result.processingMethod).toBe('AI-driven');
            (0, globals_1.expect)(result.id).toBe('doc123');
            (0, globals_1.expect)(result.summary?.itemsCount).toBe(1);
            (0, globals_1.expect)(result.summary?.totalAmount).toBe(1100);
            (0, globals_1.expect)(mockDb.create).toHaveBeenCalledTimes(2); // Document + 1 item
        });
        (0, globals_1.it)('should create document from OCR result ID', async () => {
            mockDb.findById.mockResolvedValueOnce({
                _id: 'ocr123',
                companyId: 'test-company',
                extractedData: {
                    vendorName: 'OCR Vendor',
                    totalAmount: 500,
                    taxAmount: 50
                }
            });
            const request = {
                ocrResultId: 'ocr123'
            };
            const result = await service.createDocument(request);
            (0, globals_1.expect)(result.processingMethod).toBe('Legacy');
            (0, globals_1.expect)(result.id).toBe('doc123');
            (0, globals_1.expect)(mockDb.findById).toHaveBeenCalledWith('ocrResults', 'ocr123');
            (0, globals_1.expect)(mockDb.updateById).toHaveBeenCalledWith('ocrResults', 'ocr123', globals_1.expect.objectContaining({
                linkedDocumentId: 'doc123',
                status: 'processed'
            }));
        });
        (0, globals_1.it)('should create document from simple data', async () => {
            const request = {
                vendor_name: 'Simple Vendor',
                total_amount: 1000,
                tax_amount: 100,
                receipt_date: '2024-01-20'
            };
            const result = await service.createDocument(request);
            (0, globals_1.expect)(result.processingMethod).toBe('Simple');
            (0, globals_1.expect)(result.id).toBe('doc123');
            (0, globals_1.expect)(mockDb.create).toHaveBeenCalledWith('documents', globals_1.expect.objectContaining({
                partnerName: 'Simple Vendor',
                totalAmount: 1000,
                taxAmount: 100
            }));
        });
        (0, globals_1.it)('should handle parking receipts', async () => {
            const request = {
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
            (0, globals_1.expect)(mockDb.create).toHaveBeenCalledWith('documents', globals_1.expect.objectContaining({
                receipt_type: 'parking',
                facility_name: 'Shibuya Station',
                entry_time: '14:00',
                exit_time: '16:00',
                base_fee: 400,
                additional_fee: 200
            }));
        });
        (0, globals_1.it)('should handle errors gracefully', async () => {
            mockDb.create.mockRejectedValueOnce(new Error('Database error'));
            const request = {
                vendor_name: 'Test Vendor',
                total_amount: 1000
            };
            await (0, globals_1.expect)(service.createDocument(request)).rejects.toThrow('Database error');
        });
    });
});
