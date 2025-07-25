"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimisticStateManager = void 0;
exports.reliableUpdate = reliableUpdate;
const supabase_singleton_1 = require("./supabase-singleton");
/**
 * Supabaseの更新を確実に行うユーティリティ
 */
async function reliableUpdate(table, updates, condition, maxRetries = 3) {
    const supabase = (0, supabase_singleton_1.getSupabaseClient)();
    for (let i = 0; i < maxRetries; i++) {
        try {
            // 更新を実行
            const { data, error } = await supabase
                .from(table)
                .update(updates)
                .eq(condition.column, condition.value)
                .select()
                .single();
            if (error)
                throw error;
            // 更新が反映されたか確認
            if (data) {
                for (const [key, value] of Object.entries(updates)) {
                    if (data[key] !== value) {
                        throw new Error(`Update not reflected: ${key}`);
                    }
                }
                return { success: true, data };
            }
        }
        catch (error) {
            console.error(`Update attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) {
                return { success: false, error };
            }
            // リトライ前に待機
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    return { success: false, error: 'Max retries exceeded' };
}
/**
 * 楽観的更新とサーバー同期を管理
 */
class OptimisticStateManager {
    table;
    localState = new Map();
    pendingUpdates = new Map();
    constructor(table) {
        this.table = table;
    }
    async update(id, updates) {
        // 楽観的更新
        const current = this.localState.get(id) || {};
        const updated = { ...current, ...updates };
        this.localState.set(id, updated);
        this.pendingUpdates.set(id, updated);
        // バックグラウンドで同期
        this.syncToServer(id, updates);
        return updated;
    }
    async syncToServer(id, updates) {
        const result = await reliableUpdate(this.table, updates, { column: 'id', value: id });
        if (result.success) {
            this.pendingUpdates.delete(id);
        }
        else {
            // 同期失敗時の処理
            console.error('Sync failed for', id);
        }
    }
    get(id) {
        return this.localState.get(id);
    }
    hasPendingUpdates(id) {
        return this.pendingUpdates.has(id);
    }
}
exports.OptimisticStateManager = OptimisticStateManager;
