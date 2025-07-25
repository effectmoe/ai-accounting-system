#!/usr/bin/env tsx
"use strict";
/*
 * 仕訳伝票と領収書の関係を分析するスクリプト
 * コレクション構造とフィールドマッピングを調査します
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
async function analyzeJournalReceiptRelationship() {
    const client = new mongodb_1.MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('✅ MongoDB接続成功\n');
        const db = client.db(MONGODB_DB);
        // 1. コレクションを確認
        console.log('=== 1. コレクション一覧 ===');
        const collections = await db.listCollections().toArray();
        console.log('利用可能なコレクション:');
        collections.forEach(col => {
            console.log(`- ${col.name}`);
        });
        // 2. documentsコレクションの内容を調査
        console.log('\n=== 2. documentsコレクションの調査 ===');
        const documents = db.collection('documents');
        // ドキュメントタイプの分布を確認
        const typeDistribution = await documents.aggregate([
            { $group: { _id: '$documentType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        console.log('\ndocumentTypeの分布:');
        typeDistribution.forEach(type => {
            console.log(`- ${type._id || '(null)'}: ${type.count}件`);
        });
        // 3. 仕訳伝票を検索
        console.log('\n=== 3. 仕訳伝票の検索 ===');
        // J202500004を様々な方法で検索
        const searchPatterns = [
            { documentNumber: 'J202500004' },
            { journalNumber: 'J202500004' },
            { documentType: 'journal_entry' },
            { documentType: 'journal' },
            { description: /駐車場/ },
            { vendorName: /タイムズ/ }
        ];
        for (const pattern of searchPatterns) {
            const result = await documents.findOne(pattern);
            if (result) {
                console.log(`\n✅ パターン ${JSON.stringify(pattern)} で見つかりました:`);
                console.log(`- _id: ${result._id}`);
                console.log(`- documentNumber: ${result.documentNumber}`);
                console.log(`- documentType: ${result.documentType}`);
                console.log(`- sourceDocumentId: ${result.sourceDocumentId}`);
                break;
            }
        }
        // 4. journalsコレクションをチェック
        const journalsCol = db.collection('journals');
        const journalExists = await db.listCollections({ name: 'journals' }).hasNext();
        if (journalExists) {
            console.log('\n=== 4. journalsコレクションの調査 ===');
            const sampleJournal = await journalsCol.findOne({});
            if (sampleJournal) {
                console.log('\nサンプル仕訳伝票:');
                console.log(JSON.stringify(sampleJournal, null, 2).substring(0, 500) + '...');
            }
            // J202500004を検索
            const targetJournal = await journalsCol.findOne({
                $or: [
                    { journalNumber: 'J202500004' },
                    { documentNumber: 'J202500004' }
                ]
            });
            if (targetJournal) {
                console.log('\n✅ J202500004が見つかりました:');
                console.log(`- _id: ${targetJournal._id}`);
                console.log(`- sourceDocumentId: ${targetJournal.sourceDocumentId}`);
            }
        }
        // 5. 駐車場領収書を検索
        console.log('\n=== 5. 駐車場領収書の検索 ===');
        const parkingReceipts = await documents.find({
            $or: [
                { receipt_type: 'parking' },
                { receiptType: 'parking' },
                { vendorName: /タイムズ/ },
                { facility_name: { $exists: true } },
                { facilityName: { $exists: true } }
            ]
        }).limit(3).toArray();
        console.log(`\n見つかった駐車場領収書: ${parkingReceipts.length}件`);
        parkingReceipts.forEach((receipt, index) => {
            console.log(`\n領収書 ${index + 1}:`);
            console.log(`- _id: ${receipt._id}`);
            console.log(`- documentNumber: ${receipt.documentNumber}`);
            console.log(`- vendorName: ${receipt.vendorName}`);
            console.log(`- receiptType: ${receipt.receipt_type || receipt.receiptType}`);
            console.log(`- facilityName: ${receipt.facility_name || receipt.facilityName}`);
            console.log(`- totalAmount: ${receipt.totalAmount}`);
            console.log(`- date: ${receipt.date || receipt.issueDate}`);
        });
        // 6. 関連付けを確認
        if (parkingReceipts.length > 0) {
            console.log('\n=== 6. 仕訳伝票との関連付け確認 ===');
            for (const receipt of parkingReceipts) {
                // この領収書から作成された仕訳伝票を検索
                const relatedJournal = await documents.findOne({
                    sourceDocumentId: receipt._id.toString()
                });
                if (relatedJournal) {
                    console.log(`\n✅ 領収書 ${receipt.documentNumber} から作成された仕訳伝票:`);
                    console.log(`- 仕訳番号: ${relatedJournal.documentNumber}`);
                    console.log(`- 駐車場フィールド:`, {
                        receipt_type: relatedJournal.receipt_type,
                        facility_name: relatedJournal.facility_name,
                        entry_time: relatedJournal.entry_time,
                        exit_time: relatedJournal.exit_time
                    });
                }
            }
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
// スクリプトを実行
analyzeJournalReceiptRelationship().catch(console.error);
