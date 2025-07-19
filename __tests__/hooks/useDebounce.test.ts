import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useEffect } from 'react';

// デバウンスフックのシンプルな実装（テスト用）
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初期値を即座に返す', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('指定時間後に値を更新する', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // 値を更新
    rerender({ value: 'updated', delay: 500 });
    
    // まだ更新されていない
    expect(result.current).toBe('initial');
    
    // 500ms経過
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // 更新された
    expect(result.current).toBe('updated');
  });

  it('連続した更新では最後の値のみが反映される', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    // 連続して値を更新
    rerender({ value: 'update1', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    rerender({ value: 'update2', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    rerender({ value: 'update3', delay: 500 });
    
    // まだ更新されていない
    expect(result.current).toBe('initial');
    
    // 500ms経過
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // 最後の値が反映される
    expect(result.current).toBe('update3');
  });

  it('遅延時間を変更できる', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 },
      }
    );

    rerender({ value: 'updated', delay: 1000 });
    
    // 500ms経過（まだ更新されない）
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial');
    
    // さらに500ms経過（合計1000ms）
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });
});

// 検索機能でのデバウンス使用例のテスト
describe('検索機能でのデバウンス', () => {
  it('検索入力のデバウンスが正しく動作する', () => {
    const mockFetch = vi.fn();
    
    const { result } = renderHook(() => {
      const [searchTerm, setSearchTerm] = useState('');
      const debouncedSearchTerm = useDebounce(searchTerm, 500);
      
      useEffect(() => {
        if (debouncedSearchTerm) {
          mockFetch(debouncedSearchTerm);
        }
      }, [debouncedSearchTerm]);
      
      return { setSearchTerm, searchTerm, debouncedSearchTerm };
    });

    // 検索文字を入力
    act(() => {
      result.current.setSearchTerm('a');
    });
    
    expect(mockFetch).not.toHaveBeenCalled();
    
    act(() => {
      result.current.setSearchTerm('ab');
    });
    
    act(() => {
      result.current.setSearchTerm('abc');
    });
    
    // まだAPIは呼ばれていない
    expect(mockFetch).not.toHaveBeenCalled();
    
    // 500ms経過
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // 最終的な値でAPIが1回だけ呼ばれる
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('abc');
  });
});