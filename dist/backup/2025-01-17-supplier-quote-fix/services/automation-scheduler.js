"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = void 0;
class AutomationScheduler {
    tasks = [
        {
            id: 'ocr-receipts',
            name: 'レシート自動OCR処理',
            type: 'OCR処理',
            enabled: true,
            status: 'idle',
            schedule: {
                frequency: 'daily',
                time: '09:00'
            }
        },
        {
            id: 'invoice-generation',
            name: '請求書自動生成',
            type: '請求書処理',
            enabled: true,
            status: 'idle',
            schedule: {
                frequency: 'monthly',
                dayOfMonth: 25,
                time: '14:00'
            }
        },
        {
            id: 'tax-calculation',
            name: '税務計算',
            type: '税務処理',
            enabled: false,
            status: 'idle',
            schedule: {
                frequency: 'monthly',
                dayOfMonth: 10,
                time: '10:00'
            }
        },
        {
            id: 'report-generation',
            name: 'レポート生成',
            type: 'レポート',
            enabled: true,
            status: 'idle',
            schedule: {
                frequency: 'weekly',
                dayOfWeek: 1, // Monday
                time: '08:00'
            }
        },
        {
            id: 'backup-data',
            name: 'データバックアップ',
            type: 'バックアップ',
            enabled: true,
            status: 'idle',
            schedule: {
                frequency: 'daily',
                time: '02:00'
            }
        }
    ];
    getTasks() {
        return this.tasks;
    }
    getTask(id) {
        return this.tasks.find(task => task.id === id);
    }
    toggleTask(id, enabled) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.enabled = enabled;
            if (enabled) {
                this.calculateNextRun(task);
            }
            else {
                task.nextRun = undefined;
            }
        }
    }
    async runTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) {
            throw new Error('Task not found');
        }
        task.status = 'running';
        try {
            // シミュレーション用の遅延
            await new Promise(resolve => setTimeout(resolve, 2000));
            // ここで実際のタスク処理を実行
            switch (task.id) {
                case 'ocr-receipts':
                    console.log('OCR処理を実行中...');
                    break;
                case 'invoice-generation':
                    console.log('請求書生成を実行中...');
                    break;
                case 'tax-calculation':
                    console.log('税務計算を実行中...');
                    break;
                case 'report-generation':
                    console.log('レポート生成を実行中...');
                    break;
                case 'backup-data':
                    console.log('データバックアップを実行中...');
                    break;
            }
            task.status = 'completed';
            task.lastRun = new Date();
            this.calculateNextRun(task);
        }
        catch (error) {
            task.status = 'failed';
            throw error;
        }
    }
    calculateNextRun(task) {
        if (!task.enabled) {
            task.nextRun = undefined;
            return;
        }
        const now = new Date();
        const next = new Date();
        switch (task.schedule.frequency) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                if (task.schedule.dayOfMonth) {
                    next.setDate(task.schedule.dayOfMonth);
                }
                break;
            case 'on_demand':
                task.nextRun = undefined;
                return;
        }
        if (task.schedule.time) {
            const [hours, minutes] = task.schedule.time.split(':').map(Number);
            next.setHours(hours, minutes, 0, 0);
        }
        task.nextRun = next;
    }
}
exports.scheduler = new AutomationScheduler();
