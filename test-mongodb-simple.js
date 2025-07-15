const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log('MongoDB URI exists:', !!uri);
  
  if (!uri) {
    console.error('MONGODB_URI is not set');
    return;
  }

  // URIの一部を表示（セキュリティのため）
  console.log('Connecting to:', uri.replace(/:([^@]+)@/, ':****@'));

  const client = new MongoClient(uri);

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✓ Connected successfully!');
    
    // データベース一覧を取得
    const admin = client.db('admin');
    const result = await admin.command({ ping: 1 });
    console.log('✓ Ping successful:', result);
    
    // accountingデータベースのコレクション一覧
    const db = client.db('accounting');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
  } finally {
    await client.close();
  }
}

testConnection();