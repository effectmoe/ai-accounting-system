#!/usr/bin/env tsx
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
const mongodb_client_1 = require("../src/lib/mongodb-client");
// .env.localファイルを読み込む
(0, dotenv_1.config)({ path: path_1.default.join(process.cwd(), '.env.local') });
async function checkDocuments() {
    console.log('🔍 Checking MongoDB documents collection...\n');
    try {
        // ドキュメントの総数を確認
        const totalCount = await mongodb_client_1.db.count('documents', {});
        console.log(`📊 Total documents in collection: ${totalCount}\n`);
        // 最新の5件を取得
        const recentDocs = await mongodb_client_1.db.find('documents', {}, {
            limit: 5,
            sort: { createdAt: -1 }
        });
        if (recentDocs.length > 0) {
            console.log('📄 Recent documents:');
            recentDocs.forEach((doc, index) => {
                console.log(`\n${index + 1}. Document ID: ${doc._id}`);
                console.log(`   File Name: ${doc.fileName}`);
                console.log(`   Vendor: ${doc.vendorName}`);
                console.log(`   Total Amount: ¥${doc.totalAmount}`);
                console.log(`   Created: ${doc.createdAt}`);
                console.log(`   OCR Status: ${doc.ocrStatus}`);
                console.log(`   GridFS File ID: ${doc.gridfsFileId}`);
            });
        }
        else {
            console.log('❌ No documents found in the collection');
        }
        // OCR結果の数を確認
        const ocrResultCount = await mongodb_client_1.db.count('ocrResults', {});
        console.log(`\n📊 Total OCR results: ${ocrResultCount}`);
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        // MongoDB接続を閉じる
        const { MongoClient } = await Promise.resolve().then(() => __importStar(require('mongodb')));
        await MongoClient.prototype.close.call(global._mongoClientPromise);
        process.exit(0);
    }
}
checkDocuments().catch(console.error);
