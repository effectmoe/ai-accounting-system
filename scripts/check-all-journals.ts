#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function checkAllJournals() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Check all journals
    console.log(`\nLooking for all journal entries in database: ${DB_NAME}`);
    
    // Try journals collection first
    let journals = await db.collection('journals').find({}).limit(10).toArray();
    let collectionName = 'journals';
    
    if (journals.length === 0) {
      journals = await db.collection('journalEntries').find({}).limit(10).toArray();
      collectionName = 'journalEntries';
    }
    
    console.log(`\nFound ${journals.length} journal entries in '${collectionName}' collection (showing max 10)`);
    
    if (journals.length === 0) {
      console.log('No journal entries found in the database');
      
      // Check if the collection exists
      const collections = await db.listCollections().toArray();
      console.log('\nExisting collections:');
      collections.forEach(col => console.log(`- ${col.name}`));
    } else {
      journals.forEach((journal, index) => {
        console.log(`\n--- Journal ${index + 1} ---`);
        console.log(JSON.stringify({
          _id: journal._id,
          journalNumber: journal.journalNumber,
          documentNumber: journal.documentNumber,
          documentType: journal.documentType,
          entryDate: journal.entryDate,
          description: journal.description,
          status: journal.status,
          sourceType: journal.sourceType,
          sourceDocumentId: journal.sourceDocumentId,
          lines: journal.lines?.length || 0,
          createdAt: journal.createdAt
        }, null, 2));
      });
      
      // Look for the specific journal number
      console.log('\n\nSearching for journal number J202500004...');
      const specificJournal = await db.collection(collectionName).findOne({
        $or: [
          { journalNumber: 'J202500004' },
          { documentNumber: 'J202500004' }
        ]
      });
      
      if (specificJournal) {
        console.log('\nFound journal J202500004:');
        console.log(JSON.stringify(specificJournal, null, 2));
      } else {
        console.log('\nJournal J202500004 not found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
checkAllJournals().catch(console.error);