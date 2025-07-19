import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cache, SimpleCache, fetchWithCache } from '@/lib/cache';

describe('SimpleCache', () => {
  beforeEach(() => {
    // 各テストの前にキャッシュをクリア
    cache.invalidate();
  });

  describe('基本機能', () => {
    it('データを保存して取得できる', () => {
      const data = { id: 1, name: 'Test' };
      cache.set('test-key', data);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(data);
    });

    it('存在しないキーはnullを返す', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('TTLが過ぎたデータは取得できない', async () => {
      const data = { id: 1, name: 'Test' };
      cache.set('test-key', data, 100); // 100ms TTL
      
      // TTL内では取得可能
      expect(cache.get('test-key')).toEqual(data);
      
      // TTL後は取得不可
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('test-key')).toBeNull();
    });
  });

  describe('invalidate機能', () => {
    it('すべてのキャッシュをクリアできる', () => {
      cache.set('key1', { data: 1 });
      cache.set('key2', { data: 2 });
      cache.set('key3', { data: 3 });
      
      cache.invalidate();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('パターンマッチでキャッシュを削除できる', () => {
      cache.set('users:1', { id: 1 });
      cache.set('users:2', { id: 2 });
      cache.set('posts:1', { id: 1 });
      
      cache.invalidate('users');
      
      expect(cache.get('users:1')).toBeNull();
      expect(cache.get('users:2')).toBeNull();
      expect(cache.get('posts:1')).toEqual({ id: 1 });
    });
  });

  describe('createKey機能', () => {
    it('パラメータから一貫したキーを生成する', () => {
      const params1 = { page: 1, search: 'test', status: 'active' };
      const params2 = { status: 'active', page: 1, search: 'test' };
      
      const key1 = SimpleCache.createKey('prefix', params1);
      const key2 = SimpleCache.createKey('prefix', params2);
      
      expect(key1).toBe(key2);
    });

    it('undefined、空文字、nullの値は無視される', () => {
      const params = {
        page: 1,
        search: '',
        status: undefined,
        filter: null,
        valid: 'test'
      };
      
      const key = SimpleCache.createKey('prefix', params);
      const expected = 'prefix:{"page":1,"valid":"test"}';
      
      expect(key).toBe(expected);
    });
  });
});

describe('fetchWithCache', () => {
  beforeEach(() => {
    cache.invalidate();
  });

  it('初回はfetcherを呼び出す', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
    
    const result = await fetchWithCache('test-key', fetcher);
    
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'test' });
  });

  it('2回目はキャッシュから返す', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
    
    // 1回目
    await fetchWithCache('test-key', fetcher);
    // 2回目
    const result = await fetchWithCache('test-key', fetcher);
    
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'test' });
  });

  it('forceオプションでキャッシュを無視する', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
    
    // 1回目
    await fetchWithCache('test-key', fetcher);
    // 2回目（強制リフレッシュ）
    await fetchWithCache('test-key', fetcher, { force: true });
    
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('エラー時は古いキャッシュデータを返す', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ data: 'initial' })
      .mockRejectedValueOnce(new Error('Network error'));
    
    // 1回目（成功）
    await fetchWithCache('test-key', fetcher);
    
    // キャッシュを強制的に期限切れにする
    cache.set('test-key', { data: 'initial' }, -1);
    
    // 2回目（エラーだが古いデータを返す）
    const result = await fetchWithCache('test-key', fetcher);
    
    expect(result).toEqual({ data: 'initial' });
  });
});