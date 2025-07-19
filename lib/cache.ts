// シンプルなメモリキャッシュ実装
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5分

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // パターンにマッチするキーを削除
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // キャッシュキーを生成
  static createKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, any>);

    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }
}

// シングルトンインスタンス
export const cache = new SimpleCache();

// SimpleCache クラスもエクスポート
export { SimpleCache };

// キャッシュ付きフェッチ関数
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    force?: boolean;
  }
): Promise<T> {
  // 強制リフレッシュまたはキャッシュチェック
  if (!options?.force) {
    const cached = cache.get<T>(key);
    if (cached) {
      logger.debug(`[Cache] Hit: ${key}`);
      return cached;
    }
  }

  logger.debug(`[Cache] Miss: ${key}`);
  
  try {
    const data = await fetcher();
    cache.set(key, data, options?.ttl);
    return data;
  } catch (error) {
    // エラー時はキャッシュから古いデータを返す（あれば）
    const staleData = cache.get<T>(key);
    if (staleData) {
      logger.debug(`[Cache] Returning stale data due to error: ${key}`);
      return staleData;
    }
    throw error;
  }
}

// React Hook: キャッシュを使用したデータフェッチ
import { useState, useEffect, useCallback } from 'react';

import { logger } from '@/lib/logger';
interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
}

export function useCachedFetch<T>(
  keyPrefix: string,
  params: Record<string, any>,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    enabled?: boolean;
  }
): UseCachedFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = SimpleCache.createKey(keyPrefix, params);

  const fetchData = useCallback(async (force = false) => {
    if (options?.enabled === false) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchWithCache(
        cacheKey,
        fetcher,
        { ttl: options?.ttl, force }
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher, options?.ttl, options?.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback((force = true) => {
    return fetchData(force);
  }, [fetchData]);

  return { data, loading, error, refetch };
}