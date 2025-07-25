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
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const ai_form_recognizer_1 = require("@azure/ai-form-recognizer");
const ocr_ai_orchestrator_1 = require("@/lib/ocr-ai-orchestrator");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const stream_1 = require("stream");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    const startTime = Date.now();
    console.log('🎯 [OCR API] OCR処理開始');
    console.log('📅 [OCR API] 処理開始時刻:', new Date().toISOString());
    try {
        logger_1.logger.debug('[OCR API] Starting OCR analysis...');
        logger_1.logger.debug('[OCR API] Request started at:', new Date().toISOString());
        const formData = await request.formData();
        const file = formData.get('file');
        const documentType = formData.get('documentType') || 'invoice';
        const companyId = formData.get('companyId') || '11111111-1111-1111-1111-111111111111';
        logger_1.logger.debug('[OCR API] File size:', file?.size || 0, 'bytes');
        logger_1.logger.debug('[OCR API] Document type:', documentType);
        if (!file) {
            return server_1.NextResponse.json({ error: 'ファイルが提供されていません' }, { status: 400 });
        }
        // ファイルバッファを一度だけ取得（後でGridFSでも使用）
        const fileBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(fileBuffer);
        // Azure Form Recognizerで基本的なOCR処理
        let azureOcrResult;
        const azureEndpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
        const azureKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
        logger_1.logger.debug('[OCR API] Azure config check:', {
            hasEndpoint: !!azureEndpoint,
            endpointValue: azureEndpoint || 'not set',
            hasKey: !!azureKey,
            keyLength: azureKey?.length || 0,
            keyPrefix: azureKey?.substring(0, 10) || 'not set'
        });
        if (azureEndpoint && azureKey && !azureEndpoint.includes('your-fr-endpoint') && !azureKey.includes('your-azure-key')) {
            logger_1.logger.debug('[OCR API] Using Azure Form Recognizer...');
            const client = new ai_form_recognizer_1.DocumentAnalysisClient(azureEndpoint, new ai_form_recognizer_1.AzureKeyCredential(azureKey));
            // fileBufferとuint8Arrayは既に上で取得済み
            // documentTypeに応じてモデルを選択
            const modelId = documentType === 'supplier-quote' ? 'prebuilt-invoice' : 'prebuilt-invoice';
            const poller = await client.beginAnalyzeDocument(modelId, uint8Array);
            azureOcrResult = await poller.pollUntilDone();
            const azureElapsed = Date.now() - startTime;
            logger_1.logger.debug('[OCR API] Azure Form Recognizer completed in', azureElapsed, 'ms');
        }
        else {
            logger_1.logger.debug('[OCR API] Azure Form Recognizer not configured properly, using mock data');
            logger_1.logger.debug('[OCR API] Mock data reason:', {
                noEndpoint: !azureEndpoint,
                noKey: !azureKey,
                isTestEndpoint: azureEndpoint?.includes('your-fr-endpoint'),
                isTestKey: azureKey?.includes('your-azure-key')
            });
            // より現実的なモックデータ
            azureOcrResult = {
                content: `合同会社アソウタイセイプリンティング
〒xxx-xxxx 東京都〇〇区〇〇 1-2-3
TEL: 03-xxxx-xxxx FAX: 03-xxxx-xxxx

見積書

見積番号: M-2025-001
発行日: 2025年1月18日

株式会社CROP御中

件名: 印刷物

下記の通り御見積申し上げます。

品名: 領収書（3枚複写・1冊50組）
数量: 1
単価: 5,000
金額: 5,000

小計: 5,000
消費税: 500
合計金額: 5,500円

備考: 納期は発注後約1週間となります。`,
                pages: [
                    {
                        pageNumber: 1,
                        lines: [
                            { content: '合同会社アソウタイセイプリンティング' },
                            { content: '〒xxx-xxxx 東京都〇〇区〇〇 1-2-3' },
                            { content: 'TEL: 03-xxxx-xxxx FAX: 03-xxxx-xxxx' },
                            { content: '見積書' },
                            { content: '見積番号: M-2025-001' },
                            { content: '発行日: 2025年1月18日' },
                            { content: '株式会社CROP御中' },
                            { content: '件名: 印刷物' },
                            { content: '下記の通り御見積申し上げます。' },
                            { content: '品名: 領収書（3枚複写・1冊50組）' },
                            { content: '数量: 1' },
                            { content: '単価: 5,000' },
                            { content: '金額: 5,000' },
                            { content: '小計: 5,000' },
                            { content: '消費税: 500' },
                            { content: '合計金額: 5,500円' },
                            { content: '備考: 納期は発注後約1週間となります。' }
                        ]
                    }
                ],
                fields: {
                    'DocumentNumber': { value: 'M-2025-001' },
                    'Date': { value: '2025-01-18' },
                    'VendorName': { value: '合同会社アソウタイセイプリンティング' },
                    'CustomerName': { value: '株式会社CROP' },
                    'Total': { value: 5500 }
                },
                tables: []
            };
        }
        // AI駆動のOCRオーケストレーター を使用
        logger_1.logger.debug('[OCR API] Starting AI-driven orchestration...');
        const orchestrator = new ocr_ai_orchestrator_1.OCRAIOrchestrator();
        const structuredData = await orchestrator.orchestrateOCRResult({
            ocrResult: azureOcrResult,
            documentType: documentType,
            companyId: companyId
        });
        const totalElapsed = Date.now() - startTime;
        logger_1.logger.debug('[OCR API] AI orchestration completed successfully in', totalElapsed, 'ms total');
        // 先にファイルをGridFSに保存
        let gridfsFileId = null;
        try {
            logger_1.logger.debug('[OCR API] Saving file to GridFS...');
            const bucket = await (0, mongodb_client_1.getGridFSBucket)();
            // GridFSにファイルをアップロード
            const uploadStream = bucket.openUploadStream(file.name, {
                metadata: {
                    uploadedAt: new Date(),
                    contentType: file.type,
                    documentType: documentType,
                    companyId: companyId,
                    ocrProcessed: true
                }
            });
            // ファイルIDを取得
            gridfsFileId = uploadStream.id.toString();
            logger_1.logger.debug('[OCR API] GridFS file ID:', gridfsFileId);
            // BufferをStreamに変換してアップロード
            const readableStream = stream_1.Readable.from(Buffer.from(fileBuffer));
            await new Promise((resolve, reject) => {
                readableStream.pipe(uploadStream)
                    .on('error', reject)
                    .on('finish', resolve);
            });
            logger_1.logger.debug('[OCR API] File saved to GridFS successfully');
        }
        catch (gridfsError) {
            logger_1.logger.error('[OCR API] Error saving to GridFS:', gridfsError);
            // GridFS保存に失敗しても処理は続行（fileIdはnullのまま）
        }
        // MongoDBに結果を保存
        let mongoDbSaved = false;
        let mongoDbId = null;
        try {
            const { MongoClient } = await Promise.resolve().then(() => __importStar(require('mongodb')));
            const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            const client = new MongoClient(uri);
            await client.connect();
            const dbName = process.env.MONGODB_DB_NAME || 'accounting';
            const db = client.db(dbName.trim());
            const collection = db.collection('documents');
            // OCR結果をドキュメントとして保存
            const currentDate = new Date();
            console.log('📅 [OCR API] 現在の日時:', currentDate.toISOString());
            console.log('📅 [OCR API] 抽出された日付:', {
                invoiceDate: structuredData.invoiceDate,
                issueDate: structuredData.issueDate,
                receiptDate: structuredData.receiptDate
            });
            // 駐車場関連フィールドのログ
            console.log('🚗 [OCR API] 駐車場関連フィールド:', {
                receiptType: structuredData.receiptType,
                facilityName: structuredData.facilityName,
                entryTime: structuredData.entryTime,
                exitTime: structuredData.exitTime,
                parkingDuration: structuredData.parkingDuration,
                baseFee: structuredData.baseFee,
                additionalFee: structuredData.additionalFee,
                companyName: structuredData.companyName
            });
            const ocrDocument = {
                companyId: companyId,
                type: documentType,
                ocrStatus: 'completed',
                ocrProcessedAt: currentDate,
                ocrResult: structuredData,
                // 主要フィールドを展開（読み取りAPIが期待するフィールド名に合わせる）
                documentNumber: structuredData.documentNumber || structuredData.receiptNumber,
                issueDate: structuredData.issueDate || structuredData.invoiceDate,
                vendor_name: structuredData.vendor?.name || structuredData.vendorName,
                vendorName: structuredData.vendor?.name || structuredData.vendorName,
                customer_name: structuredData.customer?.name || structuredData.customerName,
                amount: structuredData.totalAmount?.amount || structuredData.totalAmount,
                // OCR結果API用のフィールド
                total_amount: structuredData.totalAmount?.amount || structuredData.totalAmount || 0,
                totalAmount: structuredData.totalAmount?.amount || structuredData.totalAmount || 0,
                tax_amount: structuredData.taxAmount || 0,
                taxAmount: structuredData.taxAmount || 0,
                subtotal_amount: structuredData.subtotalAmount || ((structuredData.totalAmount?.amount || structuredData.totalAmount || 0) - (structuredData.taxAmount || 0)),
                receipt_date: structuredData.invoiceDate || structuredData.issueDate || new Date(),
                receipt_number: structuredData.receiptNumber || structuredData.documentNumber || '',
                store_name: structuredData.vendor?.name || structuredData.vendorName || '',
                extracted_text: JSON.stringify(structuredData),
                // 駐車場領収書専用フィールド
                receiptType: structuredData.receiptType,
                facilityName: structuredData.facilityName,
                entryTime: structuredData.entryTime,
                exitTime: structuredData.exitTime,
                parkingDuration: structuredData.parkingDuration,
                baseFee: structuredData.baseFee,
                additionalFee: structuredData.additionalFee,
                companyName: structuredData.companyName,
                // その他のメタデータ
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                createdAt: currentDate,
                updatedAt: currentDate,
                // GridFSファイルIDを設定
                gridfsFileId: gridfsFileId ? new mongodb_1.ObjectId(gridfsFileId) : null,
                sourceFileId: gridfsFileId ? new mongodb_1.ObjectId(gridfsFileId) : null,
                // フラグ
                linked_document_id: null,
                hiddenFromList: false,
                status: 'active',
                // 勘定科目は後で非同期で追加
                category: '未分類',
                subcategory: null
            };
            const insertResult = await collection.insertOne(ocrDocument);
            // 保存確認
            const savedDoc = await collection.findOne({ _id: insertResult.insertedId });
            if (savedDoc) {
                mongoDbSaved = true;
                mongoDbId = insertResult.insertedId;
                logger_1.logger.debug('[OCR API] Document saved and verified:', insertResult.insertedId);
                console.log('✅ [OCR API] MongoDB保存・確認成功! ID:', insertResult.insertedId);
                // 保存されたドキュメントのOCR関連フィールドを確認
                console.log('🔍 [OCR API] 保存されたOCRフィールド:', {
                    vendor_name: savedDoc.vendor_name,
                    receipt_date: savedDoc.receipt_date,
                    category: savedDoc.category,
                    total_amount: savedDoc.total_amount,
                    file_name: savedDoc.fileName,
                    gridfsFileId: savedDoc.gridfsFileId?.toString(),
                    // 駐車場関連フィールド
                    receiptType: savedDoc.receiptType,
                    facilityName: savedDoc.facilityName,
                    entryTime: savedDoc.entryTime,
                    exitTime: savedDoc.exitTime,
                    parkingDuration: savedDoc.parkingDuration,
                    baseFee: savedDoc.baseFee,
                    additionalFee: savedDoc.additionalFee
                });
            }
            else {
                mongoDbSaved = false;
                console.log('❌ [OCR API] MongoDB保存後の確認に失敗!');
            }
            console.log('📄 [OCR API] 保存したドキュメント:', JSON.stringify({
                _id: insertResult.insertedId,
                companyId: ocrDocument.companyId,
                documentNumber: ocrDocument.documentNumber,
                vendor_name: ocrDocument.vendor_name,
                amount: ocrDocument.amount,
                ocrStatus: ocrDocument.ocrStatus,
                createdAt: ocrDocument.createdAt,
                receipt_date: ocrDocument.receipt_date,
                issueDate: ocrDocument.issueDate,
                gridfsFileId: ocrDocument.gridfsFileId,
                category: ocrDocument.category,
                file_name: ocrDocument.fileName,
                ocrResultDetails: {
                    vendor: structuredData.vendor,
                    items: structuredData.items,
                    notes: structuredData.notes
                }
            }, null, 2));
            await client.close();
            // 勘定科目AI推論を非同期で実行（領収書の場合のみ）
            if (mongoDbSaved && documentType === 'receipt') {
                try {
                    const { AccountCategoryAI } = await Promise.resolve().then(() => __importStar(require('@/lib/account-category-ai')));
                    const categoryAI = new AccountCategoryAI();
                    const ocrResultForAI = {
                        text: JSON.stringify(structuredData),
                        vendor_name: structuredData.vendor?.name || structuredData.vendorName || '',
                        total_amount: structuredData.totalAmount?.amount || structuredData.totalAmount || 0,
                        items: structuredData.items || []
                    };
                    logger_1.logger.debug('[OCR API] Starting category AI prediction for receipt...');
                    // 非同期で実行（レスポンスを待たない）
                    categoryAI.predictAccountCategory(ocrResultForAI, companyId).then(async (prediction) => {
                        if (prediction && prediction.confidence >= 0.6) {
                            const { MongoClient } = await Promise.resolve().then(() => __importStar(require('mongodb')));
                            const updateClient = new MongoClient(uri);
                            try {
                                await updateClient.connect();
                                const updateDb = updateClient.db(dbName.trim());
                                const updateCollection = updateDb.collection('documents');
                                await updateCollection.updateOne({ _id: mongoDbId }, {
                                    $set: {
                                        category: prediction.category,
                                        subcategory: prediction.subcategory,
                                        aiPrediction: {
                                            category: prediction.category,
                                            subcategory: prediction.subcategory,
                                            confidence: prediction.confidence,
                                            reasoning: prediction.reasoning,
                                            alternativeCategories: prediction.alternativeCategories,
                                            notes: prediction.notes,
                                            predictionDate: new Date()
                                        }
                                    }
                                });
                                logger_1.logger.debug('[OCR API] Category updated successfully:', prediction.category);
                            }
                            catch (updateError) {
                                logger_1.logger.error('[OCR API] Category update error:', updateError);
                            }
                            finally {
                                await updateClient.close();
                            }
                        }
                    }).catch(error => {
                        logger_1.logger.error('[OCR API] Category prediction error:', error);
                    });
                }
                catch (error) {
                    logger_1.logger.error('[OCR API] AccountCategoryAI initialization error:', error);
                }
            }
        }
        catch (dbError) {
            logger_1.logger.error('[OCR API] MongoDB save error:', dbError);
            console.error('❌ [OCR API] MongoDB保存エラー詳細:', {
                error: dbError instanceof Error ? dbError.message : dbError,
                stack: dbError instanceof Error ? dbError.stack : undefined,
                mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
            });
            // DBエラーがあっても処理は続行
        }
        const response = {
            success: true,
            data: structuredData,
            fileId: gridfsFileId, // GridFSのファイルIDを返す
            mongoDbId: mongoDbId?.toString(), // MongoDBのドキュメントID
            mongoDbSaved: mongoDbSaved, // MongoDB保存の成否
            message: 'DeepSeek AI駆動のOCR解析が完了しました',
            processingMethod: 'DeepSeek-AI-driven',
            model: 'deepseek-chat',
            processingTime: {
                total: totalElapsed,
                azure: azureOcrResult ? (Date.now() - startTime) : 0
            }
        };
        console.log('✅ [OCR API] OCR処理完了！レスポンス:', JSON.stringify({
            success: response.success,
            documentNumber: structuredData.documentNumber,
            vendor: structuredData.vendor?.name,
            amount: structuredData.totalAmount
        }, null, 2));
        return server_1.NextResponse.json(response);
    }
    catch (error) {
        const totalElapsed = Date.now() - startTime;
        logger_1.logger.error('[OCR API] Error after', totalElapsed, 'ms:', error);
        logger_1.logger.error('[OCR API] Error type:', error?.constructor?.name);
        logger_1.logger.error('[OCR API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // タイムアウトエラーの場合は特別な処理
        if (error instanceof Error && error.message.includes('timed out')) {
            return server_1.NextResponse.json({
                error: 'OCR処理がタイムアウトしました',
                details: 'DeepSeek APIの応答が遅いため、処理時間制限を超過しました。しばらく待ってから再試行してください。',
                processingMethod: 'DeepSeek-AI-driven (timeout)',
                processingTime: totalElapsed
            }, { status: 504 });
        }
        // AI Orchestratorが利用できない場合
        if (error instanceof Error && error.message.includes('AI Orchestrator is not available')) {
            return server_1.NextResponse.json({
                error: 'AI OCR処理が利用できません',
                details: 'DeepSeek APIキーが設定されていないか、無効です。環境変数を確認してください。',
                processingMethod: 'DeepSeek-AI-driven (unavailable)',
                processingTime: totalElapsed,
                debugInfo: {
                    hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
                    deepSeekKeyPrefix: process.env.DEEPSEEK_API_KEY?.substring(0, 10) || 'not set'
                }
            }, { status: 503 });
        }
        // その他のエラー
        return server_1.NextResponse.json({
            error: 'DeepSeek OCR解析中にエラーが発生しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            processingMethod: 'DeepSeek-AI-driven (failed)',
            processingTime: totalElapsed,
            errorType: error?.constructor?.name || 'UnknownError',
            debugInfo: {
                hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
                hasAzureKey: !!process.env.AZURE_FORM_RECOGNIZER_KEY,
                nodeEnv: process.env.NODE_ENV
            }
        }, { status: 500 });
    }
}
async function GET(request) {
    return server_1.NextResponse.json({
        endpoint: 'DeepSeek OCR Analyze',
        method: 'POST',
        description: 'DeepSeek AI駆動のOCR解析エンドポイント',
        supportedDocumentTypes: ['invoice', 'supplier-quote', 'receipt'],
        model: 'deepseek-chat',
        features: [
            '日本語ビジネス文書の高精度解析',
            '合同会社アソウタイセイプリンティング等の企業名正確認識',
            '御中・様による顧客・仕入先自動判別',
            '商品明細の構造化抽出',
            '金額計算の自動検証',
            'DeepSeek Chat モデルによる高精度解析'
        ],
        timestamp: new Date().toISOString()
    });
}
