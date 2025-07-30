const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixExistingCustomerAddresses() {
  const client = new MongoClient(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');
    
    // MongoDBのURIからデータベース名を抽出
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    const dbNameMatch = mongoUri.match(/\/([^/?]+)\?/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'accounting';
    
    console.log(`📁 使用するデータベース: ${dbName}`);
    const db = client.db(dbName);
    const collection = db.collection('customers');
    
    // 修正が必要な顧客データのパターン
    const fixPatterns = [
      {
        filter: { companyName: '株式会社ペイプランニングワークス' },
        update: {
          $set: {
            postalCode: '803-0856',
            prefecture: '福岡県',
            city: '北九州市小倉北区',
            address1: '弁天町5-2',
            address2: '内山南小倉駅前ビル501',
            fax: '093-581-1110',
            website: 'https://www.pei.co.jp'
          }
        },
        description: 'ペイプランニングワークスの住所修正'
      }
    ];
    
    // 一般的な修正パターン
    console.log('\n🔧 一般的な住所パターンを修正中...');
    
    // 都道府県に「市」が含まれるものを修正
    const wrongPrefectureCustomers = await collection.find({
      prefecture: { $regex: '市', $options: 'i' }
    }).toArray();
    
    for (const customer of wrongPrefectureCustomers) {
      console.log(`\n修正対象: ${customer.companyName}`);
      console.log(`現在の住所: ${customer.prefecture} ${customer.city} ${customer.address1}`);
      
      // 都道府県と市区町村を再構築
      const fullAddress = `${customer.prefecture}${customer.city || ''}${customer.address1 || ''}`;
      console.log(`完全な住所: ${fullAddress}`);
      
      // 都道府県の抽出
      const prefectureMatch = fullAddress.match(/(東京都|大阪府|京都府|北海道|[^都道府県]+県)/);
      if (prefectureMatch) {
        const newPrefecture = prefectureMatch[1];
        let remaining = fullAddress.replace(newPrefecture, '');
        
        // 市区町村の抽出
        let newCity = '';
        let newAddress1 = '';
        
        // 政令指定都市の区を含む場合
        const cityWithWardMatch = remaining.match(/^([^市]+市[^区]+区)/);
        if (cityWithWardMatch) {
          newCity = cityWithWardMatch[1];
          newAddress1 = remaining.replace(cityWithWardMatch[1], '');
        } else {
          // 通常の市区町村
          const cityMatch = remaining.match(/^([^市区町村]+[市区町村])/);
          if (cityMatch) {
            newCity = cityMatch[1];
            newAddress1 = remaining.replace(cityMatch[1], '');
          }
        }
        
        console.log(`修正後: 都道府県="${newPrefecture}" 市区町村="${newCity}" 住所1="${newAddress1}"`);
        
        // 更新を実行
        const updateResult = await collection.updateOne(
          { _id: customer._id },
          {
            $set: {
              prefecture: newPrefecture,
              city: newCity,
              address1: newAddress1
            }
          }
        );
        
        console.log(`✅ 更新完了: ${updateResult.modifiedCount} 件`);
      }
    }
    
    // 特定の顧客データの修正
    console.log('\n🔧 特定の顧客データを修正中...');
    for (const pattern of fixPatterns) {
      console.log(`\n${pattern.description}`);
      const result = await collection.updateMany(pattern.filter, pattern.update);
      console.log(`✅ 更新された件数: ${result.modifiedCount}`);
    }
    
    // 修正後の確認
    console.log('\n📊 修正後の確認:');
    const updatedCustomers = await collection.find({
      $or: [
        { companyName: '株式会社ペイプランニングワークス' },
        { prefecture: { $regex: '市', $options: 'i' } }
      ]
    }).toArray();
    
    updatedCustomers.forEach(customer => {
      console.log(`\n${customer.companyName}:`);
      console.log(`  都道府県: ${customer.prefecture}`);
      console.log(`  市区町村: ${customer.city}`);
      console.log(`  住所1: ${customer.address1}`);
      console.log(`  住所2: ${customer.address2}`);
      console.log(`  FAX: ${customer.fax}`);
      console.log(`  ウェブサイト: ${customer.website}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

console.log('🚀 既存顧客データの住所修正を開始します...');
fixExistingCustomerAddresses().catch(console.error);