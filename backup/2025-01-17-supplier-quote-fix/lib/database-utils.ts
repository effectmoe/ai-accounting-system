import { getSupabaseClient } from './supabase-singleton';

/**
 * Supabaseの更新を確実に行うユーティリティ
 */
export async function reliableUpdate(
  table: string,
  updates: Record<string, any>,
  condition: { column: string; value: any },
  maxRetries = 3
) {
  const supabase = getSupabaseClient();
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 更新を実行
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq(condition.column, condition.value)
        .select()
        .single();
      
      if (error) throw error;
      
      // 更新が反映されたか確認
      if (data) {
        for (const [key, value] of Object.entries(updates)) {
          if (data[key] !== value) {
            throw new Error(`Update not reflected: ${key}`);
          }
        }
        return { success: true, data };
      }
    } catch (error) {
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
export class OptimisticStateManager<T> {
  private localState: Map<string, T> = new Map();
  private pendingUpdates: Map<string, T> = new Map();
  
  constructor(private table: string) {}
  
  async update(id: string, updates: Partial<T>) {
    // 楽観的更新
    const current = this.localState.get(id) || {} as T;
    const updated = { ...current, ...updates };
    this.localState.set(id, updated);
    this.pendingUpdates.set(id, updated);
    
    // バックグラウンドで同期
    this.syncToServer(id, updates);
    
    return updated;
  }
  
  private async syncToServer(id: string, updates: Partial<T>) {
    const result = await reliableUpdate(
      this.table,
      updates,
      { column: 'id', value: id }
    );
    
    if (result.success) {
      this.pendingUpdates.delete(id);
    } else {
      // 同期失敗時の処理
      console.error('Sync failed for', id);
    }
  }
  
  get(id: string): T | undefined {
    return this.localState.get(id);
  }
  
  hasPendingUpdates(id: string): boolean {
    return this.pendingUpdates.has(id);
  }
}