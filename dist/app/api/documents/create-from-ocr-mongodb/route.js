"use strict";
/**
 * Create Document from OCR MongoDB API Route
 *
 * Legacy endpoint for Azure MongoDB integration.
 * This route fetches OCR results from MongoDB and creates documents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const ocr_document_service_1 = require("@/services/ocr-document.service");
const logger_1 = require("@/lib/logger");
/**
 * POST /api/documents/create-from-ocr-mongodb
 *
 * Creates a document by fetching OCR result from MongoDB.
 * This endpoint is maintained for backward compatibility with Azure MongoDB integration.
 *
 * @param request - Request containing ocrResultId
 * @returns Document creation response
 */
async function POST(request) {
    try {
        // Check if Azure MongoDB is enabled
        const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
        if (!useAzureMongoDB) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Please use /api/documents/create-from-ocr for the standard system'
            }, { status: 400 });
        }
        const data = await request.json();
        const { ocrResultId, document_type, approvedBy } = data;
        if (!ocrResultId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'OCR Result ID is required'
            }, { status: 400 });
        }
        logger_1.logger.debug('[Create MongoDB] Processing OCR result', {
            ocrResultId,
            documentType: document_type,
            hasApprover: !!approvedBy
        });
        // Use OCR document service to process
        const ocrService = new ocr_document_service_1.OCRDocumentService({
            useAIOrchestrator: false,
            enableAccountPrediction: false, // Disabled for legacy compatibility
            defaultCompanyId: process.env.DEFAULT_COMPANY_ID
        });
        // Process with OCR result ID
        const result = await ocrService.createDocument({
            ocrResultId,
            document_type,
            approvedBy
        });
        logger_1.logger.info('[Create MongoDB] Document created successfully', {
            documentId: result.id,
            ocrResultId
        });
        // Format response for backward compatibility
        return server_1.NextResponse.json({
            success: true,
            documentId: result.id,
            message: result.message
        });
    }
    catch (error) {
        logger_1.logger.error('[Create MongoDB] Error:', error);
        const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
        // Handle specific error cases
        if (error instanceof Error && error.message === 'OCR result not found') {
            return server_1.NextResponse.json({
                success: false,
                error: 'OCR result not found'
            }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
/**
 * GET /api/documents/create-from-ocr-mongodb
 *
 * Returns API documentation
 */
async function GET() {
    return server_1.NextResponse.json({
        endpoint: '/api/documents/create-from-ocr-mongodb',
        method: 'POST',
        description: 'Create Document from OCR API (MongoDB) - Legacy Azure MongoDB integration',
        accepts: 'application/json',
        requirements: {
            environment: 'USE_AZURE_MONGODB must be set to "true"',
            database: 'Requires active MongoDB connection'
        },
        requestBody: {
            required: {
                ocrResultId: 'string - OCR result ID from MongoDB'
            },
            optional: {
                documentType: 'string - Document type override (invoice, receipt, etc.)',
                document_type: 'string - Alternative field name for documentType',
                approvedBy: 'string - User ID of approver'
            }
        },
        response: {
            success: {
                success: 'boolean - Always true on success',
                documentId: 'string - Created document ID',
                message: 'string - Success message'
            },
            error: {
                success: 'boolean - Always false on error',
                error: 'string - Error message'
            }
        },
        workflow: [
            '1. Validate Azure MongoDB is enabled',
            '2. Fetch OCR result from MongoDB using provided ID',
            '3. Extract and validate OCR data',
            '4. Create document with extracted information',
            '5. Link document to OCR result',
            '6. Return created document ID'
        ],
        notes: [
            'This endpoint is maintained for backward compatibility',
            'New integrations should use /api/documents/create-from-ocr',
            'Account category prediction is disabled for performance'
        ]
    });
}
