"use strict";
/**
 * Create Document from OCR API Route
 *
 * Handles document creation from various OCR data formats.
 * Supports both AI-driven and legacy OCR processing methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const ocr_document_service_1 = require("@/services/ocr-document.service");
const activity_log_service_1 = require("@/services/activity-log.service");
const logger_1 = require("@/lib/logger");
/**
 * POST /api/documents/create-from-ocr
 *
 * Creates a new document from OCR data.
 * Automatically detects the data format and applies the appropriate processing method.
 *
 * @param request - The incoming request with OCR data
 * @returns Document creation response with the new document ID
 */
async function POST(request) {
    try {
        const body = await request.json();
        logger_1.logger.debug('[Create Document] Received request', {
            hasAIData: !!body.aiStructuredData,
            hasOCRResultId: !!body.ocrResultId,
            documentType: body.document_type || body.aiStructuredData?.documentType
        });
        // Initialize OCR document service
        const ocrService = new ocr_document_service_1.OCRDocumentService({
            defaultCompanyId: body.companyId || process.env.DEFAULT_COMPANY_ID
        });
        // Process the document creation
        const result = await ocrService.createDocument(body);
        logger_1.logger.info('[Create Document] Document created successfully', {
            documentId: result.id,
            processingMethod: result.processingMethod
        });
        // アクティビティログを記録
        try {
            const documentType = body.document_type || body.aiStructuredData?.documentType || 'unknown';
            await activity_log_service_1.ActivityLogService.logDocumentCreated(result.id, documentType);
            logger_1.logger.info('Activity log recorded for document creation');
        }
        catch (logError) {
            logger_1.logger.error('Failed to log activity for document creation:', logError);
        }
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        logger_1.logger.error('[Create Document] Error:', error);
        const errorMessage = error instanceof Error ? error.message : '文書の作成に失敗しました';
        const errorDetails = error instanceof Error ? {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : undefined;
        return server_1.NextResponse.json({
            error: errorMessage,
            details: errorDetails
        }, { status: 500 });
    }
}
/**
 * GET /api/documents/create-from-ocr
 *
 * Returns API documentation for the create-from-ocr endpoint
 */
async function GET() {
    return server_1.NextResponse.json({
        endpoint: '/api/documents/create-from-ocr',
        method: 'POST',
        description: 'Creates a document from OCR data with automatic format detection',
        accepts: 'application/json',
        processingMethods: {
            'AI-driven': {
                description: 'Uses AI-structured data for comprehensive document creation',
                requiredField: 'aiStructuredData',
                features: [
                    'Full field extraction and mapping',
                    'Intelligent document type detection',
                    'Comprehensive notes generation',
                    'Support for parking receipts and special document types'
                ]
            },
            'Legacy': {
                description: 'Processes documents using OCR result ID from database',
                requiredField: 'ocrResultId',
                features: [
                    'Fetches OCR data from database',
                    'Validates and transforms data',
                    'Updates OCR result status after processing'
                ]
            },
            'Simple': {
                description: 'Direct document creation from provided fields',
                requiredFields: ['vendor_name or store_name', 'total_amount'],
                features: [
                    'Quick document creation',
                    'Minimal validation',
                    'Suitable for simple receipts'
                ]
            }
        },
        requestBody: {
            aiStructuredData: {
                type: 'object',
                description: 'AI-processed structured invoice data',
                optional: true
            },
            ocrResultId: {
                type: 'string',
                description: 'MongoDB ObjectId of the OCR result',
                optional: true
            },
            document_type: {
                type: 'string',
                description: 'Document type (receipt, invoice, etc.)',
                optional: true,
                default: 'receipt'
            },
            vendor_name: {
                type: 'string',
                description: 'Vendor/store name',
                optional: true
            },
            receipt_date: {
                type: 'string',
                description: 'Receipt date in YYYY-MM-DD format',
                optional: true
            },
            total_amount: {
                type: 'number',
                description: 'Total amount',
                optional: true
            },
            companyId: {
                type: 'string',
                description: 'Company ID for multi-tenant support',
                optional: true
            }
        },
        response: {
            success: {
                id: 'string - Document ID',
                message: 'string - Success message',
                processingMethod: 'string - Method used (AI-driven, Legacy, or Simple)',
                extractedData: 'object - Extracted data (AI-driven only)',
                summary: 'object - Processing summary (AI-driven only)'
            },
            error: {
                error: 'string - Error message',
                details: 'object - Error details (development only)'
            }
        }
    });
}
