'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FileText, Download, Eye, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OCRDocument {
  id: string;
  file_name: string;
  vendor_name: string;
  receipt_date: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  confidence: number;
  file_url: string;
  created_at: string;
}

export default function DocumentListPage() {
  const [documents, setDocuments] = useState<OCRDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timer | null>(null);

  // ドキュメント一覧を取得
  const fetchDocuments = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('ocr_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // 新しいドキュメントがあるかチェック
      if (data && documents.length > 0 && data.length > documents.length) {
        const newDocs = data.length - documents.length;
        toast.success(`${newDocs}件の新しい書類が追加されました！`, {
          duration: 5000,
          icon: '📄',
        });
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('書類の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込みとポーリング設定
  useEffect(() => {
    fetchDocuments();

    // 10秒ごとに新しい書類をチェック
    const interval = setInterval(fetchDocuments, 10000);
    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // リアルタイムサブスクリプション
  useEffect(() => {
    const supabase = getSupabaseClient();
    
    const subscription = supabase
      .channel('ocr_results_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ocr_results'
        },
        (payload) => {
          console.log('新しい書類が追加されました:', payload);
          
          // 新しい書類を追加
          const newDoc = payload.new as OCRDocument;
          setDocuments(prev => [newDoc, ...prev]);
          
          // 通知を表示
          toast.success(
            <div>
              <p className="font-semibold">OCR処理が完了しました！</p>
              <p className="text-sm">{newDoc.file_name}</p>
              <p className="text-sm">ベンダー: {newDoc.vendor_name}</p>
              <p className="text-sm">金額: {formatCurrency(newDoc.total_amount)}</p>
            </div>,
            {
              duration: 8000,
              icon: '✅',
            }
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('この書類を削除してもよろしいですか？')) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('ocr_results')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('書類を削除しました');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('削除に失敗しました');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">書類一覧</h1>
        <p className="text-gray-600">
          OCR処理済みの書類一覧です。新しい書類は自動的に表示されます。
        </p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">まだ書類がありません</p>
            <p className="text-sm text-gray-500 mt-2">
              PDFファイルをアップロードすると、ここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {doc.file_name}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(doc.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status === 'completed' ? '完了' : doc.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">ベンダー</p>
                    <p className="font-semibold">{doc.vendor_name || '不明'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">日付</p>
                    <p className="font-semibold">
                      {doc.receipt_date ? format(new Date(doc.receipt_date), 'yyyy年MM月dd日', { locale: ja }) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">金額</p>
                    <p className="font-semibold text-lg">{formatCurrency(doc.total_amount)}</p>
                    {doc.tax_amount > 0 && (
                      <p className="text-sm text-gray-500">
                        (税額: {formatCurrency(doc.tax_amount)})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-600">信頼度: </span>
                    <span className={`font-semibold ${getConfidenceColor(doc.confidence)}`}>
                      {Math.round(doc.confidence * 100)}%
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {doc.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        表示
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: ダウンロード機能
                        toast.info('ダウンロード機能は準備中です');
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      ダウンロード
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}