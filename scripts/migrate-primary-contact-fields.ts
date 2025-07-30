/**
 * プライマリ連絡先フィールドのマイグレーションスクリプト
 * フェーズ2 段階3: 既存データに事前計算フィールドを追加
 */

import { OptimizedCustomerQueries } from '../lib/optimized-customer-queries';
import { logger } from '../lib/logger';

async function runMigration() {
  logger.info('🚀 Starting primary contact fields migration...');
  
  try {
    const startTime = Date.now();
    
    // バッチ更新を実行
    const stats = await OptimizedCustomerQueries.batchUpdatePrimaryContactFields(100);
    
    const duration = Date.now() - startTime;
    
    logger.info('✅ Migration completed successfully!');
    logger.info(`📊 Statistics:`, {
      processed: stats.processed,
      updated: stats.updated,
      errors: stats.errors,
      duration: `${duration}ms`,
      avgTimePerRecord: stats.processed > 0 ? `${(duration / stats.processed).toFixed(2)}ms` : 'N/A'
    });

    if (stats.errors > 0) {
      logger.warn(`⚠️ ${stats.errors} errors occurred during migration. Check logs for details.`);
    }

    process.exit(stats.errors > 0 ? 1 : 0);

  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// 実行確認
console.log('⚠️  This migration will update all customer records with pre-calculated primary contact fields.');
console.log('This is a one-time operation that will improve query performance.');
console.log('');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

setTimeout(() => {
  runMigration();
}, 5000);