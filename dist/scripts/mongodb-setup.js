#!/usr/bin/env tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const mongodb_schemas_1 = require("../src/models/mongodb-schemas");
const dotenv_1 = __importDefault(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
// 環境変数の読み込み
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env.local') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting';
async function setupMongoDB() {
    console.log(chalk_1.default.blue('\n🚀 MongoDB セットアップを開始します\n'));
    const client = new mongodb_1.MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log(chalk_1.default.green('✓ MongoDBに接続しました'));
        const db = client.db('accounting');
        // コレクションの作成
        console.log(chalk_1.default.yellow('\n📁 コレクションを作成しています...'));
        for (const collectionName of Object.values(mongodb_schemas_1.Collections)) {
            try {
                await db.createCollection(collectionName);
                console.log(chalk_1.default.green(`  ✓ ${collectionName}`));
            }
            catch (error) {
                if (error.codeName === 'NamespaceExists') {
                    console.log(chalk_1.default.gray(`  - ${collectionName} (既存)`));
                }
                else {
                    throw error;
                }
            }
        }
        // インデックスの作成
        console.log(chalk_1.default.yellow('\n🔍 インデックスを作成しています...'));
        for (const [collectionName, indexSpecs] of Object.entries(mongodb_schemas_1.indexes)) {
            const collection = db.collection(collectionName);
            for (const indexSpec of indexSpecs) {
                try {
                    const indexName = await collection.createIndex(indexSpec);
                    console.log(chalk_1.default.green(`  ✓ ${collectionName}: ${indexName}`));
                }
                catch (error) {
                    console.log(chalk_1.default.red(`  ✗ ${collectionName}: ${JSON.stringify(indexSpec)}`));
                    console.error(error);
                }
            }
        }
        // テキストインデックスの作成
        console.log(chalk_1.default.yellow('\n📝 テキスト検索インデックスを作成しています...'));
        for (const [collectionName, textIndexSpec] of Object.entries(mongodb_schemas_1.textIndexes)) {
            const collection = db.collection(collectionName);
            try {
                const indexName = await collection.createIndex(textIndexSpec);
                console.log(chalk_1.default.green(`  ✓ ${collectionName}: ${indexName}`));
            }
            catch (error) {
                if (error.codeName === 'IndexOptionsConflict') {
                    console.log(chalk_1.default.gray(`  - ${collectionName} (既存のテキストインデックス)`));
                }
                else {
                    console.log(chalk_1.default.red(`  ✗ ${collectionName}: テキストインデックス`));
                    console.error(error);
                }
            }
        }
        // タイムスタンプ用のインデックス
        console.log(chalk_1.default.yellow('\n⏰ タイムスタンプインデックスを作成しています...'));
        for (const collectionName of Object.values(mongodb_schemas_1.Collections)) {
            const collection = db.collection(collectionName);
            try {
                await collection.createIndex({ createdAt: -1 });
                await collection.createIndex({ updatedAt: -1 });
                console.log(chalk_1.default.green(`  ✓ ${collectionName}: createdAt, updatedAt`));
            }
            catch (error) {
                console.log(chalk_1.default.red(`  ✗ ${collectionName}: タイムスタンプインデックス`));
            }
        }
        // 接続テスト
        console.log(chalk_1.default.yellow('\n🧪 接続テストを実行しています...'));
        const adminDb = client.db('admin');
        const pingResult = await adminDb.command({ ping: 1 });
        if (pingResult.ok === 1) {
            console.log(chalk_1.default.green('✓ MongoDB接続テスト成功'));
        }
        else {
            console.log(chalk_1.default.red('✗ MongoDB接続テスト失敗'));
        }
        // データベース情報の表示
        console.log(chalk_1.default.yellow('\n📊 データベース情報:'));
        const dbStats = await db.stats();
        console.log(`  データベース名: ${dbStats.db}`);
        console.log(`  コレクション数: ${dbStats.collections}`);
        console.log(`  インデックス数: ${dbStats.indexes}`);
        console.log(`  データサイズ: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(chalk_1.default.green('\n✅ MongoDBセットアップが完了しました！\n'));
    }
    catch (error) {
        console.error(chalk_1.default.red('\n❌ エラーが発生しました:'), error);
        process.exit(1);
    }
    finally {
        await client.close();
    }
}
// Supabaseからのデータ移行（オプション）
async function migrateFromSupabase() {
    console.log(chalk_1.default.blue('\n🔄 Supabaseからのデータ移行\n'));
    // ここにSupabaseからのデータ移行ロジックを実装
    // 1. Supabaseからデータを取得
    // 2. データ形式を変換
    // 3. MongoDBに挿入
    console.log(chalk_1.default.yellow('⚠️  データ移行は手動で実装する必要があります'));
}
// メイン実行
async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
使用方法:
  npm run setup-mongodb          # MongoDBのセットアップ
  npm run setup-mongodb migrate  # Supabaseからの移行（未実装）

環境変数:
  MONGODB_URI  MongoDBの接続URI（デフォルト: mongodb://localhost:27017/accounting）
    `);
        return;
    }
    await setupMongoDB();
    if (args.includes('migrate')) {
        await migrateFromSupabase();
    }
}
main().catch((error) => {
    console.error(chalk_1.default.red('エラー:'), error);
    process.exit(1);
});
