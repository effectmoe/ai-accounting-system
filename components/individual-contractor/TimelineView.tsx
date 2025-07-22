'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, FileText, Wrench, TrendingUp } from 'lucide-react';
import { TransactionWithProject } from '@/types/tenant-collections';

interface TimelineViewProps {
  transactions: TransactionWithProject[];
}

export default function TimelineView({ transactions }: TimelineViewProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const balanceData = transactions.reduce((acc, transaction, index) => {
    const previousBalance = acc[index - 1]?.balance || 0;
    const balance = transaction.type === 'income' 
      ? previousBalance + transaction.amount
      : previousBalance - transaction.amount;
    
    acc.push({
      date: transaction.date,
      balance,
      transaction: transaction.description
    });
    
    return acc;
  }, [] as any[]);

  const filteredTransactions = transactions.filter(t => 
    filter === 'all' || t.type === filter
  );

  return (
    <div className="space-y-6">
      {/* 残高推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>残高推移</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`¥${Number(value).toLocaleString()}`, '残高']}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* フィルター */}
      <div className="flex gap-4 items-center">
        <span className="text-sm font-medium">表示:</span>
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            全て
          </Button>
          <Button 
            variant={filter === 'income' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('income')}
          >
            収入
          </Button>
          <Button 
            variant={filter === 'expense' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('expense')}
          >
            支出
          </Button>
        </div>
        <Button className="ml-auto" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          取引追加
        </Button>
      </div>

      {/* 取引タイムライン */}
      <div className="space-y-4">
        {filteredTransactions.map((transaction, index) => (
          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.category === 'material' && <Wrench className="h-4 w-4" />}
                    {transaction.category === 'revenue' && <TrendingUp className="h-4 w-4" />}
                    {!['material', 'revenue'].includes(transaction.category) && <FileText className="h-4 w-4" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{transaction.description}</h3>
                      {transaction.projectCode && (
                        <Badge variant="secondary">{transaction.projectCode}</Badge>
                      )}
                      {transaction.aiConfidence && transaction.aiConfidence > 0.9 && (
                        <Badge variant="outline" className="text-xs">AI: {Math.round(transaction.aiConfidence * 100)}%</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {transaction.date} • {transaction.vendor || '手動入力'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toLocaleString()}
                  </div>
                  {transaction.taxAmount && (
                    <div className="text-xs text-gray-500">
                      消費税: ¥{transaction.taxAmount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              
              {transaction.status && transaction.status !== 'completed' && (
                <div className="mt-2 flex gap-2">
                  <Badge variant={
                    transaction.status === 'pending' ? 'destructive' : 
                    transaction.status === 'processing' ? 'secondary' : 'default'
                  }>
                    {transaction.status === 'pending' && '未照合'}
                    {transaction.status === 'processing' && '処理中'}
                    {transaction.status === 'approved' && '承認済み'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}