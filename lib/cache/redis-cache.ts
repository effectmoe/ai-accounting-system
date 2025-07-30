/**
 * Redis キャッシュシステム実装
 * フェーズ2 段階2: パフォーマンス最適化のためのキャッシュレイヤー
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// キャッシュキーのプレフィックス
const CACHE_PREFIX = {
  CUSTOMER_LIST: 'customers:list:',
  CUSTOMER_DETAIL: 'customers:detail:',
  CUSTOMER_SEARCH: 'customers:search:',
  CUSTOMER_FILTER: 'customers:filter:',
  AGGREGATION: 'customers:aggregation:',
} as const;

// デフォルトのTTL（秒）
const DEFAULT_TTL = {
  LIST: 5 * 60,      // 5分
  DETAIL: 10 * 60,   // 10分
  SEARCH: 10 * 60,   // 10分
  FILTER: 5 * 60,    // 5分
  AGGREGATION: 15 * 60, // 15分
} as const;

export class PerformanceCache {
  private redis: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Redis接続の初期化
   */
  private initializeRedis(): void {
    try {
      // Upstash Redis環境変数チェック
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        logger.warn('⚠️ Redis cache disabled: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
        this.enabled = false;
        return;
      }

      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      this.enabled = true;
      logger.info('✅ Redis cache initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Redis cache:', error);
      this.enabled = false;
    }
  }

  /**
   * キャッシュが有効かチェック
   */
  isEnabled(): boolean {
    return this.enabled && this.redis !== null;
  }

  /**
   * 顧客一覧のキャッシュキーを生成
   */
  private generateListCacheKey(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filters?: any;
  }): string {
    const keyData = JSON.stringify({
      page: params.page,
      limit: params.limit,
      search: params.search || '',
      sortBy: params.sortBy || 'createdAt',
      sortOrder: params.sortOrder || 'desc',
      filters: params.filters || {},
    });

    const hash = crypto.createHash('md5').update(keyData).digest('hex');
    return `${CACHE_PREFIX.CUSTOMER_LIST}${hash}`;
  }

  /**
   * 検索キャッシュキーを生成
   */
  private generateSearchCacheKey(searchTerm: string, params: any = {}): string {
    const keyData = JSON.stringify({
      search: searchTerm.toLowerCase().trim(),
      ...params
    });

    const hash = crypto.createHash('md5').update(keyData).digest('hex');
    return `${CACHE_PREFIX.CUSTOMER_SEARCH}${hash}`;
  }

  /**
   * 集約パイプラインのキャッシュキーを生成
   */
  private generateAggregationCacheKey(pipeline: any[]): string {
    const pipelineString = JSON.stringify(pipeline);
    const hash = crypto.createHash('sha256').update(pipelineString).digest('hex');
    return `${CACHE_PREFIX.AGGREGATION}${hash}`;
  }

  /**
   * 顧客一覧をキャッシュ
   */
  async cacheCustomerList(
    params: any,
    data: any,
    ttl: number = DEFAULT_TTL.LIST
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const key = this.generateListCacheKey(params);
      const startTime = Date.now();

      await this.redis!.setex(key, ttl, JSON.stringify({
        data,
        cachedAt: new Date().toISOString(),
        params
      }));

      const duration = Date.now() - startTime;
      logger.debug(`📦 Cached customer list (${duration}ms): ${key}`);

    } catch (error) {
      logger.error('❌ Failed to cache customer list:', error);
    }
  }

  /**
   * 顧客一覧をキャッシュから取得
   */
  async getCachedCustomerList(params: any): Promise<any | null> {
    if (!this.isEnabled()) return null;

    try {
      const key = this.generateListCacheKey(params);
      const startTime = Date.now();

      const cached = await this.redis!.get(key);
      
      if (!cached) {
        logger.debug(`📭 Cache miss for customer list: ${key}`);
        return null;
      }

      const duration = Date.now() - startTime;
      const parsed = JSON.parse(cached as string);
      
      logger.debug(`📬 Cache hit for customer list (${duration}ms): ${key}`);
      return parsed.data;

    } catch (error) {
      logger.error('❌ Failed to get cached customer list:', error);
      return null;
    }
  }

  /**
   * 検索結果をキャッシュ
   */
  async cacheSearchResults(
    searchTerm: string,
    results: any[],
    params: any = {},
    ttl: number = DEFAULT_TTL.SEARCH
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const key = this.generateSearchCacheKey(searchTerm, params);
      const startTime = Date.now();

      await this.redis!.setex(key, ttl, JSON.stringify({
        results,
        searchTerm,
        cachedAt: new Date().toISOString(),
        count: results.length
      }));

      const duration = Date.now() - startTime;
      logger.debug(`🔍 Cached search results (${duration}ms): ${key}`);

    } catch (error) {
      logger.error('❌ Failed to cache search results:', error);
    }
  }

  /**
   * 検索結果をキャッシュから取得
   */
  async getCachedSearchResults(
    searchTerm: string,
    params: any = {}
  ): Promise<any[] | null> {
    if (!this.isEnabled()) return null;

    try {
      const key = this.generateSearchCacheKey(searchTerm, params);
      const cached = await this.redis!.get(key);
      
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached as string);
      logger.debug(`🔍 Cache hit for search: "${searchTerm}" (${parsed.count} results)`);
      return parsed.results;

    } catch (error) {
      logger.error('❌ Failed to get cached search results:', error);
      return null;
    }
  }

  /**
   * 集約結果をキャッシュ
   */
  async cacheAggregationResult(
    pipeline: any[],
    result: any,
    ttl: number = DEFAULT_TTL.AGGREGATION
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const key = this.generateAggregationCacheKey(pipeline);
      await this.redis!.setex(key, ttl, JSON.stringify({
        result,
        cachedAt: new Date().toISOString(),
        pipelineStages: pipeline.length
      }));

      logger.debug(`📊 Cached aggregation result: ${key}`);

    } catch (error) {
      logger.error('❌ Failed to cache aggregation result:', error);
    }
  }

  /**
   * 顧客関連のキャッシュを無効化
   */
  async invalidateCustomerCache(customerId?: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const startTime = Date.now();
      let keysDeleted = 0;

      // 特定の顧客IDが指定された場合
      if (customerId) {
        const pattern = `customers:*:${customerId}*`;
        keysDeleted = await this.deleteByPattern(pattern);
      }

      // 一覧キャッシュも無効化（データが変更されたため）
      const listPattern = `${CACHE_PREFIX.CUSTOMER_LIST}*`;
      keysDeleted += await this.deleteByPattern(listPattern);

      // 検索キャッシュも無効化
      const searchPattern = `${CACHE_PREFIX.CUSTOMER_SEARCH}*`;
      keysDeleted += await this.deleteByPattern(searchPattern);

      const duration = Date.now() - startTime;
      logger.info(`🗑️ Invalidated ${keysDeleted} cache entries (${duration}ms)`);

    } catch (error) {
      logger.error('❌ Failed to invalidate customer cache:', error);
    }
  }

  /**
   * パターンに一致するキーを削除
   */
  private async deleteByPattern(pattern: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      // Upstashではscanコマンドがサポートされていないため、
      // 代替手段として既知のキーパターンを使用
      // 本番環境では、キー管理の別の方法を検討する必要があります
      
      // 一時的な解決策：個別のキーを削除
      // TODO: より効率的なキー管理戦略を実装
      
      return 0; // 実装保留

    } catch (error) {
      logger.error('❌ Failed to delete by pattern:', error);
      return 0;
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  async getStats(): Promise<{
    enabled: boolean;
    connected: boolean;
    info?: any;
  }> {
    const stats = {
      enabled: this.enabled,
      connected: false,
      info: null as any,
    };

    if (!this.isEnabled()) {
      return stats;
    }

    try {
      // 接続テスト
      await this.redis!.ping();
      stats.connected = true;

      // 基本情報を取得（Upstashの制限により限定的）
      const dbSize = await this.redis!.dbsize();
      stats.info = {
        dbSize,
        uptime: 'N/A (Upstash)',
        version: 'Upstash Redis'
      };

    } catch (error) {
      logger.error('❌ Failed to get cache stats:', error);
    }

    return stats;
  }

  /**
   * すべてのキャッシュをクリア（開発環境のみ）
   */
  async clearAllCache(): Promise<void> {
    if (!this.isEnabled()) return;
    
    if (process.env.NODE_ENV === 'production') {
      logger.warn('⚠️ Clear all cache is disabled in production');
      return;
    }

    try {
      await this.redis!.flushdb();
      logger.info('🗑️ All cache cleared');
    } catch (error) {
      logger.error('❌ Failed to clear all cache:', error);
    }
  }
}

// シングルトンインスタンス
export const performanceCache = new PerformanceCache();