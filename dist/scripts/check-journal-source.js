#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting';
if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in environment variables');
    process.exit(1);
}
async function checkJournalSource() {
    const client = new mongodb_1.MongoClient(MONGODB_URI);
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected successfully to MongoDB');
        const db = client.db(DB_NAME);
        // 1. Find the journal document
        const journalId = '6880d62e851fb32caa16ff58';
        const journalNumber = 'J202500004';
        console.log(`\n1. Looking for journal with ID: ${journalId} and number: ${journalNumber}`);
        // Try both collection names
        let journalEntry = await db.collection('journals').findOne({
            _id: new mongodb_1.ObjectId(journalId)
        });
        if (!journalEntry) {
            journalEntry = await db.collection('journalEntries').findOne({
                _id: new mongodb_1.ObjectId(journalId)
            });
        }
        if (!journalEntry) {
            console.error('Journal entry not found!');
            return;
        }
        console.log('\nFound journal entry:');
        console.log(JSON.stringify({
            _id: journalEntry._id,
            journalNumber: journalEntry.journalNumber,
            entryDate: journalEntry.entryDate,
            description: journalEntry.description,
            status: journalEntry.status,
            sourceType: journalEntry.sourceType,
            sourceDocumentId: journalEntry.sourceDocumentId,
            lines: journalEntry.lines?.length || 0,
            createdAt: journalEntry.createdAt
        }, null, 2));
        // 2. Check if it has sourceDocumentId
        if (journalEntry.sourceDocumentId) {
            console.log(`\n2. Journal has sourceDocumentId: ${journalEntry.sourceDocumentId}`);
            console.log('Looking for related source document...');
            // Check in documents collection
            const sourceDoc = await db.collection('documents').findOne({
                _id: new mongodb_1.ObjectId(journalEntry.sourceDocumentId)
            });
            if (sourceDoc) {
                console.log('\nFound source document in documents collection:');
                console.log(JSON.stringify({
                    _id: sourceDoc._id,
                    documentNumber: sourceDoc.documentNumber,
                    documentType: sourceDoc.documentType,
                    issueDate: sourceDoc.issueDate,
                    customerName: sourceDoc.customerName,
                    totalAmount: sourceDoc.totalAmount,
                    status: sourceDoc.status,
                    ocrResultId: sourceDoc.ocrResultId
                }, null, 2));
            }
            else {
                console.log('Source document not found in documents collection');
                // Try to find in OCR results
                const ocrResult = await db.collection('ocr_results').findOne({
                    _id: new mongodb_1.ObjectId(journalEntry.sourceDocumentId)
                });
                if (ocrResult) {
                    console.log('\nFound source in ocr_results collection:');
                    console.log(JSON.stringify({
                        _id: ocrResult._id,
                        file_name: ocrResult.file_name,
                        document_type: ocrResult.document_type,
                        processed_date: ocrResult.processed_date,
                        status: ocrResult.status,
                        extracted_data: ocrResult.extracted_data ? {
                            date: ocrResult.extracted_data.date,
                            vendor: ocrResult.extracted_data.vendor,
                            total: ocrResult.extracted_data.total
                        } : null
                    }, null, 2));
                }
            }
        }
        else {
            console.log('\n2. Journal does NOT have sourceDocumentId field');
            console.log('Searching for original receipt by date and amount...');
            // Extract date and amount from journal
            const journalDate = journalEntry.entryDate;
            const totalAmount = journalEntry.lines?.reduce((sum, line) => sum + (line.debitAmount || 0), 0) || 0;
            console.log(`\nSearching with:`);
            console.log(`- Date: ${journalDate}`);
            console.log(`- Amount: ${totalAmount}`);
            // Search in documents collection
            const dateStart = new Date(journalDate);
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(journalDate);
            dateEnd.setHours(23, 59, 59, 999);
            const matchingDocs = await db.collection('documents').find({
                issueDate: {
                    $gte: dateStart,
                    $lte: dateEnd
                },
                totalAmount: totalAmount,
                documentType: { $in: ['receipt', 'invoice', 'purchase_order'] }
            }).toArray();
            if (matchingDocs.length > 0) {
                console.log(`\nFound ${matchingDocs.length} matching documents:`);
                matchingDocs.forEach((doc, index) => {
                    console.log(`\nDocument ${index + 1}:`);
                    console.log(JSON.stringify({
                        _id: doc._id,
                        documentNumber: doc.documentNumber,
                        documentType: doc.documentType,
                        issueDate: doc.issueDate,
                        customerName: doc.customerName,
                        totalAmount: doc.totalAmount,
                        status: doc.status,
                        ocrResultId: doc.ocrResultId
                    }, null, 2));
                });
            }
            else {
                console.log('\nNo matching documents found');
                // Also search in OCR results
                console.log('\nSearching in OCR results...');
                const ocrResults = await db.collection('ocr_results').find({
                    'extracted_data.date': {
                        $regex: journalDate.toISOString().split('T')[0]
                    },
                    'extracted_data.total': totalAmount
                }).toArray();
                if (ocrResults.length > 0) {
                    console.log(`\nFound ${ocrResults.length} matching OCR results:`);
                    ocrResults.forEach((ocr, index) => {
                        console.log(`\nOCR Result ${index + 1}:`);
                        console.log(JSON.stringify({
                            _id: ocr._id,
                            file_name: ocr.file_name,
                            document_type: ocr.document_type,
                            processed_date: ocr.processed_date,
                            extracted_data: {
                                date: ocr.extracted_data?.date,
                                vendor: ocr.extracted_data?.vendor,
                                total: ocr.extracted_data?.total
                            }
                        }, null, 2));
                    });
                }
                else {
                    console.log('\nNo matching OCR results found');
                }
            }
        }
        // 3. Suggest adding sourceDocumentId if missing
        if (!journalEntry.sourceDocumentId && journalEntry.sourceType === 'ocr') {
            console.log('\n\n=== RECOMMENDATION ===');
            console.log('This journal entry was created from OCR but lacks sourceDocumentId.');
            console.log('Consider updating the journal entry to include the sourceDocumentId');
            console.log('to maintain proper linkage between the journal and source document.');
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}
// Run the script
checkJournalSource().catch(console.error);
