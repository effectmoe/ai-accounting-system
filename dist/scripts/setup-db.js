#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const db_setup_1 = require("../src/lib/db-setup");
const mongodb_client_1 = require("../src/lib/mongodb-client");
// .env.localファイルを読み込む
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), '.env.local') });
async function main() {
    console.log('🚀 Starting database setup...\n');
    try {
        // 1. 接続確認
        console.log('1️⃣ Checking MongoDB connection...');
        const isConnected = await (0, mongodb_client_1.checkConnection)();
        if (!isConnected) {
            throw new Error('Failed to connect to MongoDB. Please check your MONGODB_URI environment variable.');
        }
        console.log('✅ MongoDB connection successful!\n');
        // 2. コレクションとインデックスの初期化
        console.log('2️⃣ Initializing collections and indexes...');
        await (0, db_setup_1.initializeDatabase)();
        console.log('✅ Collections and indexes initialized!\n');
        // 3. バリデーションルールの設定（オプショナル）
        console.log('3️⃣ Setting up validation rules...');
        try {
            await (0, db_setup_1.setupValidationRules)();
            console.log('✅ Validation rules set up!\n');
        }
        catch (error) {
            console.log('⚠️  Validation rules setup skipped (optional feature)\n');
        }
        // 4. サンプルデータの作成（確認を求める）
        if (process.argv.includes('--sample-data')) {
            console.log('4️⃣ Creating sample data...');
            await (0, db_setup_1.createSampleData)();
            console.log('✅ Sample data created!\n');
        }
        else {
            console.log('4️⃣ Skipping sample data creation (use --sample-data flag to create)\n');
        }
        console.log('🎉 Database setup completed successfully!');
        console.log('\nYou can now start using the following collections:');
        console.log('  - customers: 顧客管理');
        console.log('  - companyInfo: 自社情報');
        console.log('  - bankAccounts: 銀行口座');
        console.log('  - invoices: 請求書');
    }
    catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
    // 接続を閉じる
    process.exit(0);
}
// スクリプトを実行
main();
