/**
 * MongoDB パフォーマンス最適化インデックス作成スクリプト
 * フェーズ2 段階1: データベースパフォーマンス向上
 */

import { getDatabase } from '../lib/mongodb-client';
import { logger } from '../lib/logger';

export interface IndexCreationResult {
  indexName: string;
  created: boolean;
  error?: string;
  executionTime: number;
}

export class PerformanceIndexManager {
  private results: IndexCreationResult[] = [];

  /**
   * すべてのパフォーマンスインデックスを作成
   */
  async createAllPerformanceIndexes(): Promise<IndexCreationResult[]> {
    logger.info('🚀 Phase 2 Step 1: Creating performance indexes...');
    
    try {
      const db = await getDatabase();
      const collection = db.collection('customers');

      // 既存インデックスの確認
      const existingIndexes = await collection.listIndexes().toArray();
      logger.info('📋 Existing indexes:', existingIndexes.map(idx => idx.name));

      // 1. 複合テキスト検索インデックス
      await this.createSearchIndex(collection);

      // 2. フィルター用複合インデックス
      await this.createFilterIndex(collection);

      // 3. プライマリ連絡先最適化インデックス
      await this.createContactIndex(collection);

      // 4. 日本語ソート専用インデックス
      await this.createKanaSortIndex(collection);

      // 5. 単一フィールドインデックス（必要に応じて）
      await this.createSingleFieldIndexes(collection);

      logger.info('✅ All performance indexes creation completed');
      return this.results;

    } catch (error) {
      logger.error('❌ Failed to create performance indexes:', error);
      throw error;
    }
  }

