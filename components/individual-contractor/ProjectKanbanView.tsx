'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Calendar, DollarSign } from 'lucide-react';
import { Project } from '@/types/tenant-collections';

interface ProjectKanbanViewProps {
  projects: Project[];
}

export default function ProjectKanbanView({ projects }: ProjectKanbanViewProps) {
  const statuses = [
    { id: 'estimate', name: '見積中', color: 'bg-blue-50 border-blue-200' },
    { id: 'active', name: '進行中', color: 'bg-orange-50 border-orange-200' },
    { id: 'review', name: '検収待ち', color: 'bg-purple-50 border-purple-200' },
    { id: 'completed', name: '完了', color: 'bg-green-50 border-green-200' }
  ];

  const groupedProjects = statuses.map(status => ({
    ...status,
    projects: projects.filter(p => p.status === status.id)
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">プロジェクト管理</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新規プロジェクト
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {groupedProjects.map(column => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{column.name}</h3>
              <Badge variant="secondary">{column.projects.length}</Badge>
            </div>

            <div className="space-y-3">
              {column.projects.map(project => (
                <Card key={project._id?.toString()} className={`${column.color} border-2 hover:shadow-md transition-shadow cursor-pointer`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium">{project.name}</CardTitle>
                        <p className="text-xs text-gray-600 mt-1">{project.client.name}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* 金額情報 */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">¥{project.contract.amount.toLocaleString()}</span>
                      </div>

                      {/* 進捗率（進行中プロジェクトのみ） */}
                      {project.status === 'active' && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>進捗</span>
                            <span>{project.progressPercentage}%</span>
                          </div>
                          <Progress value={project.progressPercentage} className="h-2" />
                        </div>
                      )}

                      {/* 期限情報 */}
                      {project.contract.endDate && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {project.status === 'estimate' ? '提出期限' : '完成予定'}: 
                            {new Date(project.contract.endDate).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      )}

                      {/* コスト情報（進行中・完了プロジェクト） */}
                      {(['active', 'review', 'completed'].includes(project.status)) && (
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span>材料費:</span>
                            <span>¥{project.costs.materials.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>外注費:</span>
                            <span>¥{project.costs.subcontract.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 font-medium">
                            <span>粗利:</span>
                            <span className={`${
                              (project.contract.amount - project.costs.materials - project.costs.subcontract - project.costs.other) > 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              ¥{(project.contract.amount - project.costs.materials - project.costs.subcontract - project.costs.other).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ステータス別のアクションボタン */}
                      <div className="pt-2">
                        {project.status === 'estimate' && (
                          <Button size="sm" variant="outline" className="w-full">
                            見積書作成
                          </Button>
                        )}
                        {project.status === 'active' && (
                          <Button size="sm" variant="outline" className="w-full">
                            工程管理
                          </Button>
                        )}
                        {project.status === 'review' && (
                          <Button size="sm" variant="outline" className="w-full">
                            請求書発行
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 新規追加ボタン */}
            <Button variant="dashed" className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {column.name}を追加
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}