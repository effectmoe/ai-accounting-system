#!/usr/bin/env tsx
"use strict";
/**
 * GridFSに保存されているファイルを確認するスクリプト
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
// 環境変数を読み込み
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env.local') });
async function checkGridFS() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error(chalk_1.default.red('MONGODB_URIが設定されていません'));
        return;
    }
    const client = new mongodb_1.MongoClient(uri);
    try {
        console.log(chalk_1.default.blue.bold('\n🗄️  GridFS ファイル確認\n'));
        await client.connect();
        console.log(chalk_1.default.green('✓ MongoDBに接続しました'));
        const db = client.db('accounting');
        // デフォルトのGridFSバケット（fs）
        console.log(chalk_1.default.yellow('\n📁 デフォルトGridFS (fs.*):'));
        const defaultBucket = new mongodb_1.GridFSBucket(db);
        const defaultFiles = await defaultBucket.find({}).toArray();
        if (defaultFiles.length === 0) {
            console.log(chalk_1.default.gray('  ファイルがありません'));
        }
        else {
            for (const file of defaultFiles) {
                console.log(chalk_1.default.cyan(`  - ${file.filename}`));
                console.log(chalk_1.default.gray(`    ID: ${file._id}`));
                console.log(chalk_1.default.gray(`    サイズ: ${(file.length / 1024).toFixed(2)} KB`));
                console.log(chalk_1.default.gray(`    アップロード日: ${file.uploadDate}`));
                console.log(chalk_1.default.gray(`    メタデータ: ${JSON.stringify(file.metadata || {})}`));
                console.log('');
            }
        }
        // documentsバケット
        console.log(chalk_1.default.yellow('\n📁 Documents GridFS (documents.*):'));
        const docsBucket = new mongodb_1.GridFSBucket(db, { bucketName: 'documents' });
        const docsFiles = await docsBucket.find({}).toArray();
        if (docsFiles.length === 0) {
            console.log(chalk_1.default.gray('  ファイルがありません'));
        }
        else {
            for (const file of docsFiles) {
                console.log(chalk_1.default.cyan(`  - ${file.filename}`));
                console.log(chalk_1.default.gray(`    ID: ${file._id}`));
                console.log(chalk_1.default.gray(`    サイズ: ${(file.length / 1024).toFixed(2)} KB`));
                console.log(chalk_1.default.gray(`    アップロード日: ${file.uploadDate}`));
                console.log(chalk_1.default.gray(`    メタデータ: ${JSON.stringify(file.metadata || {})}`));
                console.log('');
            }
        }
        // コレクション一覧
        console.log(chalk_1.default.yellow('\n📊 GridFS関連コレクション:'));
        const collections = await db.listCollections().toArray();
        const gridfsCollections = collections.filter(col => col.name.includes('.files') || col.name.includes('.chunks'));
        if (gridfsCollections.length > 0) {
            for (const col of gridfsCollections) {
                const count = await db.collection(col.name).countDocuments();
                console.log(chalk_1.default.gray(`  - ${col.name}: ${count} documents`));
            }
        }
        else {
            console.log(chalk_1.default.gray('  GridFSコレクションが見つかりません'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('エラー:'), error);
    }
    finally {
        await client.close();
    }
}
// ファイルをダウンロードする関数（オプション）
async function downloadFile(bucketName, filename) {
    const uri = process.env.MONGODB_URI;
    if (!uri)
        return;
    const client = new mongodb_1.MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('accounting');
        const bucket = new mongodb_1.GridFSBucket(db, { bucketName });
        const downloadStream = bucket.openDownloadStreamByName(filename);
        const chunks = [];
        downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
        });
        downloadStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            console.log(chalk_1.default.green(`✓ ファイルダウンロード完了: ${filename} (${buffer.length} bytes)`));
        });
        downloadStream.on('error', (error) => {
            console.error(chalk_1.default.red('ダウンロードエラー:'), error);
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('エラー:'), error);
    }
}
// メイン実行
checkGridFS().catch(console.error);
