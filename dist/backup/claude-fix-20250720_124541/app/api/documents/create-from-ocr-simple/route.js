"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    try {
        const body = await request.json();
        logger_1.logger.debug('Received request body:', JSON.stringify(body, null, 2));
        const { ocrResultId, document_type = 'receipt', vendor_name = '', receipt_date = new Date().toISOString().split('T')[0], subtotal_amount = 0, tax_amount = 0, total_amount = 0, payment_amount = 0, change_amount = 0, receipt_number = '', store_name = '', store_phone = '', company_name = '', notes = '', file_name = '文書' } = body;
        // MongoDB データベース接続
        const db = mongodb_client_1.DatabaseService.getInstance();
        const companyId = '11111111-1111-1111-1111-111111111111';
        // 小計を計算（subtotal_amountが提供されていない場合は、total_amountから税額を引く）
        const calculatedSubtotal = subtotal_amount > 0 ? subtotal_amount : Math.max(0, total_amount - tax_amount);
        // パートナー名を決定（vendor_name, store_name, company_nameの優先順）
        const partnerName = vendor_name || store_name || company_name || '不明';
        // 備考欄に支払い情報を含める
        const enhancedNotes = [
            notes || 'OCRデータより作成',
            payment_amount > 0 ? `お預かり: ¥${payment_amount.toLocaleString()}` : '',
            change_amount > 0 ? `お釣り: ¥${change_amount.toLocaleString()}` : '',
            receipt_number ? `領収書番号: ${receipt_number}` : ''
        ].filter(n => n).join('\n');
        // 文書番号のプレフィックスを文書種別に応じて変更
        const prefixMap = {
            receipt: 'REC',
            invoice: 'INV',
            estimate: 'EST',
            delivery_note: 'DLV'
        };
        const prefix = prefixMap[document_type] || 'DOC';
        // 保存するデータを準備
        const documentData = {
            companyId: companyId,
            documentType: document_type,
            type: document_type,
            documentNumber: receipt_number || `${prefix}-${new Date().getTime()}`,
            issueDate: receipt_date,
            partnerName: partnerName,
            partnerAddress: '',
            partnerPhone: store_phone || '',
            partnerEmail: '',
            partnerPostalCode: '',
            projectName: file_name,
            subtotal: calculatedSubtotal,
            taxAmount: tax_amount,
            totalAmount: total_amount,
            status: 'draft',
            notes: enhancedNotes,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        logger_1.logger.debug('Document data to save:', JSON.stringify(documentData, null, 2));
        // MongoDBに保存
        const savedDoc = await db.create(mongodb_client_1.Collections.DOCUMENTS, documentData);
        // 明細を保存
        await db.create(mongodb_client_1.Collections.ITEMS, {
            documentId: savedDoc._id,
            itemOrder: 1,
            itemName: file_name || '商品・サービス',
            quantity: 1,
            unitPrice: calculatedSubtotal,
            taxRate: tax_amount > 0 ? 0.10 : 0,
            amount: calculatedSubtotal,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        // OCR結果を更新
        if (ocrResultId) {
            try {
                await db.updateById(mongodb_client_1.Collections.OCR_RESULTS, ocrResultId, {
                    linkedDocumentId: savedDoc._id,
                    status: 'processed',
                    updatedAt: new Date()
                });
                logger_1.logger.debug('OCR result updated successfully:', ocrResultId);
            }
            catch (updateError) {
                logger_1.logger.error('OCR result update error:', updateError);
                // エラーがあってもレスポンスは成功として返す（文書は作成済みのため）
            }
        }
        // 勘定科目を推論（非同期で実行）
        // TODO: Mastraのビルド問題を解決後に有効化
        /*
        try {
          const { AccountInferenceAgent } = await import('@/agents/account-inference-agent');
          const agent = new AccountInferenceAgent();
          
          // 非同期で推論実行（レスポンスを待たない）
          agent.analyzeDocument({
            documentType: 'receipt',
            vendorName: partnerName,
            items: [{
              name: file_name || '商品・サービス',
              amount: calculatedSubtotal
            }],
            totalAmount: total_amount,
            notes: enhancedNotes,
            extractedText: body.extracted_text
          }).then(async (inference) => {
            if (inference) {
              await agent.saveInference(savedDoc.id, inference);
              logger.debug('勘定科目推論完了:', inference);
            }
          }).catch((error) => {
            logger.error('勘定科目推論エラー:', error);
          });
        } catch (error) {
          logger.error('Agent initialization error:', error);
          // エラーが発生しても文書作成は成功とする
        }
        */
        const documentTypeLabels = {
            receipt: '領収書',
            invoice: '請求書',
            estimate: '見積書',
            delivery_note: '納品書'
        };
        const label = documentTypeLabels[document_type] || '文書';
        return server_1.NextResponse.json({
            id: savedDoc._id,
            message: `${label}を作成しました（勘定科目を推論中...）`
        });
    }
    catch (error) {
        logger_1.logger.error('Create document error:', error);
        logger_1.logger.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            error: error
        });
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : '文書の作成に失敗しました',
            details: error instanceof Error ? error.stack : undefined,
            errorObject: JSON.stringify(error, null, 2)
        }, { status: 500 });
    }
}
