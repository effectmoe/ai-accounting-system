"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleCache = exports.cache = void 0;
exports.fetchWithCache = fetchWithCache;
exports.useCachedFetch = useCachedFetch;
class SimpleCache {
    cache = new Map();
    defaultTTL = 5 * 60 * 1000; // 5分
    set(key, data, ttl) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
        });
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        const now = Date.now();
        if (now - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }
    invalidate(pattern) {
        if (!pattern) {
            this.cache.clear();
            return;
        }
        // パターンにマッチするキーを削除
        const keysToDelete = [];
        this.cache.forEach((_, key) => {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }
    // キャッシュキーを生成
    static createKey(prefix, params) {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
            if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
                acc[key] = params[key];
            }
            return acc;
        }, {});
        return `${prefix}:${JSON.stringify(sortedParams)}`;
    }
}
exports.SimpleCache = SimpleCache;
// シングルトンインスタンス
exports.cache = new SimpleCache();
// キャッシュ付きフェッチ関数
async function fetchWithCache(key, fetcher, options) {
    // 強制リフレッシュまたはキャッシュチェック
    if (!options?.force) {
        const cached = exports.cache.get(key);
        if (cached) {
            logger_1.logger.debug(`[Cache] Hit: ${key}`);
            return cached;
        }
    }
    logger_1.logger.debug(`[Cache] Miss: ${key}`);
    try {
        const data = await fetcher();
        exports.cache.set(key, data, options?.ttl);
        return data;
    }
    catch (error) {
        // エラー時はキャッシュから古いデータを返す（あれば）
        const staleData = exports.cache.get(key);
        if (staleData) {
            logger_1.logger.debug(`[Cache] Returning stale data due to error: ${key}`);
            return staleData;
        }
        throw error;
    }
}
// React Hook: キャッシュを使用したデータフェッチ
const react_1 = require("react");
const logger_1 = require("@/lib/logger");
function useCachedFetch(keyPrefix, params, fetcher, options) {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const cacheKey = SimpleCache.createKey(keyPrefix, params);
    const fetchData = (0, react_1.useCallback)(async (force = false) => {
        if (options?.enabled === false)
            return;
        setLoading(true);
        setError(null);
        try {
            const result = await fetchWithCache(cacheKey, fetcher, { ttl: options?.ttl, force });
            setData(result);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        }
        finally {
            setLoading(false);
        }
    }, [cacheKey, fetcher, options?.ttl, options?.enabled]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    const refetch = (0, react_1.useCallback)((force = true) => {
        return fetchData(force);
    }, [fetchData]);
    return { data, loading, error, refetch };
}
