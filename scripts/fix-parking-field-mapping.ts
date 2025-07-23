#!/usr/bin/env ts-node

/**
 * 駐車場フィールドマッピング修正スクリプト
 * 
 * このスクリプトは以下の問題を修正します：
 * 1. キャメルケースとスネークケースの不一致
 * 2. OCRデータから文書への保存時のフィールド欠落
 * 3. API応答でのフィールドマッピング
 */

import { MongoClient, ObjectId } from 'mongodb';
import { logger } from '../lib/logger';

// 環境変数の読み込み
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting';

// フィールドマッピング定義
const PARKING_FIELD_MAPPING = {
  receiptType: 'receipt_type',
  facilityName: 'facility_name',
  entryTime: 'entry_time',
  exitTime: 'exit_time',
  parkingDuration: 'parking_duration',
  baseFee: 'base_fee',
  additionalFee: 'additional_fee',
  companyName: 'company_name'
};

interface FixResult {
  documentId: string;
  vendorName: string;
  fieldsFixed: string[];
  fieldsAdded: string[];
  errors: string[];
}

async function fixParkingFieldMapping(dryRun: boolean = true) {
  const client = new MongoClient(MONGODB_URI);
  const results: FixResult[] = [];

  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');
    console.log(`🔧 モード: ${dryRun ? 'ドライラン（実際の更新なし）' : '実行モード'}`);
    
    const db = client.db(DB_NAME);
    const documentsCollection = db.collection('documents');

    // ステップ1: 駐車場関連文書を検索
    console.log('\n📋 ステップ1: 駐車場関連文書の検索');
    
    const query = {
      $or: [
        { receiptType: 'parking' },
        { receipt_type: 'parking' },
        { 'ocrResult.receiptType': 'parking' },
        { vendor_name: { $regex: /タイムズ|times|パーキング|駐車場/i } },
        { vendorName: { $regex: /タイムズ|times|パーキング|駐車場/i } },
        { facilityName: { $exists: true } },
        { facility_name: { $exists: true } },
        { 'ocrResult.facilityName': { $exists: true } }
      ]
    };

    const documents = await documentsCollection.find(query).toArray();
    console.log(`📊 見つかった文書数: ${documents.length}`);

    for (const doc of documents) {
      const result: FixResult = {
        documentId: doc._id.toString(),
        vendorName: doc.vendor_name || doc.vendorName || '不明',
        fieldsFixed: [],
        fieldsAdded: [],
        errors: []
      };

      console.log(`\n処理中: ${result.documentId} (${result.vendorName})`);

      const updateData: any = {};

      // ステップ2: 各フィールドをチェックして修正
      for (const [camelCase, snakeCase] of Object.entries(PARKING_FIELD_MAPPING)) {
        // キャメルケースが存在してスネークケースが存在しない場合
        if (doc[camelCase] !== undefined && doc[snakeCase] === undefined) {
          updateData[snakeCase] = doc[camelCase];
          result.fieldsFixed.push(`${camelCase} → ${snakeCase}`);
        }
        
        // ocrResultから値を取得
        if (doc.ocrResult && doc.ocrResult[camelCase] !== undefined && doc[snakeCase] === undefined) {
          updateData[snakeCase] = doc.ocrResult[camelCase];
          result.fieldsAdded.push(`ocrResult.${camelCase} → ${snakeCase}`);
        }
        
        // スネークケースが存在してキャメルケースが存在しない場合（逆方向）
        if (doc[snakeCase] !== undefined && doc[camelCase] === undefined) {
          updateData[camelCase] = doc[snakeCase];
          result.fieldsFixed.push(`${snakeCase} → ${camelCase}`);
        }
      }

      // ステップ3: receiptTypeの特別処理
      if (!doc.receipt_type && !doc.receiptType) {
        // ベンダー名から判定
        const vendorText = (doc.vendor_name || doc.vendorName || '').toLowerCase();
        if (vendorText.includes('タイムズ') || vendorText.includes('times') || 
            vendorText.includes('パーキング') || vendorText.includes('駐車場')) {
          updateData.receipt_type = 'parking';
          updateData.receiptType = 'parking';
          result.fieldsAdded.push('receipt_type = "parking" (自動判定)');
        }
      }

      // ステップ4: facilityNameの特別処理
      if (!doc.facility_name && !doc.facilityName && (doc.vendor_name || doc.vendorName)) {
        const vendorName = doc.vendor_name || doc.vendorName;
        if (vendorName.includes('タイムズ')) {
          updateData.facility_name = vendorName;
          updateData.facilityName = vendorName;
          result.fieldsAdded.push(`facility_name = "${vendorName}" (vendor_nameから設定)`);
        }
      }

      // ステップ5: companyNameの設定
      if (!doc.company_name && !doc.companyName && (doc.receipt_type === 'parking' || updateData.receipt_type === 'parking')) {
        updateData.company_name = 'タイムズ24株式会社';
        updateData.companyName = 'タイムズ24株式会社';
        result.fieldsAdded.push('company_name = "タイムズ24株式会社"');
      }

      // ステップ6: 更新の実行
      if (Object.keys(updateData).length > 0) {
        console.log(`  📝 更新内容:`, updateData);
        
        if (!dryRun) {
          try {
            const updateResult = await documentsCollection.updateOne(
              { _id: doc._id },
              { 
                $set: {
                  ...updateData,
                  updatedAt: new Date()
                }
              }
            );
            
            if (updateResult.modifiedCount > 0) {
              console.log(`  ✅ 更新成功`);
            } else {
              result.errors.push('更新が実行されませんでした');
            }
          } catch (error) {
            result.errors.push(`更新エラー: ${error}`);
          }
        } else {
          console.log(`  ⏸️  ドライラン - 実際の更新はスキップ`);
        }
      } else {
        console.log(`  ✅ 更新不要 - すべてのフィールドが正しく設定されています`);
      }

      results.push(result);
    }

    // ステップ7: 結果のサマリー
    console.log('\n\n========== 処理結果サマリー ==========');
    console.log(`処理した文書数: ${results.length}`);
    
    const fixedCount = results.filter(r => r.fieldsFixed.length > 0 || r.fieldsAdded.length > 0).length;
    console.log(`修正が必要な文書数: ${fixedCount}`);
    
    const errorCount = results.filter(r => r.errors.length > 0).length;
    if (errorCount > 0) {
      console.log(`エラーが発生した文書数: ${errorCount}`);
    }

    // フィールド別の統計
    const fieldStats: Record<string, number> = {};
    results.forEach(r => {
      [...r.fieldsFixed, ...r.fieldsAdded].forEach(field => {
        const fieldName = field.split(' ')[0];
        fieldStats[fieldName] = (fieldStats[fieldName] || 0) + 1;
      });
    });

    if (Object.keys(fieldStats).length > 0) {
      console.log('\n📊 フィールド別修正数:');
      Object.entries(fieldStats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([field, count]) => {
          console.log(`  ${field}: ${count}件`);
        });
    }

    if (dryRun && fixedCount > 0) {
      console.log('\n💡 実際に修正を実行するには、--execute オプションを付けて実行してください:');
      console.log('   npm run fix-parking-fields -- --execute');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    logger.error('Fix script error:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
const shouldExecute = args.includes('--execute') || args.includes('-e');

// スクリプトの実行
fixParkingFieldMapping(!shouldExecute)
  .then(() => {
    console.log('\n✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ スクリプトエラー:', error);
    process.exit(1);
  });