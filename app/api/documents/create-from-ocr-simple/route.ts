/**
 * Create Document from OCR Simple API Route
 * 
 * Simplified endpoint for creating documents from basic OCR data.
 * This route is optimized for quick document creation with minimal processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OCRDocumentService } from '@/services/ocr-document.service';
import { CreateDocumentFromOCRRequest } from '@/types/ocr.types';
import { logger } from '@/lib/logger';

/**
 * POST /api/documents/create-from-ocr-simple
 * 
 * Creates a document using simplified OCR data processing.
 * Best suited for simple receipts and documents with basic information.
 * 
 * @param request - The incoming request with OCR data
 * @returns Document creation response
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateDocumentFromOCRRequest = await request.json();
    logger.debug('[Create Simple] Received request', {
      documentType: body.document_type,
      hasOCRResultId: !!body.ocrResultId,
      vendorName: body.vendor_name || body.store_name
    });
    
    // Initialize service with simple processing configuration
    const ocrService = new OCRDocumentService({
      useAIOrchestrator: false,
      enableAccountPrediction: true,
      defaultCompanyId: body.companyId || process.env.DEFAULT_COMPANY_ID
    });
    
    // Process the document
    const result = await ocrService.createDocument(body);
    
    logger.info('[Create Simple] Document created successfully', {
      documentId: result.id,
      processingMethod: result.processingMethod
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('[Create Simple] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '文書の作成に失敗しました';
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      type: error.constructor.name
    } : undefined;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/create-from-ocr-simple
 * 
 * Returns API documentation for the simplified endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/documents/create-from-ocr-simple',
    method: 'POST',
    description: 'Simplified document creation from OCR data',
    accepts: 'application/json',
    features: [
      'Quick document creation with minimal validation',
      'Automatic subtotal calculation',
      'Support for parking receipts',
      'Background account category prediction',
      'OCR result linking'
    ],
    requestBody: {
      required: {
        // At least one of these is required
        vendor_name: 'string - Vendor name',
        store_name: 'string - Store name', 
        company_name: 'string - Company name'
      },
      optional: {
        ocrResultId: 'string - OCR result ID to link',
        document_type: 'string - Document type (default: receipt)',
        receipt_date: 'string - Date in YYYY-MM-DD format',
        receipt_number: 'string - Receipt number',
        subtotal_amount: 'number - Subtotal amount',
        tax_amount: 'number - Tax amount',
        total_amount: 'number - Total amount',
        payment_amount: 'number - Payment received',
        change_amount: 'number - Change given',
        store_phone: 'string - Store phone number',
        notes: 'string - Additional notes',
        file_name: 'string - File or item name',
        extracted_text: 'string - Full OCR text for AI prediction',
        // Parking-specific fields
        receiptType: 'string - Receipt type (parking, general)',
        facilityName: 'string - Parking facility name',
        entryTime: 'string - Entry time',
        exitTime: 'string - Exit time',
        parkingDuration: 'string - Parking duration',
        baseFee: 'number - Base parking fee',
        additionalFee: 'number - Additional parking fee',
        companyId: 'string - Company ID for multi-tenant'
      }
    },
    response: {
      success: {
        id: 'string - Created document ID',
        message: 'string - Success message with document type'
      },
      error: {
        error: 'string - Error message',
        details: 'object - Error details (development only)'
      }
    },
    examples: {
      simpleReceipt: {
        vendor_name: 'コンビニストア',
        total_amount: 1080,
        tax_amount: 80,
        receipt_date: '2024-01-20',
        notes: 'お弁当購入'
      },
      parkingReceipt: {
        vendor_name: 'タイムズ駐車場',
        receiptType: 'parking',
        facilityName: '渋谷駅前第1',
        entryTime: '14:30',
        exitTime: '16:45',
        parkingDuration: '2時間15分',
        baseFee: 400,
        additionalFee: 600,
        total_amount: 1000
      }
    }
  });
}