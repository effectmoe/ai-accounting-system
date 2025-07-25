#!/usr/bin/env ts-node
"use strict";
/**
 * 駐車場領収書データフロー デバッグスクリプト
 *
 * このスクリプトは、OCRから文書表示までの駐車場データの流れを追跡し、
 * データが失われる場所を特定します。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const logger_1 = require("../lib/logger");
// 環境変数の読み込み
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting';
async function debugParkingDataFlow(documentId) {
    const client = new mongodb_1.MongoClient(MONGODB_URI);
    const debugLog = [];
    try {
        await client.connect();
        console.log('✅ MongoDB接続成功');
        const db = client.db(DB_NAME);
        const documentsCollection = db.collection('documents');
        const ocrResultsCollection = db.collection('ocr_results');
        // ステップ1: 駐車場関連の文書を検索
        console.log('\n📋 ステップ1: 駐車場関連文書の検索');
        let query = {};
        if (documentId) {
            // 特定のドキュメントIDで検索
            if (mongodb_1.ObjectId.isValid(documentId)) {
                query._id = new mongodb_1.ObjectId(documentId);
            }
            else {
                query.displayNumber = documentId;
            }
        }
        else {
            // 駐車場関連のすべての文書を検索
            query = {
                $or: [
                    { receiptType: 'parking' },
                    { receipt_type: 'parking' },
                    { 'ocrResult.receiptType': 'parking' },
                    { vendor_name: { $regex: /タイムズ|times|パーキング|駐車場/i } },
                    { vendorName: { $regex: /タイムズ|times|パーキング|駐車場/i } },
                    { facilityName: { $exists: true } },
                    { facility_name: { $exists: true } }
                ]
            };
        }
        const documents = await documentsCollection.find(query).limit(10).toArray();
        console.log(`📊 見つかった文書数: ${documents.length}`);
        for (const doc of documents) {
            console.log(`\n\n========== 文書 ID: ${doc._id} ==========`);
            console.log(`📅 作成日: ${doc.createdAt}`);
            console.log(`🏢 ベンダー名: ${doc.vendor_name || doc.vendorName || '不明'}`);
            // ステップ2: 文書内の駐車場フィールドを確認
            console.log('\n📋 ステップ2: 保存されている駐車場フィールド');
            const parkingFields = {};
            const camelCaseFields = [];
            const snakeCaseFields = [];
            const missingFields = [];
            // キャメルケースフィールドチェック
            const camelFields = ['receiptType', 'facilityName', 'entryTime', 'exitTime', 'parkingDuration', 'baseFee', 'additionalFee', 'companyName'];
            for (const field of camelFields) {
                if (doc[field] !== undefined) {
                    parkingFields[field] = doc[field];
                    camelCaseFields.push(field);
                    console.log(`✅ ${field}: ${doc[field]}`);
                }
                else {
                    missingFields.push(field);
                }
            }
            // スネークケースフィールドチェック
            const snakeFields = ['receipt_type', 'facility_name', 'entry_time', 'exit_time', 'parking_duration', 'base_fee', 'additional_fee', 'company_name'];
            for (const field of snakeFields) {
                if (doc[field] !== undefined) {
                    parkingFields[field] = doc[field];
                    snakeCaseFields.push(field);
                    console.log(`✅ ${field}: ${doc[field]}`);
                }
                else {
                    missingFields.push(field);
                }
            }
            debugLog.push({
                step: 'Document Fields',
                data: { _id: doc._id, vendor_name: doc.vendor_name || doc.vendorName },
                parkingFields,
                fieldMapping: {
                    camelCase: camelCaseFields,
                    snake_case: snakeCaseFields,
                    missing: missingFields
                }
            });
            // ステップ3: ネストされたOCR結果を確認
            console.log('\n📋 ステップ3: ネストされたOCR結果の確認');
            if (doc.ocrResult) {
                console.log('🔍 ocrResultフィールドが存在');
                const ocrParkingFields = {};
                for (const field of [...camelFields, ...snakeFields]) {
                    if (doc.ocrResult[field] !== undefined) {
                        ocrParkingFields[field] = doc.ocrResult[field];
                        console.log(`  ✅ ocrResult.${field}: ${doc.ocrResult[field]}`);
                    }
                }
                if (Object.keys(ocrParkingFields).length > 0) {
                    debugLog.push({
                        step: 'Nested OCR Result',
                        data: { _id: doc._id },
                        parkingFields: ocrParkingFields,
                        fieldMapping: {
                            camelCase: camelFields.filter(f => doc.ocrResult[f] !== undefined),
                            snake_case: snakeFields.filter(f => doc.ocrResult[f] !== undefined),
                            missing: []
                        }
                    });
                }
            }
            // ステップ4: 関連するOCR結果を確認
            if (doc.ocrResultId || doc.ocr_result_id) {
                console.log('\n📋 ステップ4: 関連OCR結果の確認');
                const ocrId = doc.ocrResultId || doc.ocr_result_id;
                const ocrResult = await ocrResultsCollection.findOne({ _id: new mongodb_1.ObjectId(ocrId) });
                if (ocrResult) {
                    console.log(`🔍 OCR結果 ID: ${ocrId}`);
                    const ocrExtractedData = ocrResult.extractedData || {};
                    const ocrParkingFields = {};
                    for (const field of [...camelFields, ...snakeFields]) {
                        if (ocrExtractedData[field] !== undefined) {
                            ocrParkingFields[field] = ocrExtractedData[field];
                            console.log(`  ✅ extractedData.${field}: ${ocrExtractedData[field]}`);
                        }
                    }
                    if (Object.keys(ocrParkingFields).length > 0) {
                        debugLog.push({
                            step: 'OCR Results Collection',
                            data: { _id: ocrId },
                            parkingFields: ocrParkingFields,
                            fieldMapping: {
                                camelCase: camelFields.filter(f => ocrExtractedData[f] !== undefined),
                                snake_case: snakeFields.filter(f => ocrExtractedData[f] !== undefined),
                                missing: []
                            }
                        });
                    }
                }
            }
            // ステップ5: API応答シミュレーション
            console.log('\n📋 ステップ5: API応答のシミュレーション');
            const apiResponse = {
                id: doc._id.toString(),
                receipt_type: doc.receiptType || doc.receipt_type,
                facility_name: doc.facilityName || doc.facility_name,
                entry_time: doc.entryTime || doc.entry_time,
                exit_time: doc.exitTime || doc.exit_time,
                parking_duration: doc.parkingDuration || doc.parking_duration,
                base_fee: doc.baseFee || doc.base_fee,
                additional_fee: doc.additionalFee || doc.additional_fee
            };
            console.log('📤 API応答:', JSON.stringify(apiResponse, null, 2));
            // フィールドマッピングの問題を検出
            const mappingIssues = [];
            if (doc.receiptType && !doc.receipt_type) {
                mappingIssues.push('receiptType (camelCase) は存在するが receipt_type (snake_case) が存在しない');
            }
            if (doc.receipt_type && !doc.receiptType) {
                mappingIssues.push('receipt_type (snake_case) は存在するが receiptType (camelCase) が存在しない');
            }
            if (mappingIssues.length > 0) {
                console.log('\n⚠️  フィールドマッピングの問題:');
                mappingIssues.forEach(issue => console.log(`  - ${issue}`));
            }
        }
        // ステップ6: データフローの問題を分析
        console.log('\n\n========== データフロー分析結果 ==========');
        const problemPoints = [];
        // OCR処理での問題チェック
        const hasOcrParkingData = debugLog.some(log => log.step === 'OCR Results Collection' && Object.keys(log.parkingFields).length > 0);
        const hasDocumentParkingData = debugLog.some(log => log.step === 'Document Fields' && Object.keys(log.parkingFields).length > 0);
        if (hasOcrParkingData && !hasDocumentParkingData) {
            problemPoints.push('❌ OCR結果には駐車場データがあるが、文書には保存されていない');
        }
        // フィールド名の不一致チェック
        const hasCamelCase = debugLog.some(log => log.fieldMapping.camelCase.length > 0);
        const hasSnakeCase = debugLog.some(log => log.fieldMapping.snake_case.length > 0);
        if (hasCamelCase && hasSnakeCase) {
            problemPoints.push('⚠️  キャメルケースとスネークケースのフィールドが混在している');
        }
        // 推奨事項
        console.log('\n📝 推奨事項:');
        if (problemPoints.length > 0) {
            console.log('\n問題点:');
            problemPoints.forEach(point => console.log(`  ${point}`));
        }
        console.log('\n修正案:');
        console.log('1. /app/api/documents/create-from-ocr-simple/route.ts で駐車場フィールドをスネークケースで保存');
        console.log('2. /app/api/documents/[id]/route.ts でキャメルケースとスネークケースの両方をチェック');
        console.log('3. OCR処理時に receiptType を明示的に設定');
        console.log('4. フロントエンドで両方の形式をサポート');
        // デバッグ用のサンプル更新クエリ
        if (documents.length > 0 && !documentId) {
            console.log('\n🔧 修正用のMongoDBクエリ例:');
            console.log(`
db.documents.updateMany(
  { 
    $or: [
      { receiptType: 'parking' },
      { vendor_name: { $regex: /タイムズ|パーキング/i } }
    ]
  },
  [
    {
      $set: {
        receipt_type: { $ifNull: ['$receiptType', '$receipt_type'] },
        facility_name: { $ifNull: ['$facilityName', '$facility_name'] },
        entry_time: { $ifNull: ['$entryTime', '$entry_time'] },
        exit_time: { $ifNull: ['$exitTime', '$exit_time'] },
        parking_duration: { $ifNull: ['$parkingDuration', '$parking_duration'] },
        base_fee: { $ifNull: ['$baseFee', '$base_fee'] },
        additional_fee: { $ifNull: ['$additionalFee', '$additional_fee'] }
      }
    }
  ]
);
      `);
        }
    }
    catch (error) {
        console.error('❌ エラー:', error);
        logger_1.logger.error('Debug script error:', error);
    }
    finally {
        await client.close();
        console.log('\n✅ MongoDB接続を閉じました');
    }
}
// コマンドライン引数の処理
const args = process.argv.slice(2);
const documentId = args[0];
if (documentId) {
    console.log(`🔍 特定の文書をデバッグ: ${documentId}`);
}
else {
    console.log('🔍 すべての駐車場関連文書をデバッグ');
}
// スクリプトの実行
debugParkingDataFlow(documentId)
    .then(() => {
    console.log('\n✅ デバッグ完了');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ スクリプトエラー:', error);
    process.exit(1);
});
