const { MongoClient } = require('mongodb');
const fs = require('fs');

// Read .env.local directly and extract MONGODB_URI
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
let mongoUri = null;

for (const line of lines) {
  if (line.startsWith('MONGODB_URI=')) {
    const rawValue = line.substring('MONGODB_URI='.length);
    mongoUri = rawValue.replace(/^["']|["']$/g, '').replace(/\\n/g, '').trim();
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
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('Connected successfully!\n');

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

    // Check documents collection
    console.log('\n=== DOCUMENTS COLLECTION ===');
    const documentsCollection = db.collection('documents');
    
    // Count total documents
    const totalDocs = await documentsCollection.countDocuments();
    console.log(`Total documents: ${totalDocs}`);
    
    // Find documents from today (2025-01-21)
    const todayDocs = await documentsCollection.find({
      createdAt: { $gte: new Date('2025-01-21T00:00:00Z'), $lt: new Date('2025-01-22T00:00:00Z') }
    }).sort({ createdAt: -1 }).toArray();
    
    console.log(`\nDocuments from 2025-01-21: ${todayDocs.length} found`);
    if (todayDocs.length > 0) {
      todayDocs.forEach(doc => {
        console.log(`\n- ID: ${doc._id}`);
        console.log(`  Name: ${doc.documentName}`);
        console.log(`  Amount: ${doc.amount}`);
        console.log(`  CreatedAt: ${doc.createdAt}`);
        if (doc.metadata) {
          console.log(`  Metadata:`, doc.metadata);
        }
      });
    }

    // Find the specific document ID
    const targetId = '687e3501d18421a3ce4e7f53';
    console.log(`\n=== SEARCHING FOR DOCUMENT ID: ${targetId} ===`);
    const specificDoc = await documentsCollection.findOne({ _id: targetId });
    if (specificDoc) {
      console.log('FOUND! Document details:');
      console.log(JSON.stringify(specificDoc, null, 2));
    } else {
      console.log('NOT FOUND in documents collection');
    }

    // Check latest documents
    const latestDocs = await documentsCollection.find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log('\n=== LATEST 5 DOCUMENTS ===');
    latestDocs.forEach(doc => {
      console.log(`\n- ID: ${doc._id}`);
      console.log(`  Name: ${doc.documentName}`);
      console.log(`  Amount: ${doc.amount}`);
      console.log(`  CreatedAt: ${doc.createdAt}`);
      if (doc.documentName && doc.documentName.includes('タイムズ24')) {
        console.log('  *** Contains タイムズ24 ***');
      }
    });

    // Check ocr_results collection
    console.log('\n=== OCR_RESULTS COLLECTION ===');
    const ocrExists = collections.some(col => col.name === 'ocr_results');
    
    if (ocrExists) {
      const ocrCollection = db.collection('ocr_results');
      const totalOcr = await ocrCollection.countDocuments();
      console.log(`Total OCR results: ${totalOcr}`);
      
      // Find OCR results from today
      const todayOcr = await ocrCollection.find({
        createdAt: { $gte: new Date('2025-01-21T00:00:00Z'), $lt: new Date('2025-01-22T00:00:00Z') }
      }).sort({ createdAt: -1 }).toArray();
      
      console.log(`\nOCR results from 2025-01-21: ${todayOcr.length} found`);
      if (todayOcr.length > 0) {
        todayOcr.forEach(ocr => {
          console.log(`\n- ID: ${ocr._id}`);
          console.log(`  DocumentId: ${ocr.documentId}`);
          console.log(`  CreatedAt: ${ocr.createdAt}`);
          if (ocr.text && ocr.text.length > 0) {
            console.log(`  Text preview: ${ocr.text.substring(0, 100)}...`);
          }
        });
      }

      // Find OCR result for the specific document
      const specificOcr = await ocrCollection.findOne({ documentId: targetId });
      if (specificOcr) {
        console.log(`\nFOUND OCR result for document ID ${targetId}:`);
        console.log(JSON.stringify(specificOcr, null, 2));
      } else {
        console.log(`\nNo OCR result found for document ID ${targetId}`);
      }

      // Check latest OCR results
      const latestOcr = await ocrCollection.find().sort({ createdAt: -1 }).limit(5).toArray();
      console.log('\n=== LATEST 5 OCR RESULTS ===');
      latestOcr.forEach(ocr => {
        console.log(`\n- ID: ${ocr._id}`);
        console.log(`  DocumentId: ${ocr.documentId}`);
        console.log(`  CreatedAt: ${ocr.createdAt}`);
        if (ocr.text && ocr.text.includes('タイムズ24')) {
          console.log('  *** Contains タイムズ24 in text ***');
        }
      });
    } else {
      console.log('ocr_results collection does not exist');
    }

    // Search for Times 24 data
    console.log('\n=== SEARCHING FOR タイムズ24 (TIMES 24) DATA ===');
    const times24Docs = await documentsCollection.find({
      $or: [
        { documentName: { $regex: /タイムズ24/i } },
        { documentName: { $regex: /times.*24/i } },
        { 'metadata.originalFileName': { $regex: /タイムズ24/i } },
        { 'metadata.originalFileName': { $regex: /times.*24/i } }
      ]
    }).toArray();
    
    console.log(`\nFound ${times24Docs.length} documents related to タイムズ24:`);
    times24Docs.forEach(doc => {
      console.log(`\n- ID: ${doc._id}`);
      console.log(`  Name: ${doc.documentName}`);
      console.log(`  Amount: ${doc.amount}`);
      console.log(`  CreatedAt: ${doc.createdAt}`);
      if (doc.amount === 880) {
        console.log('  *** Amount matches ¥880 ***');
      }
    });

    // Search for documents with amount 880
    console.log('\n=== SEARCHING FOR DOCUMENTS WITH AMOUNT ¥880 ===');
    const amount880Docs = await documentsCollection.find({ amount: 880 }).toArray();
    console.log(`\nFound ${amount880Docs.length} documents with amount ¥880:`);
    amount880Docs.forEach(doc => {
      console.log(`\n- ID: ${doc._id}`);
      console.log(`  Name: ${doc.documentName}`);
      console.log(`  CreatedAt: ${doc.createdAt}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkMongoDB();