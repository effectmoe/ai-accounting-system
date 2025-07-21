const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkMongoDB() {
  const uri = process.env.MONGODB_URI;
  console.log('MongoDB URI:', uri ? 'Found' : 'Not found');

  if (!uri) {
    console.error('MONGODB_URI is not set in environment variables');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas successfully!\n');

    // List all databases
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name}`);
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
    
    // Find documents from 2025-07-21
    const todayDocs = await documentsCollection.find({
      createdAt: { $gte: new Date('2025-07-21T00:00:00Z'), $lt: new Date('2025-07-22T00:00:00Z') }
    }).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log(`\nDocuments from 2025-07-21: ${todayDocs.length} found`);
    todayDocs.forEach(doc => {
      console.log(`- ID: ${doc._id}, Name: ${doc.documentName}, CreatedAt: ${doc.createdAt}`);
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
    const latestDocs = await documentsCollection.find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log('\nLatest 5 documents:');
    latestDocs.forEach(doc => {
      console.log(`- ID: ${doc._id}, Name: ${doc.documentName}, CreatedAt: ${doc.createdAt}`);
    });

    // Check ocr_results collection
    console.log('\n=== OCR_RESULTS COLLECTION ===');
    const ocrCollection = db.collection('ocr_results');
    
    // Check if collection exists
    const ocrExists = collections.some(col => col.name === 'ocr_results');
    if (ocrExists) {
      // Find OCR results from today
      const todayOcr = await ocrCollection.find({
        createdAt: { $gte: new Date('2025-07-21T00:00:00Z'), $lt: new Date('2025-07-22T00:00:00Z') }
      }).sort({ createdAt: -1 }).limit(5).toArray();
      
      console.log(`\nOCR results from 2025-07-21: ${todayOcr.length} found`);
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
      const latestOcr = await ocrCollection.find().sort({ createdAt: -1 }).limit(5).toArray();
      console.log('\nLatest 5 OCR results:');
      latestOcr.forEach(ocr => {
        console.log(`- ID: ${ocr._id}, DocumentId: ${ocr.documentId}, CreatedAt: ${ocr.createdAt}`);
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
      console.log(`- ID: ${doc._id}, Name: ${doc.documentName}, CreatedAt: ${doc.createdAt}`);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkMongoDB();