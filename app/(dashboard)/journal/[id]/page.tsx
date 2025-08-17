'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, EditIcon, TrashIcon, PrinterIcon, Home, BookOpenCheck, Calendar, Hash, FileText } from 'lucide-react';
import { BalanceCheck } from '@/components/journals/BalanceCheck';
import { formatCurrency } from '@/lib/journal-utils';
import dynamic from 'next/dynamic';

// 動的インポートでJournalAIChatをクライアントサイドでのみ読み込む
const JournalAIChat = dynamic(
  () => import('@/components/journals/JournalAIChat'),
  { 
    ssr: false,
    loading: () => null
  }
);

interface JournalLine {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  taxRate?: number;
  taxAmount?: number;
  isTaxIncluded?: boolean;
}

interface JournalEntry {
  _id?: any;
  journalNumber: string;
  entryDate: string;
  description: string;
  status: string;
  lines: JournalLine[];
  sourceDocumentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function JournalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJournalDetail = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/journals/${id}`);
        const data = await response.json();
        
        if (data.success && data.journal) {
          setJournal(data.journal);
        } else {
          setError(data.error || '仕訳データの取得に失敗しました');
        }
      } catch (err) {
        console.error('Error fetching journal detail:', err);
        setError('ネットワークエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchJournalDetail();
  }, [id]);

  const handleEdit = () => {
    // TODO: 編集ページへの遷移
    console.log('Edit journal:', id);
  };

  const handleDelete = () => {
    // TODO: 削除確認ダイアログと削除処理
    console.log('Delete journal:', id);
  };

  const handlePrint = () => {
    // TODO: 印刷処理
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-gray-600">仕訳データを読み込んでいます...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !journal) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || '仕訳が見つかりませんでした'}</p>
              <Button onClick={() => router.push('/journal')}>仕訳一覧に戻る</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const debitTotal = journal.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const creditTotal = journal.lines.reduce((sum, line) => sum + line.creditAmount, 0);

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      {/* パンくずリスト */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Home className="w-4 h-4" />
        <span>/</span>
        <button 
          onClick={() => router.push('/journal')}
          className="hover:text-gray-900 transition-colors"
        >
          仕訳帳
        </button>
        <span>/</span>
        <span>{journal.journalNumber}</span>
      </div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/journal')}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpenCheck className="w-8 h-8 text-violet-600" />
            仕訳詳細
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {journal.sourceDocumentId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/documents/${journal.sourceDocumentId}`)}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
            >
              <FileText className="mr-2 h-4 w-4" />
              元の領収書を表示
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <EditIcon className="mr-2 h-4 w-4" />
            編集
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <TrashIcon className="mr-2 h-4 w-4" />
            削除
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <PrinterIcon className="mr-2 h-4 w-4" />
            印刷
          </Button>
        </div>
      </div>

      {/* 基本情報カード */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>基本情報</span>
            <span className={`text-sm px-3 py-1 rounded-full font-normal ${
              journal.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              journal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {journal.status === 'confirmed' ? '確定' : 
               journal.status === 'draft' ? '下書き' : journal.status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">仕訳番号</p>
                  <p className="font-medium">{journal.journalNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">取引日</p>
                  <p className="font-medium">
                    {new Date(journal.entryDate).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">摘要</p>
                  <p className="font-medium">{journal.description}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 貸借バランス */}
      <div className="mb-6">
        <BalanceCheck 
          debitTotal={debitTotal} 
          creditTotal={creditTotal}
          className="shadow-sm"
        />
      </div>

      {/* 明細行 */}
      <Card>
        <CardHeader>
          <CardTitle>仕訳明細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    勘定科目
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    借方金額
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    貸方金額
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    税率
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    税額
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {journal.lines.map((line, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {line.accountName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {line.accountCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {line.debitAmount > 0 ? (
                        <span className="text-blue-600 font-medium">
                          {formatCurrency(Math.round(line.debitAmount))}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {line.creditAmount > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(Math.round(line.creditAmount))}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                      {line.taxRate !== undefined ? (
                        <span className="text-gray-700">
                          {line.taxRate}%
                          {line.isTaxIncluded && (
                            <span className="text-xs text-gray-500 ml-1">(内税)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                      {line.taxAmount ? (
                        <span className="text-gray-700">
                          {formatCurrency(Math.round(line.taxAmount))}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    合計
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-blue-600 font-bold">
                      {formatCurrency(Math.round(debitTotal))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-600 font-bold">
                      {formatCurrency(Math.round(creditTotal))}
                    </span>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* AI チャットコンポーネント */}
      {journal && (
        <JournalAIChat 
          journal={journal} 
          journalId={id}
        />
      )}

      {/* タイムスタンプ */}
      {(journal.createdAt || journal.updatedAt) && (
        <div className="mt-6 text-sm text-gray-500 text-right">
          {journal.createdAt && (
            <p>作成日時: {new Date(journal.createdAt).toLocaleString('ja-JP')}</p>
          )}
          {journal.updatedAt && (
            <p>更新日時: {new Date(journal.updatedAt).toLocaleString('ja-JP')}</p>
          )}
        </div>
      )}
    </div>
  );
}