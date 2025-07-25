"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
const ocrResultSchema = zod_1.z.object({
    text: zod_1.z.string(),
    confidence: zod_1.z.number(),
    vendor: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
    amount: zod_1.z.number().optional(),
    tax: zod_1.z.number().optional(),
    items: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        quantity: zod_1.z.number(),
        price: zod_1.z.number(),
    })).optional(),
});
const ocrInputSchema = zod_1.z.object({
    fileId: zod_1.z.string().optional(),
    filePath: zod_1.z.string().optional(),
    fileUrl: zod_1.z.string().optional(),
    fileData: zod_1.z.string().optional(),
    fileType: zod_1.z.enum(['pdf', 'image']),
    language: zod_1.z.enum(['ja', 'en']).default('ja'),
    extractType: zod_1.z.enum(['receipt', 'invoice', 'general', 'handwritten']).default('receipt'),
    companyId: zod_1.z.string(),
});
exports.ocrAgent = (0, core_1.createAgent)({
    id: 'ocr-agent',
    name: 'OCR Processing Agent',
    description: 'Process documents using Azure Form Recognizer OCR and extract structured data with MongoDB integration',
    inputSchema: ocrInputSchema,
    outputSchema: ocrResultSchema,
    tools: {
        azureFormRecognizerOCR: {
            description: 'Use Azure Form Recognizer for OCR processing',
            execute: async ({ fileData, extractType }) => {
                try {
                    const { DocumentAnalysisClient, AzureKeyCredential } = await Promise.resolve().then(() => __importStar(require('@azure/ai-form-recognizer')));
                    const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
                    const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
                    if (!endpoint || !apiKey) {
                        throw new Error('Azure Form Recognizer credentials not configured');
                    }
                    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
                    const buffer = Buffer.from(fileData, 'base64');
                    let modelId = 'prebuilt-document';
                    switch (extractType) {
                        case 'receipt':
                            modelId = 'prebuilt-receipt';
                            break;
                        case 'invoice':
                            modelId = 'prebuilt-invoice';
                            break;
                        case 'general':
                            modelId = 'prebuilt-document';
                            break;
                        default:
                            modelId = 'prebuilt-document';
                    }
                    const poller = await client.beginAnalyzeDocument(modelId, buffer);
                    const result = await poller.pollUntilDone();
                    let extractedText = '';
                    if (result.content) {
                        extractedText = result.content;
                    }
                    let structuredData = {};
                    if (result.documents && result.documents.length > 0) {
                        const document = result.documents[0];
                        const fields = document.fields;
                        if (fields) {
                            structuredData = {
                                merchantName: fields.MerchantName?.content || fields.VendorName?.content || '',
                                transactionDate: fields.TransactionDate?.content || fields.InvoiceDate?.content || '',
                                total: parseFloat(fields.Total?.content || fields.InvoiceTotal?.content || '0'),
                                tax: parseFloat(fields.TotalTax?.content || fields.TaxAmount?.content || '0'),
                                items: fields.Items?.values?.map((item) => ({
                                    name: item.properties?.Name?.content || item.properties?.Description?.content || '',
                                    quantity: parseFloat(item.properties?.Quantity?.content || '1'),
                                    price: parseFloat(item.properties?.Price?.content || item.properties?.Amount?.content || '0'),
                                })) || []
                            };
                        }
                    }
                    return {
                        text: extractedText,
                        confidence: result.documents?.[0]?.confidence || 0.85,
                        structuredData,
                        isAzure: true,
                    };
                }
                catch (error) {
                    logger_1.logger.error('Azure Form Recognizer OCR failed:', error);
                    throw error;
                }
            },
        },
        handwritingOCR: {
            description: 'Perform OCR specialized for handwritten text',
            execute: async ({ fileData, language }) => {
                try {
                    const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
                    const FormData = (await Promise.resolve().then(() => __importStar(require('form-data')))).default;
                    if (!process.env.HANDWRITING_OCR_API_TOKEN) {
                        throw new Error('HandwritingOCR API token not configured');
                    }
                    const formData = new FormData();
                    formData.append('image', Buffer.from(fileData, 'base64'));
                    formData.append('language', language === 'ja' ? 'japanese' : 'english');
                    const response = await fetch('https://api.handwritingocr.com/v1/ocr', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.HANDWRITING_OCR_API_TOKEN}`,
                        },
                        body: formData,
                    });
                    if (!response.ok) {
                        throw new Error(`HandwritingOCR API error: ${response.statusText}`);
                    }
                    const result = await response.json();
                    return {
                        text: result.text,
                        confidence: result.confidence || 0.85,
                        isHandwritten: true,
                        lines: result.lines || [],
                    };
                }
                catch (error) {
                    logger_1.logger.error('HandwritingOCR failed:', error);
                    throw error;
                }
            },
        },
        extractReceiptInfo: {
            description: 'Extract receipt information from OCR text',
            execute: async ({ text, structuredData }) => {
                const info = {
                    vendor: '',
                    date: '',
                    amount: 0,
                    tax: 0,
                    items: [],
                };
                if (structuredData) {
                    info.vendor = structuredData.merchantName || '';
                    info.date = structuredData.transactionDate || '';
                    info.amount = structuredData.total || 0;
                    info.tax = structuredData.tax || 0;
                    info.items = structuredData.items || [];
                    if (info.date) {
                        const dateMatch = info.date.match(/(\d{4})[年\/\-]?(\d{1,2})[月\/\-]?(\d{1,2})/);
                        if (dateMatch) {
                            const year = dateMatch[1];
                            const month = dateMatch[2].padStart(2, '0');
                            const day = dateMatch[3].padStart(2, '0');
                            info.date = `${year}-${month}-${day}`;
                        }
                    }
                }
                if (!info.vendor) {
                    const vendorMatch = text.match(/(?:株式会社|有限会社|合同会社)?[\u4e00-\u9fa5\u30a0-\u30ff]+(?:株式会社|店|商店|ストア)?/);
                    if (vendorMatch) {
                        info.vendor = vendorMatch[0];
                    }
                }
                if (!info.date) {
                    const dateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/);
                    if (dateMatch) {
                        const year = dateMatch[1];
                        const month = dateMatch[2].padStart(2, '0');
                        const day = dateMatch[3].padStart(2, '0');
                        info.date = `${year}-${month}-${day}`;
                    }
                }
                if (!info.amount) {
                    const amountMatches = text.match(/[¥￥]?\s*([0-9,]+)\s*円?/g);
                    if (amountMatches && amountMatches.length > 0) {
                        const amounts = amountMatches.map(m => parseInt(m.replace(/[¥￥,円\s]/g, ''))).filter(a => !isNaN(a));
                        if (amounts.length > 0) {
                            info.amount = Math.max(...amounts);
                            if (!info.tax) {
                                info.tax = Math.floor(info.amount * 0.1 / 1.1);
                            }
                        }
                    }
                }
                return info;
            },
        },
        saveOCRResult: {
            description: 'Save OCR result to MongoDB',
            execute: async ({ fileId, ocrResult, extractedInfo, companyId }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const ocrRecord = {
                        fileId,
                        companyId,
                        extractedText: ocrResult.text,
                        confidence: ocrResult.confidence,
                        ocrProvider: ocrResult.isAzure ? 'azure' : (ocrResult.isHandwritten ? 'handwriting' : 'unknown'),
                        extractedData: {
                            vendor: extractedInfo.vendor,
                            date: extractedInfo.date,
                            amount: extractedInfo.amount,
                            tax: extractedInfo.tax,
                            items: extractedInfo.items,
                        },
                        processingMetadata: {
                            modelUsed: ocrResult.isAzure ? 'azure-form-recognizer' : 'handwriting-ocr',
                            language: 'ja',
                            fileType: 'unknown',
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    const result = await db.create(mongodb_client_1.Collections.OCR_RESULTS, ocrRecord);
                    return {
                        success: true,
                        ocrResultId: result._id.toString(),
                        message: 'OCR結果が保存されました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('OCR result save error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        updateFileMetadata: {
            description: 'Update file metadata with OCR results',
            execute: async ({ fileId, ocrResultId, extractedInfo, companyId }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const updateData = {
                        ocrResultId,
                        ocrStatus: 'completed',
                        extractedData: extractedInfo,
                        ocrCompletedAt: new Date(),
                        updatedAt: new Date(),
                    };
                    const result = await db.update(mongodb_client_1.Collections.DOCUMENTS, fileId, updateData);
                    if (!result) {
                        logger_1.logger.warn(`File document not found for ID: ${fileId}`);
                    }
                    return {
                        success: true,
                        message: 'ファイルメタデータが更新されました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('File metadata update error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
    },
    execute: async ({ input, tools }) => {
        try {
            logger_1.logger.debug('[OCR Agent] Starting OCR processing:', {
                fileId: input.fileId,
                extractType: input.extractType,
                hasFileData: !!input.fileData
            });
            let fileData = input.fileData;
            if (!fileData && input.fileUrl) {
                try {
                    const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
                    const response = await fetch(input.fileUrl);
                    const buffer = await response.buffer();
                    fileData = buffer.toString('base64');
                }
                catch (error) {
                    throw new Error(`Failed to fetch file from URL: ${error.message}`);
                }
            }
            else if (!fileData && input.filePath) {
                try {
                    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                    const buffer = fs.readFileSync(input.filePath);
                    fileData = buffer.toString('base64');
                }
                catch (error) {
                    throw new Error(`Failed to read file from path: ${error.message}`);
                }
            }
            if (!fileData) {
                throw new Error('No file data provided');
            }
            let ocrResult = null;
            let ocrText = '';
            const isHandwritten = input.extractType === 'handwritten';
            try {
                logger_1.logger.debug('[OCR Agent] Using Azure Form Recognizer');
                ocrResult = await tools.azureFormRecognizerOCR({
                    fileData,
                    extractType: input.extractType,
                });
                ocrText = ocrResult.text;
            }
            catch (azureError) {
                logger_1.logger.warn('Azure Form Recognizer failed:', azureError);
                if (isHandwritten && process.env.HANDWRITING_OCR_API_TOKEN) {
                    try {
                        logger_1.logger.debug('[OCR Agent] Falling back to HandwritingOCR');
                        ocrResult = await tools.handwritingOCR({
                            fileData,
                            language: input.language,
                        });
                        ocrText = ocrResult.text;
                    }
                    catch (handwritingError) {
                        logger_1.logger.error('HandwritingOCR also failed:', handwritingError);
                        throw new Error(`All OCR services failed. Azure: ${azureError.message}, Handwriting: ${handwritingError.message}`);
                    }
                }
                else {
                    throw azureError;
                }
            }
            if (!ocrText) {
                throw new Error('No text extracted from the document');
            }
            let extractedInfo = {};
            if (input.extractType === 'receipt' || input.extractType === 'invoice') {
                extractedInfo = await tools.extractReceiptInfo({
                    text: ocrText,
                    structuredData: ocrResult.structuredData
                });
            }
            if (input.fileId) {
                const saveResult = await tools.saveOCRResult({
                    fileId: input.fileId,
                    ocrResult,
                    extractedInfo,
                    companyId: input.companyId
                });
                if (saveResult.success) {
                    await tools.updateFileMetadata({
                        fileId: input.fileId,
                        ocrResultId: saveResult.ocrResultId,
                        extractedInfo,
                        companyId: input.companyId
                    });
                }
            }
            const result = {
                success: true,
                text: ocrText,
                confidence: ocrResult.confidence || 0.85,
                ...extractedInfo,
                ocrProvider: ocrResult.isAzure ? 'Azure Form Recognizer' : 'HandwritingOCR',
                extractType: input.extractType,
                message: 'OCR処理が完了しました'
            };
            logger_1.logger.debug('[OCR Agent] OCR processing completed:', {
                textLength: ocrText.length,
                vendor: result.vendor,
                amount: result.amount,
                confidence: result.confidence
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('[OCR Agent] Error:', error);
            return {
                success: false,
                error: error.message,
                text: '',
                confidence: 0
            };
        }
    },
});
exports.default = exports.ocrAgent;
//# sourceMappingURL=ocr-agent.js.map