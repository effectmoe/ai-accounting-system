#!/usr/bin/env node
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function queryOCRResult() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('accounting');
    const collection = db.collection('ocr_results');
    
    // 特定のIDで検索
    const ocrId = '687900aaa86aeee65b87efc3';
    const result = await collection.findOne({ _id: new ObjectId(ocrId) });
    
    if (result) {
      console.log('OCR Result found:');
      console.log(JSON.stringify(result, null, 2));
      
      // 商品情報を詳しく確認
      if (result.extractedData && result.extractedData.items) {
        console.log('\n=== Items Detail ===');
        result.extractedData.items.forEach((item, index) => {
          console.log(`\nItem ${index + 1}:`);
          console.log(JSON.stringify(item, null, 2));
        });
      }
      
      // rawResultがある場合は確認
      if (result.rawResult) {
        console.log('\n=== Raw Result Sample ===');
        const rawString = JSON.stringify(result.rawResult);
        console.log(rawString.substring(0, 1000) + '...');
      }
    } else {
      console.log('No OCR result found with ID:', ocrId);
      
      // 最新のOCR結果を表示
      const latestResults = await collection.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      console.log('\nLatest OCR results:');
      latestResults.forEach(r => {
        console.log(`- ID: ${r._id}, File: ${r.fileName}, Created: ${r.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

queryOCRResult();