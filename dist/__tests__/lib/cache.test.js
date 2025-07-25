"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cache_1 = require("@/lib/cache");
(0, vitest_1.describe)('SimpleCache', () => {
    (0, vitest_1.beforeEach)(() => {
        // 各テストの前にキャッシュをクリア
        cache_1.cache.invalidate();
    });
    (0, vitest_1.describe)('基本機能', () => {
        (0, vitest_1.it)('データを保存して取得できる', () => {
            const data = { id: 1, name: 'Test' };
            cache_1.cache.set('test-key', data);
            const retrieved = cache_1.cache.get('test-key');
            (0, vitest_1.expect)(retrieved).toEqual(data);
        });
        (0, vitest_1.it)('存在しないキーはnullを返す', () => {
            const retrieved = cache_1.cache.get('non-existent');
            (0, vitest_1.expect)(retrieved).toBeNull();
        });
        (0, vitest_1.it)('TTLが過ぎたデータは取得できない', async () => {
            const data = { id: 1, name: 'Test' };
            cache_1.cache.set('test-key', data, 100); // 100ms TTL
            // TTL内では取得可能
            (0, vitest_1.expect)(cache_1.cache.get('test-key')).toEqual(data);
            // TTL後は取得不可
            await new Promise(resolve => setTimeout(resolve, 150));
            (0, vitest_1.expect)(cache_1.cache.get('test-key')).toBeNull();
        });
    });
    (0, vitest_1.describe)('invalidate機能', () => {
        (0, vitest_1.it)('すべてのキャッシュをクリアできる', () => {
            cache_1.cache.set('key1', { data: 1 });
            cache_1.cache.set('key2', { data: 2 });
            cache_1.cache.set('key3', { data: 3 });
            cache_1.cache.invalidate();
            (0, vitest_1.expect)(cache_1.cache.get('key1')).toBeNull();
            (0, vitest_1.expect)(cache_1.cache.get('key2')).toBeNull();
            (0, vitest_1.expect)(cache_1.cache.get('key3')).toBeNull();
        });
        (0, vitest_1.it)('パターンマッチでキャッシュを削除できる', () => {
            cache_1.cache.set('users:1', { id: 1 });
            cache_1.cache.set('users:2', { id: 2 });
            cache_1.cache.set('posts:1', { id: 1 });
            cache_1.cache.invalidate('users');
            (0, vitest_1.expect)(cache_1.cache.get('users:1')).toBeNull();
            (0, vitest_1.expect)(cache_1.cache.get('users:2')).toBeNull();
            (0, vitest_1.expect)(cache_1.cache.get('posts:1')).toEqual({ id: 1 });
        });
    });
    (0, vitest_1.describe)('createKey機能', () => {
        (0, vitest_1.it)('パラメータから一貫したキーを生成する', () => {
            const params1 = { page: 1, search: 'test', status: 'active' };
            const params2 = { status: 'active', page: 1, search: 'test' };
            const key1 = cache_1.SimpleCache.createKey('prefix', params1);
            const key2 = cache_1.SimpleCache.createKey('prefix', params2);
            (0, vitest_1.expect)(key1).toBe(key2);
        });
        (0, vitest_1.it)('undefined、空文字、nullの値は無視される', () => {
            const params = {
                page: 1,
                search: '',
                status: undefined,
                filter: null,
                valid: 'test'
            };
            const key = cache_1.SimpleCache.createKey('prefix', params);
            const expected = 'prefix:{"page":1,"valid":"test"}';
            (0, vitest_1.expect)(key).toBe(expected);
        });
    });
});
(0, vitest_1.describe)('fetchWithCache', () => {
    (0, vitest_1.beforeEach)(() => {
        cache_1.cache.invalidate();
    });
    (0, vitest_1.it)('初回はfetcherを呼び出す', async () => {
        const fetcher = vitest_1.vi.fn().mockResolvedValue({ data: 'test' });
        const result = await (0, cache_1.fetchWithCache)('test-key', fetcher);
        (0, vitest_1.expect)(fetcher).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(result).toEqual({ data: 'test' });
    });
    (0, vitest_1.it)('2回目はキャッシュから返す', async () => {
        const fetcher = vitest_1.vi.fn().mockResolvedValue({ data: 'test' });
        // 1回目
        await (0, cache_1.fetchWithCache)('test-key', fetcher);
        // 2回目
        const result = await (0, cache_1.fetchWithCache)('test-key', fetcher);
        (0, vitest_1.expect)(fetcher).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(result).toEqual({ data: 'test' });
    });
    (0, vitest_1.it)('forceオプションでキャッシュを無視する', async () => {
        const fetcher = vitest_1.vi.fn().mockResolvedValue({ data: 'test' });
        // 1回目
        await (0, cache_1.fetchWithCache)('test-key', fetcher);
        // 2回目（強制リフレッシュ）
        await (0, cache_1.fetchWithCache)('test-key', fetcher, { force: true });
        (0, vitest_1.expect)(fetcher).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)('エラー時は古いキャッシュデータを返す', async () => {
        const fetcher = vitest_1.vi.fn()
            .mockResolvedValueOnce({ data: 'initial' })
            .mockRejectedValueOnce(new Error('Network error'));
        // 1回目（成功）
        await (0, cache_1.fetchWithCache)('test-key', fetcher);
        // キャッシュを強制的に期限切れにする
        cache_1.cache.set('test-key', { data: 'initial' }, -1);
        // 2回目（エラーだが古いデータを返す）
        const result = await (0, cache_1.fetchWithCache)('test-key', fetcher);
        (0, vitest_1.expect)(result).toEqual({ data: 'initial' });
    });
});
