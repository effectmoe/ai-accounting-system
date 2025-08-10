'use client';

import { useState, useEffect } from 'react';
import { scheduler, ScheduledTask } from '@/services/automation-scheduler';

export default function AutomationPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [isRunning, setIsRunning] = useState<{ [key: string]: boolean }>({});
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // タスクの初期読み込み
    loadTasks();
    
    // 10秒ごとに状態を更新
    const interval = setInterval(loadTasks, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadTasks = () => {
    const allTasks = scheduler.getTasks();
    setTasks(allTasks);
  };

  const handleToggleTask = (taskId: string, enabled: boolean) => {
    scheduler.toggleTask(taskId, enabled);
    loadTasks();
  };

  const handleRunTask = async (taskId: string) => {
    setIsRunning(prev => ({ ...prev, [taskId]: true }));
    
    try {
      await scheduler.runTask(taskId);
      alert('タスクを実行しました');
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    } finally {
      setIsRunning(prev => ({ ...prev, [taskId]: false }));
      loadTasks();
    }
  };

  const formatSchedule = (schedule: ScheduledTask['schedule']) => {
    switch (schedule.frequency) {
      case 'daily':
        return `毎日 ${schedule.time}`;
      case 'weekly':
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return `毎週${days[schedule.dayOfWeek || 0]}曜日 ${schedule.time}`;
      case 'monthly':
        return `毎月${schedule.dayOfMonth}日 ${schedule.time}`;
      case 'on_demand':
        return '手動実行のみ';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ja-JP');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">自動化タスク管理</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Mastra自動駆動システム</h2>
        <p className="text-gray-600 mb-4">
          以下のタスクが自動的に実行されます。各タスクの有効/無効を切り替えたり、手動で実行することができます。
        </p>
        
        <div className="grid gap-4">
          {tasks.map(task => (
            <div key={task.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-medium">{task.name}</h3>
                  <p className="text-sm text-gray-500">
                    スケジュール: {formatSchedule(task.schedule)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={task.enabled}
                      onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                      className="mr-2"
                    />
                    有効
                  </label>
                  <button
                    onClick={() => handleRunTask(task.id)}
                    disabled={isRunning[task.id]}
                    className={`px-4 py-2 rounded ${
                      isRunning[task.id]
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isRunning[task.id] ? '実行中...' : '今すぐ実行'}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">種類:</span> {task.type}
                </div>
                <div>
                  <span className="text-gray-500">状態:</span>{' '}
                  <span className={`font-medium ${
                    task.status === 'completed' ? 'text-green-600' :
                    task.status === 'failed' ? 'text-red-600' :
                    task.status === 'running' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">次回実行:</span>{' '}
                  {formatDate(task.nextRun)}
                </div>
              </div>
              
              {task.lastRun && (
                <div className="mt-2 text-sm text-gray-500">
                  最終実行: {formatDate(task.lastRun)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">システム状態</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded p-4">
            <div className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.enabled).length}
            </div>
            <div className="text-sm text-gray-600">有効なタスク</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">完了</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {tasks.filter(t => t.status === 'running').length}
            </div>
            <div className="text-sm text-gray-600">実行中</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-2xl font-bold text-red-600">
              {tasks.filter(t => t.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-600">失敗</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">エージェント接続状態</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              OCRエージェント
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              会計エージェント
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              税務エージェント
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              データベースエージェント
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              顧客管理エージェント
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              商品管理エージェント
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              UIエージェント
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              NLWebエージェント
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}