#!/usr/bin/env tsx
/*
 * 仕訳伝票に駐車場情報を追加するスクリプト
 * 元の領収書から駐車場情報をコピーして仕訳伝票に追加します
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'accounting-system';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

async function fixJournalParkingInfo() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');
    
    const db = client.db(MONGODB_DB);
    const documents = db.collection('documents');
    
    // 仕訳伝票を検索
    const journals = await documents.find({
      documentType: 'journal_entry',
      sourceDocumentId: { $exists: true }
    }).toArray();
    
    console.log(`📋 見つかった仕訳伝票数: ${journals.length}`);
    
    let updateCount = 0;
    
    for (const journal of journals) {
      if (!journal.sourceDocumentId) continue;
      
      // 元の領収書を取得
      const sourceDoc = await documents.findOne({
        _id: new ObjectId(journal.sourceDocumentId)
      });
      
      if (!sourceDoc) {
        console.log(`⚠️  元の領収書が見つかりません: ${journal.sourceDocumentId}`);
        continue;
      }
      
      // 駐車場情報があるかチェック
      const isParkingReceipt = sourceDoc.receipt_type === 'parking' || 
                              sourceDoc.receiptType === 'parking' ||
                              sourceDoc.vendorName?.includes('タイムズ');
      
      if (!isParkingReceipt) continue;
      
      console.log(`\n処理中: ${journal.documentNumber} (${journal._id})`);
      console.log(`  元の領収書: ${sourceDoc.documentNumber}`);
      
      // 更新データを準備
      const updateData: any = {};
      
      // 駐車場情報をコピー
      if (sourceDoc.receipt_type || sourceDoc.receiptType) {
        updateData.receipt_type = sourceDoc.receipt_type || sourceDoc.receiptType;
      }
      if (sourceDoc.facility_name || sourceDoc.facilityName) {
        updateData.facility_name = sourceDoc.facility_name || sourceDoc.facilityName;
      }
      if (sourceDoc.entry_time || sourceDoc.entryTime) {
        updateData.entry_time = sourceDoc.entry_time || sourceDoc.entryTime;
      }
      if (sourceDoc.exit_time || sourceDoc.exitTime) {
        updateData.exit_time = sourceDoc.exit_time || sourceDoc.exitTime;
      }
      if (sourceDoc.parking_duration || sourceDoc.parkingDuration) {
        updateData.parking_duration = sourceDoc.parking_duration || sourceDoc.parkingDuration;
      }
      if (sourceDoc.base_fee !== undefined || sourceDoc.baseFee !== undefined) {
        updateData.base_fee = sourceDoc.base_fee ?? sourceDoc.baseFee;
      }
      if (sourceDoc.additional_fee !== undefined || sourceDoc.additionalFee !== undefined) {
        updateData.additional_fee = sourceDoc.additional_fee ?? sourceDoc.additionalFee;
      }
      
      if (Object.keys(updateData).length > 0) {
        console.log(`  📝 更新内容:`, updateData);
        
        const result = await documents.updateOne(
          { _id: journal._id },
          { $set: updateData }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`  ✅ 更新成功`);
          updateCount++;
        } else {
          console.log(`  ⏸️  更新なし（既に設定済み）`);
        }
      }
    }
    
    console.log(`\n========== 処理結果 ==========`);
    console.log(`処理した仕訳伝票数: ${journals.length}`);
    console.log(`更新した仕訳伝票数: ${updateCount}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

// スクリプトを実行
fixJournalParkingInfo().catch(console.error);