#!/usr/bin/env tsx
"use strict";
/*
 * 仕訳伝票作成プロセスにおけるフィールド処理の比較スクリプト
 * documentsコレクションとjournalsコレクションの関係を包括的に調査します
 */
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
const mongodb_1 = require("mongodb");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env.local' });
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'accounting_system';
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined');
    process.exit(1);
}
// フィールドマッピングの定義
const fieldMappings = [
    // 通常フィールド
    { receiptField: 'totalAmount', journalField: 'amount', category: 'regular', description: '金額' },
    { receiptField: 'issueDate', journalField: 'date', category: 'regular', description: '日付' },
    { receiptField: 'vendorName', journalField: 'vendorName', category: 'regular', description: 'ベンダー名' },
    { receiptField: 'customerName', journalField: 'customerName', category: 'regular', description: '顧客名' },
    { receiptField: 'description', journalField: 'description', category: 'regular', description: '説明' },
    // 駐車場フィールド
    { receiptField: 'receipt_type', journalField: 'receipt_type', category: 'parking', description: '領収書タイプ' },
    { receiptField: 'receiptType', journalField: 'receiptType', category: 'parking', description: '領収書タイプ(キャメルケース)' },
    { receiptField: 'facility_name', journalField: 'facility_name', category: 'parking', description: '施設名' },
    { receiptField: 'facilityName', journalField: 'facilityName', category: 'parking', description: '施設名(キャメルケース)' },
    { receiptField: 'entry_time', journalField: 'entry_time', category: 'parking', description: '入場時刻' },
    { receiptField: 'entryTime', journalField: 'entryTime', category: 'parking', description: '入場時刻(キャメルケース)' },
    { receiptField: 'exit_time', journalField: 'exit_time', category: 'parking', description: '退場時刻' },
    { receiptField: 'exitTime', journalField: 'exitTime', category: 'parking', description: '退場時刻(キャメルケース)' },
    { receiptField: 'parking_duration', journalField: 'parking_duration', category: 'parking', description: '駐車時間' },
    { receiptField: 'parkingDuration', journalField: 'parkingDuration', category: 'parking', description: '駐車時間(キャメルケース)' },
    { receiptField: 'base_fee', journalField: 'base_fee', category: 'parking', description: '基本料金' },
    { receiptField: 'baseFee', journalField: 'baseFee', category: 'parking', description: '基本料金(キャメルケース)' },
    { receiptField: 'additional_fee', journalField: 'additional_fee', category: 'parking', description: '追加料金' },
    { receiptField: 'additionalFee', journalField: 'additionalFee', category: 'parking', description: '追加料金(キャメルケース)' },
];
async function compareJournalFields() {
    const client = new mongodb_1.MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('✅ MongoDB接続成功\n');
        const db = client.db(MONGODB_DB);
        // コレクションの存在確認
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('=== 1. 利用可能なコレクション ===');
        console.log(collectionNames.join(', '));
        // journalsコレクションが存在する場合
        if (collectionNames.includes('journals') || collectionNames.includes('journalEntries')) {
            await analyzeJournalCollection(db);
        }
        else {
            console.log('\n⚠️  journalsコレクションが存在しません。');
            console.log('仕訳伝票の作成プロセスをシミュレートします。\n');
            await simulateJournalCreation(db);
        }
    }
    catch (error) {
        console.error('❌ エラー:', error);
    }
    finally {
        await client.close();
        console.log('\n✅ MongoDB接続を閉じました');
    }
}
async function analyzeJournalCollection(db) {
    const journalCollectionName = (await db.listCollections({ name: 'journals' }).hasNext()) ? 'journals' : 'journalEntries';
    const journals = db.collection(journalCollectionName);
    const documents = db.collection('documents');
    console.log(`\n=== 2. ${journalCollectionName}コレクションの分析 ===`);
    // サンプル仕訳伝票を取得
    const sampleJournal = await journals.findOne({ sourceDocumentId: { $exists: true } });
    if (!sampleJournal) {
        console.log('sourceDocumentIdを持つ仕訳伝票が見つかりません。');
        return;
    }
    console.log(`\n仕訳伝票ID: ${sampleJournal._id}`);
    console.log(`仕訳番号: ${sampleJournal.journalNumber || sampleJournal.documentNumber}`);
    console.log(`sourceDocumentId: ${sampleJournal.sourceDocumentId}`);
    // 元の領収書を取得
    const sourceReceipt = await documents.findOne({
        _id: sampleJournal.sourceDocumentId
    });
    if (!sourceReceipt) {
        console.log('元の領収書が見つかりません。');
        return;
    }
    console.log(`\n元の領収書ID: ${sourceReceipt._id}`);
    console.log(`領収書番号: ${sourceReceipt.documentNumber}`);
    // フィールド比較
    console.log('\n=== 3. フィールド比較結果 ===');
    analyzeFieldMapping(sourceReceipt, sampleJournal);
}
async function simulateJournalCreation(db) {
    const documents = db.collection('documents');
    // 駐車場領収書を取得
    const parkingReceipt = await documents.findOne({
        vendorName: /タイムズ/
    });
    if (!parkingReceipt) {
        console.log('駐車場領収書が見つかりません。');
        return;
    }
    console.log('=== 2. 仕訳伝票作成シミュレーション ===');
    console.log(`\n使用する領収書: ${parkingReceipt.documentNumber}`);
    console.log(`ベンダー: ${parkingReceipt.vendorName}`);
    console.log(`金額: ${parkingReceipt.totalAmount}`);
    // 仮想的な仕訳伝票を作成
    const simulatedJournal = {
        _id: new mongodb_1.ObjectId(),
        documentNumber: 'J202500004',
        documentType: 'journal_entry',
        sourceDocumentId: parkingReceipt._id,
        // 通常フィールド（通常はコピーされる）
        amount: parkingReceipt.totalAmount,
        date: parkingReceipt.issueDate || parkingReceipt.date,
        vendorName: parkingReceipt.vendorName,
        description: `${parkingReceipt.vendorName} - 領収書`,
        // 駐車場フィールド（問題: コピーされない可能性）
        // これらのフィールドは手動で追加する必要がある
    };
    console.log('\n=== 3. フィールドマッピング分析 ===');
    analyzeFieldMapping(parkingReceipt, simulatedJournal);
    // OCRデータも確認
    if (parkingReceipt.ocrResultId) {
        console.log('\n=== 4. OCRデータの確認 ===');
        const ocrResults = db.collection('ocrResults');
        const ocrData = await ocrResults.findOne({ _id: parkingReceipt.ocrResultId });
        if (ocrData && ocrData.extractedData) {
            console.log('\nOCRから抽出された駐車場情報:');
            const parkingInfo = ocrData.extractedData;
            console.log(`- 施設名: ${parkingInfo.facilityName || parkingInfo.facility_name || '未抽出'}`);
            console.log(`- 入場時刻: ${parkingInfo.entryTime || parkingInfo.entry_time || '未抽出'}`);
            console.log(`- 退場時刻: ${parkingInfo.exitTime || parkingInfo.exit_time || '未抽出'}`);
            console.log(`- 駐車時間: ${parkingInfo.parkingDuration || parkingInfo.parking_duration || '未抽出'}`);
        }
    }
}
function analyzeFieldMapping(receipt, journal) {
    const results = {
        regular: { copied: 0, notCopied: 0 },
        parking: { copied: 0, notCopied: 0 }
    };
    console.log('\n📋 通常フィールド:');
    console.log('-'.repeat(80));
    fieldMappings.filter(m => m.category === 'regular').forEach(mapping => {
        const receiptValue = receipt[mapping.receiptField];
        const journalValue = journal[mapping.journalField];
        const isCopied = receiptValue !== undefined && journalValue !== undefined;
        if (isCopied) {
            results.regular.copied++;
            console.log(`✅ ${mapping.description}: ${receiptValue} → ${journalValue}`);
        }
        else if (receiptValue !== undefined) {
            results.regular.notCopied++;
            console.log(`❌ ${mapping.description}: ${receiptValue} → (未コピー)`);
        }
    });
    console.log('\n🚗 駐車場フィールド:');
    console.log('-'.repeat(80));
    fieldMappings.filter(m => m.category === 'parking').forEach(mapping => {
        const receiptValue = receipt[mapping.receiptField];
        const journalValue = journal[mapping.journalField];
        const isCopied = receiptValue !== undefined && journalValue !== undefined;
        if (isCopied) {
            results.parking.copied++;
            console.log(`✅ ${mapping.description}: ${receiptValue} → ${journalValue}`);
        }
        else if (receiptValue !== undefined) {
            results.parking.notCopied++;
            console.log(`❌ ${mapping.description}: ${receiptValue} → (未コピー)`);
        }
    });
    console.log('\n=== 統計サマリー ===');
    console.log(`通常フィールド: ${results.regular.copied}個コピー済み, ${results.regular.notCopied}個未コピー`);
    console.log(`駐車場フィールド: ${results.parking.copied}個コピー済み, ${results.parking.notCopied}個未コピー`);
    if (results.parking.notCopied > 0) {
        console.log('\n❗ 問題分析:');
        console.log('駐車場フィールドが仕訳伝票にコピーされていません。');
        console.log('これは仕訳伝票作成時に駐車場固有のフィールドが無視されている可能性を示しています。');
        console.log('\n推奨される修正:');
        console.log('1. 仕訳伝票作成APIで駐車場フィールドを明示的にコピーする');
        console.log('2. フィールドマッピングロジックに駐車場フィールドを追加する');
        console.log('3. OCRデータから直接駐車場情報を取得して仕訳伝票に含める');
    }
}
// スクリプトを実行
compareJournalFields().catch(console.error);
