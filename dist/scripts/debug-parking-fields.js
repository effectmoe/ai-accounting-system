"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_client_1 = require("../lib/mongodb-client");
async function debugParkingFields() {
    console.log('=== Parking Fields Debug Script ===\n');
    try {
        const db = mongodb_client_1.DatabaseService.getInstance();
        // 1. 最新のOCR結果から駐車場データを探す
        console.log('1. Checking recent OCR results for parking data...');
        const ocrResults = await db.find(mongodb_client_1.Collections.OCR_RESULTS, {
            receiptType: 'parking'
        }, {
            limit: 5,
            sort: { createdAt: -1 }
        });
        console.log(`Found ${ocrResults.length} parking OCR results`);
        if (ocrResults.length > 0) {
            console.log('\nSample parking OCR result:');
            const sample = ocrResults[0];
            console.log({
                id: sample._id,
                receiptType: sample.receiptType,
                facilityName: sample.facilityName,
                entryTime: sample.entryTime,
                exitTime: sample.exitTime,
                parkingDuration: sample.parkingDuration,
                linkedDocumentId: sample.linkedDocumentId,
                createdAt: sample.createdAt
            });
        }
        // 2. 最新の文書から駐車場データを探す
        console.log('\n2. Checking recent documents for parking data...');
        const documents = await db.find(mongodb_client_1.Collections.DOCUMENTS, {
            $or: [
                { receipt_type: 'parking' },
                { receiptType: 'parking' }
            ]
        }, {
            limit: 5,
            sort: { createdAt: -1 }
        });
        console.log(`Found ${documents.length} parking documents`);
        if (documents.length > 0) {
            console.log('\nSample parking document:');
            const sample = documents[0];
            console.log({
                id: sample._id,
                receipt_type: sample.receipt_type,
                receiptType: sample.receiptType,
                facility_name: sample.facility_name,
                facilityName: sample.facilityName,
                entry_time: sample.entry_time,
                entryTime: sample.entryTime,
                exit_time: sample.exit_time,
                exitTime: sample.exitTime,
                parking_duration: sample.parking_duration,
                parkingDuration: sample.parkingDuration,
                createdAt: sample.createdAt
            });
            console.log('\nAll fields in document:');
            console.log(Object.keys(sample).filter(key => key.includes('parking') ||
                key.includes('facility') ||
                key.includes('entry') ||
                key.includes('exit') ||
                key.includes('receipt_type') ||
                key.includes('receiptType')));
        }
        // 3. 特定のIDで文書を検索（もしIDがあれば）
        const testId = process.argv[2];
        if (testId) {
            console.log(`\n3. Checking specific document ID: ${testId}`);
            try {
                const doc = await db.findById(mongodb_client_1.Collections.DOCUMENTS, testId);
                if (doc) {
                    console.log('\nDocument found:');
                    console.log({
                        id: doc._id,
                        documentType: doc.documentType,
                        receipt_type: doc.receipt_type,
                        facility_name: doc.facility_name,
                        entry_time: doc.entry_time,
                        exit_time: doc.exit_time,
                        parking_duration: doc.parking_duration
                    });
                }
                else {
                    console.log('Document not found');
                }
            }
            catch (error) {
                console.log('Error finding document:', error.message);
            }
        }
        // 4. 最新の一般的な文書をチェック（駐車場フィールドが含まれているか）
        console.log('\n4. Checking if regular documents have parking fields...');
        const recentDocs = await db.find(mongodb_client_1.Collections.DOCUMENTS, {}, {
            limit: 3,
            sort: { createdAt: -1 }
        });
        recentDocs.forEach((doc, index) => {
            console.log(`\nDocument ${index + 1}:`);
            console.log({
                id: doc._id,
                documentType: doc.documentType,
                hasParkingFields: !!(doc.receipt_type || doc.facility_name || doc.entry_time),
                receipt_type: doc.receipt_type || 'not set',
                facility_name: doc.facility_name || 'not set'
            });
        });
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        process.exit(0);
    }
}
debugParkingFields();
