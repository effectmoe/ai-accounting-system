"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.getDatabase = getDatabase;
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error('Please add your MongoDB URI to .env.local');
}
let client = null;
let clientPromise = null;
async function connectToDatabase() {
    if (!clientPromise) {
        clientPromise = mongodb_1.MongoClient.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
        });
    }
    try {
        client = await clientPromise;
        const db = client.db('accounting');
        return { client, db };
    }
    catch (error) {
        logger_1.logger.error('MongoDB connection error:', error);
        clientPromise = null;
        throw error;
    }
}
async function getDatabase() {
    const { db } = await connectToDatabase();
    return db;
}