  /**
   * 1. 複合テキスト検索インデックス作成
   */
  private async createSearchIndex(collection: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('📝 Creating text search index...');
      
      const indexSpec = {
        'companyName': 'text',
        'companyNameKana': 'text',
        'email': 'text',
        'customerId': 'text',
        'department': 'text',
        'contacts.name': 'text'
      };

      const options = {
        name: 'customers_search_index',
        // MongoDBでは日本語はサポートされていないため、デフォルト言語を使用
        weights: {
          'companyName': 10,
          'customerId': 8,
          'email': 5,
          'companyNameKana': 3,
          'department': 2,
          'contacts.name': 2
        },
        background: true
      };

      await collection.createIndex(indexSpec, options);

      this.results.push({
        indexName: 'customers_search_index',
        created: true,
        executionTime: Date.now() - startTime
      });

      logger.info('✅ Text search index created successfully');

    } catch (error: any) {
      this.results.push({
        indexName: 'customers_search_index',
        created: false,
        error: error.message,
        executionTime: Date.now() - startTime
      });

      if (error.code === 85) {
        logger.warn('⚠️ Text search index already exists, skipping...');
      } else {
        logger.error('❌ Failed to create text search index:', error);
        throw error;
      }
    }
  }

  /**
   * 2. フィルター用複合インデックス作成
   */
  private async createFilterIndex(collection: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('🔍 Creating filter index...');

      const indexSpec = {
        'isActive': 1,
        'prefecture': 1,
        'city': 1,
        'paymentTerms': 1,
        'createdAt': -1
      };

      const options = {
        name: 'customers_filter_index',
        background: true
      };

      await collection.createIndex(indexSpec, options);

      this.results.push({
        indexName: 'customers_filter_index',
        created: true,
        executionTime: Date.now() - startTime
      });

      logger.info('✅ Filter index created successfully');

    } catch (error: any) {
      this.results.push({
        indexName: 'customers_filter_index',
        created: false,
        error: error.message,
        executionTime: Date.now() - startTime
      });

      if (error.code === 85) {
        logger.warn('⚠️ Filter index already exists, skipping...');
      } else {
        logger.error('❌ Failed to create filter index:', error);
        throw error;
      }
    }
  }

  /**
   * 3. プライマリ連絡先最適化インデックス作成
   */
  private async createContactIndex(collection: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('👥 Creating contact index...');

      const indexSpec = {
        'contacts.isPrimary': 1,
        'contacts.name': 1,
        'contacts.nameKana': 1
      };

      const options = {
        name: 'customers_contact_index',
        background: true
      };

      await collection.createIndex(indexSpec, options);

      this.results.push({
        indexName: 'customers_contact_index',
        created: true,
        executionTime: Date.now() - startTime
      });

      logger.info('✅ Contact index created successfully');

    } catch (error: any) {
      this.results.push({
        indexName: 'customers_contact_index',
        created: false,
        error: error.message,
        executionTime: Date.now() - startTime
      });

      if (error.code === 85) {
        logger.warn('⚠️ Contact index already exists, skipping...');
      } else {
        logger.error('❌ Failed to create contact index:', error);
        throw error;
      }
    }
  }

  /**
   * 4. 日本語ソート専用インデックス作成
   */
  private async createKanaSortIndex(collection: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('🔤 Creating kana sort index...');

      const indexSpec = { 'companyNameKana': 1 };

      const options = {
        name: 'customers_kana_sort_index',
        collation: {
          locale: 'ja',
          caseLevel: false,
          strength: 1
        },
        background: true
      };

      await collection.createIndex(indexSpec, options);

      this.results.push({
        indexName: 'customers_kana_sort_index',
        created: true,
        executionTime: Date.now() - startTime
      });

      logger.info('✅ Kana sort index created successfully');

    } catch (error: any) {
      this.results.push({
        indexName: 'customers_kana_sort_index',
        created: false,
        error: error.message,
        executionTime: Date.now() - startTime
      });

      if (error.code === 85) {
        logger.warn('⚠️ Kana sort index already exists, skipping...');
      } else {
        logger.error('❌ Failed to create kana sort index:', error);
        throw error;
      }
    }
  }

  /**
   * 5. 単一フィールドインデックス作成
   */
  private async createSingleFieldIndexes(collection: any): Promise<void> {
    const singleIndexes = [
      { field: 'email', name: 'customers_email_index' },
      { field: 'customerId', name: 'customers_customer_id_index' },
      { field: 'updatedAt', name: 'customers_updated_at_index' }
    ];

    for (const { field, name } of singleIndexes) {
      const startTime = Date.now();

      try {
        logger.info(`📋 Creating ${field} index...`);

        await collection.createIndex(
          { [field]: 1 },
          { name, background: true }
        );

        this.results.push({
          indexName: name,
          created: true,
          executionTime: Date.now() - startTime
        });

        logger.info(`✅ ${field} index created successfully`);

      } catch (error: any) {
        this.results.push({
          indexName: name,
          created: false,
          error: error.message,
          executionTime: Date.now() - startTime
        });

        if (error.code === 85) {
          logger.warn(`⚠️ ${field} index already exists, skipping...`);
        } else {
          logger.error(`❌ Failed to create ${field} index:`, error);
        }
      }
    }
  }

  /**
   * インデックス作成状況の確認
   */
  async verifyIndexes(): Promise<void> {
    try {
      const db = await getDatabase();
      const collection = db.collection('customers');
      
      const indexes = await collection.listIndexes().toArray();
      
      logger.info('📊 Current indexes verification:');
      indexes.forEach(index => {
        logger.info(`  ✓ ${index.name}: ${JSON.stringify(index.key)}`);
      });

      // インデックス統計の取得
      const stats = await collection.stats();
      logger.info('📈 Collection statistics:', {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        totalIndexSize: stats.totalIndexSize
      });

    } catch (error) {
      logger.error('❌ Failed to verify indexes:', error);
    }
  }

  /**
   * パフォーマンステスト用のクエリ実行
   */
  async performanceTest(): Promise<void> {
    try {
      logger.info('🧪 Running performance tests...');
      
      const db = await getDatabase();
      const collection = db.collection('customers');

      // テスト1: テキスト検索
      const searchStart = Date.now();
      await collection.find({
        $text: { $search: "test" }
      }).limit(10).toArray();
      const searchTime = Date.now() - searchStart;

      // テスト2: フィルタークエリ
      const filterStart = Date.now();
      await collection.find({
        isActive: true,
        prefecture: { $regex: "東京", $options: "i" }
      }).limit(10).toArray();
      const filterTime = Date.now() - filterStart;

      // テスト3: ソートクエリ
      const sortStart = Date.now();
      await collection.find({})
        .sort({ companyNameKana: 1 })
        .limit(10)
        .toArray();
      const sortTime = Date.now() - sortStart;

      logger.info('📊 Performance test results:', {
        textSearch: `${searchTime}ms`,
        filterQuery: `${filterTime}ms`,
        sortQuery: `${sortTime}ms`
      });

    } catch (error) {
      logger.error('❌ Performance test failed:', error);
    }
  }
}

/**
 * スクリプト実行用の関数
 */
export async function runIndexCreation(): Promise<void> {
  const manager = new PerformanceIndexManager();
  
  try {
    // インデックス作成
    const results = await manager.createAllPerformanceIndexes();
    
    // 結果の表示
    console.log('\n📊 Index Creation Results:');
    results.forEach(result => {
      const status = result.created ? '✅' : '❌';
      const time = `${result.executionTime}ms`;
      const error = result.error ? ` (${result.error})` : '';
      console.log(`${status} ${result.indexName}: ${time}${error}`);
    });

    // インデックス確認
    await manager.verifyIndexes();

    // パフォーマンステスト
    await manager.performanceTest();

    console.log('\n🎉 Phase 2 Step 1 completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Phase 2 Step 1 failed:', error);
    process.exit(1);
  }
}

// 直接実行の場合
if (require.main === module) {
  runIndexCreation().catch(console.error);
}