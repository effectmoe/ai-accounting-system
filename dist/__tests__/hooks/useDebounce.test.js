"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const react_2 = require("react");
// デバウンスフックのシンプルな実装（テスト用）
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = (0, react_2.useState)(value);
    (0, react_2.useEffect)(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
(0, vitest_1.describe)('useDebounce', () => {
    beforeEach(() => {
        vitest_1.vi.useFakeTimers();
    });
    afterEach(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('初期値を即座に返す', () => {
        const { result } = (0, react_1.renderHook)(() => useDebounce('initial', 500));
        (0, vitest_1.expect)(result.current).toBe('initial');
    });
    (0, vitest_1.it)('指定時間後に値を更新する', () => {
        const { result, rerender } = (0, react_1.renderHook)(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });
        (0, vitest_1.expect)(result.current).toBe('initial');
        // 値を更新
        rerender({ value: 'updated', delay: 500 });
        // まだ更新されていない
        (0, vitest_1.expect)(result.current).toBe('initial');
        // 500ms経過
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(500);
        });
        // 更新された
        (0, vitest_1.expect)(result.current).toBe('updated');
    });
    (0, vitest_1.it)('連続した更新では最後の値のみが反映される', () => {
        const { result, rerender } = (0, react_1.renderHook)(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });
        // 連続して値を更新
        rerender({ value: 'update1', delay: 500 });
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(200);
        });
        rerender({ value: 'update2', delay: 500 });
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(200);
        });
        rerender({ value: 'update3', delay: 500 });
        // まだ更新されていない
        (0, vitest_1.expect)(result.current).toBe('initial');
        // 500ms経過
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(500);
        });
        // 最後の値が反映される
        (0, vitest_1.expect)(result.current).toBe('update3');
    });
    (0, vitest_1.it)('遅延時間を変更できる', () => {
        const { result, rerender } = (0, react_1.renderHook)(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 1000 },
        });
        rerender({ value: 'updated', delay: 1000 });
        // 500ms経過（まだ更新されない）
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(500);
        });
        (0, vitest_1.expect)(result.current).toBe('initial');
        // さらに500ms経過（合計1000ms）
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(500);
        });
        (0, vitest_1.expect)(result.current).toBe('updated');
    });
});
// 検索機能でのデバウンス使用例のテスト
(0, vitest_1.describe)('検索機能でのデバウンス', () => {
    (0, vitest_1.it)('検索入力のデバウンスが正しく動作する', () => {
        const mockFetch = vitest_1.vi.fn();
        const { result } = (0, react_1.renderHook)(() => {
            const [searchTerm, setSearchTerm] = (0, react_2.useState)('');
            const debouncedSearchTerm = useDebounce(searchTerm, 500);
            (0, react_2.useEffect)(() => {
                if (debouncedSearchTerm) {
                    mockFetch(debouncedSearchTerm);
                }
            }, [debouncedSearchTerm]);
            return { setSearchTerm, searchTerm, debouncedSearchTerm };
        });
        // 検索文字を入力
        (0, react_1.act)(() => {
            result.current.setSearchTerm('a');
        });
        (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        (0, react_1.act)(() => {
            result.current.setSearchTerm('ab');
        });
        (0, react_1.act)(() => {
            result.current.setSearchTerm('abc');
        });
        // まだAPIは呼ばれていない
        (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        // 500ms経過
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(500);
        });
        // 最終的な値でAPIが1回だけ呼ばれる
        (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('abc');
    });
});
