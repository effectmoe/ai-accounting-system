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
exports.runtime = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    try {
        // 環境変数チェック
        const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
        if (!useAzureMongoDB) {
            return server_1.NextResponse.json({
                success: false,
                error: 'MongoDB is not enabled. Use legacy system.'
            }, { status: 400 });
        }
        const body = await request.json();
        const { companyId, date, description, debitAccount, creditAccount, amount, taxAmount, taxRate, isTaxIncluded, documentId, vendorName // 元の会社名/店舗名を受け取る
         } = body;
        // 元のドキュメント情報を取得（カテゴリと画像IDを引き継ぐため）
        let sourceDocument = null;
        if (documentId) {
            try {
                sourceDocument = await mongodb_client_1.db.findOne('documents', { _id: new mongodb_1.ObjectId(documentId) });
                logger_1.logger.debug('Source document:', {
                    id: sourceDocument?._id,
                    category: sourceDocument?.category,
                    gridfsFileId: sourceDocument?.gridfsFileId
                });
            }
            catch (e) {
                logger_1.logger.error('Failed to fetch source document:', e);
            }
        }
        // debitAccountが指定されていない場合、元のドキュメントから取得するか、OCRProcessorで判定
        let finalDebitAccount = debitAccount;
        let finalCreditAccount = creditAccount || '現金';
        let finalDescription = description;
        // まず元のドキュメントのカテゴリを優先
        if (!debitAccount && sourceDocument?.category && sourceDocument.category !== '未分類') {
            finalDebitAccount = sourceDocument.category;
        }
        // それでもない場合はOCRProcessorで判定
        else if (!debitAccount && vendorName) {
            const { OCRProcessor } = await Promise.resolve().then(() => __importStar(require('@/lib/ocr-processor')));
            const ocrProcessor = new OCRProcessor();
            const ocrResult = {
                vendor: vendorName,
                amount: amount || 0,
                taxAmount: taxAmount || 0,
                date: date || new Date().toISOString().split('T')[0],
                items: []
            };
            const journalEntry = await ocrProcessor.createJournalEntry(ocrResult, companyId || '11111111-1111-1111-1111-111111111111');
            finalDebitAccount = journalEntry.debitAccount;
            finalCreditAccount = journalEntry.creditAccount;
            finalDescription = journalEntry.description;
        }
        // 仕訳番号を生成（簡易版）
        const journalCount = await mongodb_client_1.db.count('journals', { companyId });
        const journalNumber = `J${new Date().getFullYear()}${String(journalCount + 1).padStart(5, '0')}`;
        // 仕訳データを作成
        const journalEntry = {
            companyId,
            journalNumber,
            entryDate: new Date(date),
            description: finalDescription,
            status: 'confirmed',
            sourceType: 'ocr',
            sourceDocumentId: documentId ? new mongodb_1.ObjectId(documentId) : null,
            lines: [
                {
                    accountCode: '605', // 仮の勘定科目コード
                    accountName: finalDebitAccount,
                    debitAmount: amount,
                    creditAmount: 0,
                    taxRate: taxRate || 0.10,
                    taxAmount: taxAmount || 0,
                    isTaxIncluded: isTaxIncluded !== false
                },
                {
                    accountCode: '100', // 仮の勘定科目コード（現金）
                    accountName: finalCreditAccount,
                    debitAmount: 0,
                    creditAmount: amount,
                    taxRate: 0,
                    taxAmount: 0,
                    isTaxIncluded: false
                }
            ],
            totalDebit: amount,
            totalCredit: amount,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // MongoDBに保存
        const savedJournal = await mongodb_client_1.db.create('journals', journalEntry);
        // 関連ドキュメントを更新（存在する場合）
        // 重複表示を防ぐため、元のドキュメントを非表示にする
        if (documentId) {
            await mongodb_client_1.db.update('documents', documentId, {
                status: 'journalized',
                journalId: savedJournal._id,
                hiddenFromList: true, // 書類管理画面から非表示にする
                updatedAt: new Date()
            });
        }
        // 仕訳文書として documents コレクションにも保存
        const journalDocument = {
            companyId,
            documentType: 'journal_entry',
            documentNumber: journalNumber,
            fileName: `仕訳伝票_${journalNumber}`,
            status: 'confirmed',
            issueDate: new Date(date),
            partnerName: vendorName || description.split(' - ')[0] || debitAccount,
            partnerAddress: '',
            totalAmount: amount,
            taxAmount: taxAmount || 0,
            subtotal: amount - (taxAmount || 0),
            notes: description,
            category: finalDebitAccount, // 借方勘定科目を保存
            journalId: savedJournal._id,
            sourceDocumentId: documentId ? new mongodb_1.ObjectId(documentId) : null,
            gridfsFileId: sourceDocument?.gridfsFileId || null, // 元画像のIDを引き継ぐ
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const savedJournalDocument = await mongodb_client_1.db.create('documents', journalDocument);
        logger_1.logger.debug('Created journal document:', {
            id: savedJournalDocument._id,
            documentType: journalDocument.documentType,
            sourceDocumentId: journalDocument.sourceDocumentId
        });
        // 4. 元のOCRドキュメントを非表示にする（OCRリストから削除）
        if (documentId) {
            await mongodb_client_1.db.update('documents', new mongodb_1.ObjectId(documentId), {
                hiddenFromList: true,
                journalId: savedJournal._id,
                updatedAt: new Date()
            });
            logger_1.logger.debug('Hidden original OCR document:', documentId);
        }
        return server_1.NextResponse.json({
            success: true,
            journal: {
                id: savedJournal._id.toString(),
                journalNumber,
                ...journalEntry
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Journal creation error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create journal entry'
        }, { status: 500 });
    }
}
async function GET() {
    return server_1.NextResponse.json({
        message: 'Journal Creation API',
        method: 'POST',
        fields: {
            companyId: 'required',
            date: 'required',
            description: 'required',
            debitAccount: 'required',
            creditAccount: 'required',
            amount: 'required',
            taxAmount: 'optional',
            taxRate: 'optional',
            isTaxIncluded: 'optional',
            documentId: 'optional'
        }
    });
}
// Node.js Runtimeを使用
exports.runtime = 'nodejs';
