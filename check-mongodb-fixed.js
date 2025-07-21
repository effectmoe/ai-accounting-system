const { MongoClient } = require('mongodb');
const fs = require('fs');

// Read .env.local directly
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
let mongoUri = null;

for (const line of lines) {
  if (line.startsWith('MONGODB_URI=')) {
    mongoUri = line.substring('MONGODB_URI='.length).replace(/["\\n]/g, '').trim();
    break;
  }
}

console.log('MongoDB URI found:', mongoUri ? 'Yes' : 'No');

async function checkMongoDB() {
  if (!mongoUri) {
    console.error('MONGODB_URI not found in .env.local');
    return;
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas successfully!\n');

    // List all databases
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name} (size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Check the accounting database
    const db = client.db('accounting');
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in accounting database:');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });

    // Check documents collection for latest data
    console.log('\n=== DOCUMENTS COLLECTION ===');
    const documentsCollection = db.collection('documents');
    
    // Count total documents
    const totalDocs = await documentsCollection.countDocuments();
    console.log(`Total documents: ${totalDocs}`);
    
    // Find documents from 2025-01-21 (not 2025-07-21 as that's in the future)
    const todayDocs = await documentsCollection.find({
      createdAt: { $gte: new Date('2025-01-21T00:00:00Z'), $lt: new Date('2025-01-22T00:00:00Z') }
    }).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log(`\nDocuments from 2025-01-21: ${todayDocs.length} found`);
    todayDocs.forEach(doc => {
      console.log(`- ID: ${doc._id}, Name: ${doc.documentName}, CreatedAt: ${doc.createdAt}`);
      if (doc.metadata) {
        console.log(`  Metadata: ${JSON.stringify(doc.metadata)}`);
      }
    });

    // Find the specific document ID
    const targetId = '687e3501d18421a3ce4e7f53';
    const specificDoc = await documentsCollection.findOne({ _id: targetId });
    if (specificDoc) {
      console.log(`\nFound document with ID ${targetId}:`);
      console.log(JSON.stringify(specificDoc, null, 2));
    } else {
      console.log(`\nDocument with ID ${targetId} NOT found in documents collection`);
    }

    // Check latest documents
    const latestDocs = await documentsCollection.find().sort({ createdAt: -1 }).limit(10).toArray();
    console.log('\nLatest 10 documents:');
    latestDocs.forEach(doc => {
      console.log(`- ID: ${doc._id}, Name: ${doc.documentName}, CreatedAt: ${doc.createdAt}`);
      if (doc.documentName && doc.documentName.includes('タイムズ24')) {
        console.log('  *** Contains タイムズ24 ***');
      }
    });

    // Check ocr_results collection
    console.log('\n=== OCR_RESULTS COLLECTION ===');
    const ocrCollection = db.collection('ocr_results');
    
    // Check if collection exists
    const ocrExists = collections.some(col => col.name === 'ocr_results');
    if (ocrExists) {
      const totalOcr = await ocrCollection.countDocuments();
      console.log(`Total OCR results: ${totalOcr}`);
      
      // Find OCR results from today
      const todayOcr = await ocrCollection.find({
        createdAt: { $gte: new Date('2025-01-21T00:00:00Z'), $lt: new Date('2025-01-22T00:00:00Z') }
      }).sort({ createdAt: -1 }).limit(5).toArray();
      
      console.log(`\nOCR results from 2025-01-21: ${todayOcr.length} found`);
      todayOcr.forEach(ocr => {
        console.log(`- ID: ${ocr._id}, DocumentId: ${ocr.documentId}, CreatedAt: ${ocr.createdAt}`);
      });

      // Find the specific OCR result
      const specificOcr = await ocrCollection.findOne({ documentId: targetId });
      if (specificOcr) {
        console.log(`\nFound OCR result for document ID ${targetId}:`);
        console.log(JSON.stringify(specificOcr, null, 2));
      } else {
        console.log(`\nNo OCR result found for document ID ${targetId}`);
      }

      // Check latest OCR results
      const latestOcr = await ocrCollection.find().sort({ createdAt: -1 }).limit(10).toArray();
      console.log('\nLatest 10 OCR results:');
      latestOcr.forEach(ocr => {
        console.log(`- ID: ${ocr._id}, DocumentId: ${ocr.documentId}, CreatedAt: ${ocr.createdAt}`);
        if (ocr.text && ocr.text.includes('タイムズ24')) {
          console.log('  *** Contains タイムズ24 in text ***');
        }
      });
    } else {
      console.log('\nocr_results collection does not exist');
    }

    // Search for Times 24 data in documents
    console.log('\n=== SEARCHING FOR TIMES 24 DATA ===');
    const times24Docs = await documentsCollection.find({
      $or: [
        { documentName: { $regex: /タイムズ24/i } },
        { 'metadata.originalFileName': { $regex: /タイムズ24/i } },
        { 'metadata.documentName': { $regex: /タイムズ24/i } }
      ]
    }).limit(10).toArray();
    
    console.log(`\nFound ${times24Docs.length} documents related to タイムズ24:`);
    times24Docs.forEach(doc => {
      console.log(`- ID: ${doc._id}, Name: ${doc.documentName}, Amount: ${doc.amount}, CreatedAt: ${doc.createdAt}`);
      if (doc.amount === 880) {
        console.log('  *** Amount matches 880 ***');
      }
    });

    // Also check accounting_system database if it exists
    const accountingSystemExists = dbs.databases.some(db => db.name === 'accounting_system');
    if (accountingSystemExists) {
      console.log('\n=== CHECKING ACCOUNTING_SYSTEM DATABASE ===');
      const db2 = client.db('accounting_system');
      const collections2 = await db2.listCollections().toArray();
      console.log('Collections in accounting_system database:');
      collections2.forEach(col => {
        console.log(`- ${col.name}`);
      });
    }

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkMongoDB();