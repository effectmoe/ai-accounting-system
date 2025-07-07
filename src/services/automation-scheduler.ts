import { getSupabaseClient } from '@/lib/supabase-singleton';

const supabase = getSupabaseClient();

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'document_processing' | 'report_generation' | 'tax_calculation' | 'data_sync';
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
    time?: string; // HH:MM format
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
  };
  config: any;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export class AutomationScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private apiUrl: string;

  constructor(apiUrl: string = '/api/orchestrator') {
    this.apiUrl = apiUrl;
    this.initializeDefaultTasks();
  }

  // デフォルトタスクの初期化
  private initializeDefaultTasks() {
    // 日次OCR処理タスク
    this.addTask({
      id: 'daily-ocr-processing',
      name: '日次領収書処理',
      type: 'document_processing',
      schedule: {
        frequency: 'daily',
        time: '09:00',
      },
      config: {
        source: 'google_drive',
        autoSave: true,
        autoDeployReport: false,
      },
      enabled: true,
      status: 'idle',
    });

    // 週次レポート生成
    this.addTask({
      id: 'weekly-expense-report',
      name: '週次経費レポート',
      type: 'report_generation',
      schedule: {
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        time: '10:00',
      },
      config: {
        reportType: 'expense_summary',
        period: 'last_week',
      },
      enabled: true,
      status: 'idle',
    });

    // 月次税務計算
    this.addTask({
      id: 'monthly-tax-calculation',
      name: '月次税務計算',
      type: 'tax_calculation',
      schedule: {
        frequency: 'monthly',
        dayOfMonth: 5,
        time: '14:00',
      },
      config: {
        calculateType: 'consumption_tax',
        period: 'last_month',
      },
      enabled: true,
      status: 'idle',
    });
  }

  // タスクの追加
  addTask(task: ScheduledTask) {
    this.tasks.set(task.id, task);
    if (task.enabled) {
      this.scheduleTask(task);
    }
  }

  // タスクのスケジューリング
  private scheduleTask(task: ScheduledTask) {
    // 既存のインターバルをクリア
    const existingInterval = this.intervals.get(task.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 次回実行時刻を計算
    const nextRun = this.calculateNextRun(task.schedule);
    task.nextRun = nextRun;

    // インターバルを設定（1分ごとにチェック）
    const interval = setInterval(() => {
      const now = new Date();
      if (task.nextRun && now >= task.nextRun && task.enabled) {
        this.executeTask(task);
      }
    }, 60000); // 1分ごと

    this.intervals.set(task.id, interval);
  }

  // 次回実行時刻の計算
  private calculateNextRun(schedule: ScheduledTask['schedule']): Date {
    const now = new Date();
    const next = new Date();

    switch (schedule.frequency) {
      case 'daily':
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }
        }
        break;

      case 'weekly':
        if (schedule.dayOfWeek !== undefined && schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          const daysUntilNext = (schedule.dayOfWeek - now.getDay() + 7) % 7 || 7;
          next.setDate(now.getDate() + daysUntilNext);
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) {
            next.setDate(next.getDate() + 7);
          }
        }
        break;

      case 'monthly':
        if (schedule.dayOfMonth && schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setDate(schedule.dayOfMonth);
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) {
            next.setMonth(next.getMonth() + 1);
          }
        }
        break;
    }

    return next;
  }

  // タスクの実行
  private async executeTask(task: ScheduledTask) {
    console.log(`🚀 Executing scheduled task: ${task.name}`);
    task.status = 'running';
    task.lastRun = new Date();

    try {
      let result;

      switch (task.type) {
        case 'document_processing':
          result = await this.executeDocumentProcessing(task.config);
          break;
        case 'report_generation':
          result = await this.executeReportGeneration(task.config);
          break;
        case 'tax_calculation':
          result = await this.executeTaxCalculation(task.config);
          break;
        case 'data_sync':
          result = await this.executeDataSync(task.config);
          break;
      }

      task.status = 'completed';
      task.nextRun = this.calculateNextRun(task.schedule);
      
      // 実行結果をログに保存
      await this.logTaskExecution(task, result, true);
      
      console.log(`✅ Task completed: ${task.name}`);
    } catch (error: any) {
      task.status = 'failed';
      console.error(`❌ Task failed: ${task.name}`, error);
      
      // エラーをログに保存
      await this.logTaskExecution(task, error.message, false);
    }
  }

  // ドキュメント処理の実行
  private async executeDocumentProcessing(config: any) {
    // Google Driveから未処理ファイルを取得
    const unprocessedFiles = await this.getUnprocessedFiles(config.source);
    
    const results = [];
    for (const file of unprocessedFiles) {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: 'document_processing',
          input: {
            fileId: file.id,
            fileName: file.name,
            fileType: file.mimeType.includes('pdf') ? 'pdf' : 'image',
            autoSave: config.autoSave,
            autoDeployReport: config.autoDeployReport,
          },
        }),
      });
      
      const result = await response.json();
      results.push(result);
    }
    
    return {
      processed: results.length,
      results,
    };
  }

  // レポート生成の実行
  private async executeReportGeneration(config: any) {
    // 期間のデータを取得
    const { data: receipts } = await supabase
      .from('processed_receipts')
      .select('*')
      .order('receipt_date', { ascending: false });

    // レポート生成エージェントを呼び出し
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'ui',
        input: {
          operation: 'generate_report',
          reportType: config.reportType,
          data: receipts,
          period: config.period,
        },
      }),
    });

    return await response.json();
  }

  // 税務計算の実行
  private async executeTaxCalculation(config: any) {
    // 期間の取引データを取得
    const { data: transactions } = await supabase
      .from('processed_receipts')
      .select('*')
      .order('receipt_date', { ascending: false });

    // 税務計算エージェントを呼び出し
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'japan-tax',
        input: {
          operation: 'calculate_period_tax',
          transactions,
          calculateType: config.calculateType,
          period: config.period,
        },
      }),
    });

    return await response.json();
  }

  // データ同期の実行
  private async executeDataSync(config: any) {
    // データベース間の同期処理
    return { synced: true };
  }

  // 未処理ファイルの取得
  private async getUnprocessedFiles(source: string) {
    // TODO: Google Drive APIを使用して未処理ファイルを取得
    return [];
  }

  // タスク実行ログの保存
  private async logTaskExecution(task: ScheduledTask, result: any, success: boolean) {
    try {
      await supabase.from('task_execution_logs').insert({
        task_id: task.id,
        task_name: task.name,
        task_type: task.type,
        executed_at: new Date().toISOString(),
        success,
        result: JSON.stringify(result),
      });
    } catch (error) {
      console.error('Failed to log task execution:', error);
    }
  }

  // 手動実行
  async runTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    await this.executeTask(task);
  }

  // タスクの有効/無効切り替え
  toggleTask(taskId: string, enabled: boolean) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    task.enabled = enabled;
    
    if (enabled) {
      this.scheduleTask(task);
    } else {
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(taskId);
      }
    }
  }

  // タスク一覧の取得
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  // タスクの取得
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  // クリーンアップ
  cleanup() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

// シングルトンインスタンス
export const scheduler = new AutomationScheduler();
export default scheduler;