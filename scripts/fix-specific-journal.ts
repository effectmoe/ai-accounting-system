#!/usr/bin/env tsx
/*
 * 特定の仕訳伝票（J202500004）に駐車場情報を追加するスクリプト
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

async function fixSpecificJournal() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');
    
    const db = client.db(MONGODB_DB);
    const documents = db.collection('documents');
    
    // J202500004を検索（IDが違う可能性があるので複数の方法で検索）
    let journal = await documents.findOne({
      _id: new ObjectId('6880d62e851fb32caa16ff59')
    });
    
    if (!journal) {
      // documentNumberで検索
      journal = await documents.findOne({
        documentNumber: 'J202500004'
      });
    }
    
    if (!journal) {
      // 6880d62e851fb32caa16ff58も試す（最後の数字が違う）
      journal = await documents.findOne({
        _id: new ObjectId('6880d62e851fb32caa16ff58')
      });
    }
    
    if (!journal) {
      console.log('❌ 仕訳伝票 J202500004 が見つかりません');
      return;
    }
    
    console.log('📋 仕訳伝票を発見:', {
      id: journal._id,
      documentNumber: journal.documentNumber,
      documentType: journal.documentType,
      sourceDocumentId: journal.sourceDocumentId
    });
    
    if (!journal.sourceDocumentId) {
      console.log('⚠️  元の領収書IDがありません');
      return;
    }
    
    // 元の領収書を取得
    const sourceDoc = await documents.findOne({
      _id: new ObjectId(journal.sourceDocumentId)
    });
    
    if (!sourceDoc) {
      console.log('❌ 元の領収書が見つかりません:', journal.sourceDocumentId);
      return;
    }
    
    console.log('📋 元の領収書を発見:', {
      id: sourceDoc._id,
      documentNumber: sourceDoc.documentNumber,
      receipt_type: sourceDoc.receipt_type,
      facility_name: sourceDoc.facility_name,
      entry_time: sourceDoc.entry_time,
      exit_time: sourceDoc.exit_time
    });
    
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
    
    console.log('\n📝 更新するフィールド:', updateData);
    
    if (Object.keys(updateData).length > 0) {
      const result = await documents.updateOne(
        { _id: journal._id },
        { $set: updateData }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ 更新成功！');
      } else {
        console.log('⏸️  更新なし（既に設定済みの可能性）');
      }
    } else {
      console.log('❌ 更新するフィールドがありません');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

// スクリプトを実行
fixSpecificJournal().catch(console.error);