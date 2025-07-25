"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://effectmoe:Dhfgmtekd77@cluster0.h1e6k.mongodb.net/accounting-automation?retryWrites=true&w=majority&appName=Cluster0';
async function GET() {
    let client = null;
    try {
        console.log('FAQ test API called');
        // 環境変数チェック
        const envCheck = {
            MONGODB_URI: !!process.env.MONGODB_URI,
            MONGODB_URI_fallback: !!MONGODB_URI,
            NODE_ENV: process.env.NODE_ENV,
        };
        console.log('Environment check:', envCheck);
        if (!MONGODB_URI) {
            return server_1.NextResponse.json({
                success: false,
                error: 'MONGODB_URI is not configured',
                envCheck
            }, { status: 500 });
        }
        console.log('Attempting MongoDB connection...');
        // MongoDB接続
        client = new mongodb_1.MongoClient(MONGODB_URI);
        await client.connect();
        console.log('MongoDB connected successfully');
        const db = client.db('accounting-automation');
        console.log('Database selected: accounting-automation');
        const faqCollection = db.collection('faq');
        console.log('FAQ collection selected');
        // コレクション情報の取得
        const collectionStats = await db.collection('faq').stats().catch(() => null);
        const documentCount = await faqCollection.countDocuments();
        const sampleDocument = await faqCollection.findOne({}, { limit: 1 });
        console.log('Collection stats:', { documentCount, sampleDocument: !!sampleDocument });
        return server_1.NextResponse.json({
            success: true,
            message: 'MongoDB FAQ collection test successful',
            envCheck,
            database: {
                connected: true,
                databaseName: 'accounting-automation',
                collectionName: 'faq',
                documentCount,
                hasSampleDocument: !!sampleDocument,
                collectionStats: collectionStats ? {
                    size: collectionStats.size,
                    storageSize: collectionStats.storageSize,
                    avgObjSize: collectionStats.avgObjSize
                } : null
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('FAQ test error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
    finally {
        if (client) {
            try {
                await client.close();
                console.log('MongoDB connection closed');
            }
            catch (closeError) {
                console.error('Error closing MongoDB connection:', closeError);
            }
        }
    }
}
async function POST(request) {
    let client = null;
    try {
        console.log('FAQ test POST API called');
        const { testData } = await request.json();
        if (!MONGODB_URI) {
            return server_1.NextResponse.json({
                success: false,
                error: 'MONGODB_URI is not configured'
            }, { status: 500 });
        }
        // MongoDB接続
        client = new mongodb_1.MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('accounting-automation');
        const faqCollection = db.collection('faq');
        // テストデータの挿入
        const testEntry = {
            question: testData?.question || 'Test question',
            answer: testData?.answer || 'Test answer',
            sessionId: 'test_session_' + Date.now(),
            createdAt: new Date(),
            savedAt: new Date(),
            category: 'test',
            status: 'test',
            tags: ['test', 'api-test']
        };
        const insertResult = await faqCollection.insertOne(testEntry);
        console.log('Test document inserted:', insertResult.insertedId);
        // 挿入したドキュメントを確認
        const retrievedDoc = await faqCollection.findOne({ _id: insertResult.insertedId });
        // テストデータを削除
        await faqCollection.deleteOne({ _id: insertResult.insertedId });
        console.log('Test document deleted');
        return server_1.NextResponse.json({
            success: true,
            message: 'Insert and delete test completed successfully',
            testResult: {
                inserted: !!insertResult.insertedId,
                retrieved: !!retrievedDoc,
                deleted: true,
                insertedId: insertResult.insertedId
            }
        });
    }
    catch (error) {
        console.error('FAQ test POST error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }, { status: 500 });
    }
    finally {
        if (client) {
            try {
                await client.close();
            }
            catch (closeError) {
                console.error('Error closing MongoDB connection:', closeError);
            }
        }
    }
}
