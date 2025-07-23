#!/usr/bin/env tsx
/*
 * 仕訳伝票作成プロセスにおけるフィールド処理の比較スクリプト
 * 
 * このスクリプトは以下を検証します：
 * 1. MongoDB接続とコレクション構造
 * 2. 仕訳伝票J202500004と元の領収書の関係
 * 3. 通常フィールドと駐車場フィールドのコピー状況
 * 4. フィールドマッピングの実装状況
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'accounting_system';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

// フィールドカテゴリの定義
const fieldCategories = {
  regular: [
    'amount', 'totalAmount', 'date', 'issueDate', 'vendorName', 
    'customerName', 'partnerName', 'description', 'category', 
    'subtotal', 'taxAmount', 'notes'
  ],
  parking: [
    'receipt_type', 'receiptType', 'facility_name', 'facilityName',
    'entry_time', 'entryTime', 'exit_time', 'exitTime',
    'parking_duration', 'parkingDuration', 'base_fee', 'baseFee',
    'additional_fee', 'additionalFee'
  ],
  system: [
    '_id', 'createdAt', 'updatedAt', 'modifiedAt', '__v',
    'companyId', 'status', 'documentType', 'documentNumber'
  ]
};

async function compareJournalFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ MongoDB接続成功\n');
    
    const db = client.db(MONGODB_DB);
    
    // 1. コレクション確認
    console.log('=== 1. データベース構造の確認 ===');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`利用可能なコレクション: ${collectionNames.join(', ')}\n`);
    
    // 2. 指定されたIDでドキュメントを検索
    const targetJournalId = '6880d62e851fb32caa16ff59';
    const targetReceiptId = '6880d623cd5c7448ad287751';
    
    console.log('=== 2. ドキュメント検索 ===');
    console.log(`仕訳伝票ID: ${targetJournalId}`);
    console.log(`領収書ID: ${targetReceiptId}\n`);
    
    // journalsコレクションが存在する場合
    if (collectionNames.includes('journals')) {
      await analyzeJournalsCollection(db, targetJournalId, targetReceiptId);
    }
    
    // documentsコレクションでの分析
    await analyzeDocumentsCollection(db, targetJournalId, targetReceiptId);
    
    // 3. 実装されているフィールドマッピングの確認
    console.log('\n=== 4. 実装されているフィールドマッピング (route.tsより) ===');
    console.log('\n✅ 仕訳伝票作成時にコピーされるフィールド:');
    console.log('通常フィールド:');
    console.log('  - totalAmount (金額)');
    console.log('  - issueDate (日付)');
    console.log('  - partnerName (取引先名)');
    console.log('  - category (勘定科目)');
    console.log('  - gridfsFileId (画像ID)');
    console.log('\n駐車場フィールド:');
    console.log('  - receipt_type / receiptType');
    console.log('  - facility_name / facilityName');
    console.log('  - entry_time / entryTime');
    console.log('  - exit_time / exitTime');
    console.log('  - parking_duration / parkingDuration');
    console.log('  - base_fee / baseFee');
    console.log('  - additional_fee / additionalFee');
    
    console.log('\n📍 実装の詳細:');
    console.log('app/api/journals/create/route.ts の 177-184行目で');
    console.log('sourceDocument から駐車場情報を明示的にコピーしています。');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

async function analyzeJournalsCollection(db: any, journalId: string, receiptId: string) {
  console.log('\n--- journalsコレクションの分析 ---');
  const journals = db.collection('journals');
  
  // IDで検索
  let journal = await journals.findOne({ _id: journalId });
  if (!journal) {
    try {
      journal = await journals.findOne({ _id: new ObjectId(journalId) });
    } catch (e) {}
  }
  
  if (journal) {
    console.log(`✅ 仕訳伝票が見つかりました: ${journal.journalNumber}`);
    console.log(`  sourceDocumentId: ${journal.sourceDocumentId}`);
    
    if (journal.sourceDocumentId) {
      compareWithSourceDocument(db, journal, journal.sourceDocumentId);
    }
  } else {
    console.log('❌ 指定されたIDの仕訳伝票は見つかりませんでした');
  }
}

async function analyzeDocumentsCollection(db: any, journalId: string, receiptId: string) {
  console.log('\n=== 3. documentsコレクションの分析 ===');
  const documents = db.collection('documents');
  
  // 仕訳伝票を検索
  let journal = await findDocument(documents, journalId, 'journal_entry');
  if (!journal) {
    // documentNumberで検索
    journal = await documents.findOne({ 
      documentNumber: 'J202500004',
      documentType: 'journal_entry'
    });
  }
  
  // 領収書を検索
  let receipt = await findDocument(documents, receiptId, 'receipt');
  
  if (journal && receipt) {
    console.log(`\n✅ 両方のドキュメントが見つかりました`);
    console.log(`仕訳伝票: ${journal.documentNumber} (type: ${journal.documentType})`);
    console.log(`領収書: ${receipt.documentNumber} (type: ${receipt.documentType})`);
    
    compareFields(receipt, journal);
  } else {
    if (!journal) {
      console.log('\n❌ 仕訳伝票が見つかりませんでした');
      // サンプル仕訳伝票を表示
      const sampleJournals = await documents.find({ 
        documentType: 'journal_entry' 
      }).limit(3).toArray();
      
      if (sampleJournals.length > 0) {
        console.log('\nサンプル仕訳伝票:');
        sampleJournals.forEach(j => {
          console.log(`- ${j.documentNumber}: sourceDocumentId=${j.sourceDocumentId}`);
        });
      }
    }
    
    if (!receipt) {
      console.log('\n❌ 領収書が見つかりませんでした');
      // 駐車場領収書を検索
      const parkingReceipts = await documents.find({
        vendorName: /タイムズ/,
        documentType: 'receipt'
      }).limit(3).toArray();
      
      if (parkingReceipts.length > 0) {
        console.log('\n駐車場領収書のサンプル:');
        parkingReceipts.forEach(r => {
          console.log(`- ${r.documentNumber}: ${r.vendorName}`);
          
          // この領収書から作成された仕訳を検索
          documents.findOne({
            sourceDocumentId: r._id,
            documentType: 'journal_entry'
          }).then(relatedJournal => {
            if (relatedJournal) {
              console.log(`  → 仕訳: ${relatedJournal.documentNumber}`);
              compareFields(r, relatedJournal);
            }
          });
        });
      }
    }
  }
}

async function findDocument(collection: any, id: string, expectedType?: string) {
  // 文字列IDで検索
  let doc = await collection.findOne({ _id: id });
  
  // ObjectIdで検索
  if (!doc) {
    try {
      doc = await collection.findOne({ _id: new ObjectId(id) });
    } catch (e) {}
  }
  
  // タイプチェック
  if (doc && expectedType && doc.documentType !== expectedType) {
    console.log(`⚠️  見つかったドキュメントのタイプが異なります: ${doc.documentType} (期待: ${expectedType})`);
  }
  
  return doc;
}

async function compareWithSourceDocument(db: any, journal: any, sourceDocumentId: any) {
  const documents = db.collection('documents');
  const sourceDoc = await findDocument(documents, sourceDocumentId);
  
  if (sourceDoc) {
    console.log(`\n元の領収書が見つかりました: ${sourceDoc.documentNumber}`);
    compareFields(sourceDoc, journal);
  }
}

function compareFields(source: any, journal: any) {
  console.log('\n📊 フィールド比較結果:');
  console.log('='.repeat(80));
  
  const results = {
    regular: { copied: 0, notCopied: 0, fields: [] as any[] },
    parking: { copied: 0, notCopied: 0, fields: [] as any[] }
  };
  
  // 通常フィールドの比較
  console.log('\n📋 通常フィールド:');
  fieldCategories.regular.forEach(field => {
    const sourceValue = source[field];
    const journalValue = journal[field];
    
    if (sourceValue !== undefined) {
      const isCopied = journalValue !== undefined;
      const status = isCopied ? '✅' : '❌';
      
      if (isCopied) {
        results.regular.copied++;
      } else {
        results.regular.notCopied++;
      }
      
      results.regular.fields.push({
        field,
        sourceValue,
        journalValue,
        isCopied
      });
      
      console.log(`${status} ${field.padEnd(20)}: ${formatValue(sourceValue)} → ${formatValue(journalValue)}`);
    }
  });
  
  // 駐車場フィールドの比較
  console.log('\n🚗 駐車場フィールド:');
  fieldCategories.parking.forEach(field => {
    const sourceValue = source[field];
    const journalValue = journal[field];
    
    if (sourceValue !== undefined) {
      const isCopied = journalValue !== undefined;
      const status = isCopied ? '✅' : '❌';
      
      if (isCopied) {
        results.parking.copied++;
      } else {
        results.parking.notCopied++;
      }
      
      results.parking.fields.push({
        field,
        sourceValue,
        journalValue,
        isCopied
      });
      
      console.log(`${status} ${field.padEnd(20)}: ${formatValue(sourceValue)} → ${formatValue(journalValue)}`);
    }
  });
  
  // サマリー
  console.log('\n📈 統計サマリー:');
  console.log(`通常フィールド: ${results.regular.copied}個コピー済み, ${results.regular.notCopied}個未コピー`);
  console.log(`駐車場フィールド: ${results.parking.copied}個コピー済み, ${results.parking.notCopied}個未コピー`);
  
  // 問題の分析
  if (results.parking.notCopied > 0) {
    console.log('\n⚠️  問題の分析:');
    console.log('駐車場フィールドがコピーされていない理由:');
    console.log('1. 元の領収書に駐車場情報が存在しない可能性');
    console.log('2. フィールド名の不一致（snake_case vs camelCase）');
    console.log('3. 仕訳作成時点でのバグまたは実装漏れ');
    
    console.log('\n未コピーのフィールド詳細:');
    results.parking.fields
      .filter(f => !f.isCopied && f.sourceValue !== undefined)
      .forEach(f => {
        console.log(`- ${f.field}: ${formatValue(f.sourceValue)}`);
      });
  }
  
  // sourceDocumentIdの確認
  console.log('\n🔗 リンク情報:');
  console.log(`仕訳のsourceDocumentId: ${journal.sourceDocumentId || '(なし)'}`);
  console.log(`領収書のID: ${source._id}`);
  
  if (String(journal.sourceDocumentId) === String(source._id)) {
    console.log('✅ sourceDocumentIdが正しく設定されています');
  } else {
    console.log('❌ sourceDocumentIdが一致しません');
  }
}

function formatValue(value: any): string {
  if (value === undefined) return '(未定義)';
  if (value === null) return '(null)';
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toString();
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
  return String(value).substring(0, 50);
}

// スクリプトを実行
compareJournalFields().catch(console.error);