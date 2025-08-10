'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface MatchResult {
  date: string;
  content: string;
  amount: number;
  customerName?: string;
  matchedInvoice?: {
    _id: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: number;
    remainingAmount: number;
  };
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchReason?: string;
}

export default function BankImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoMatch, setAutoMatch] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [onlyHighConfidence, setOnlyHighConfidence] = useState(true);
  
  const [parseResult, setParseResult] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
    } else {
      setErrors(['CSVファイルを選択してください']);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoMatch', autoMatch.toString());
      formData.append('autoConfirm', autoConfirm.toString());
      formData.append('onlyHighConfidence', onlyHighConfidence.toString());

      const response = await fetch('/api/bank-import/csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'CSVインポートに失敗しました');
      }

      setParseResult(data.parseResult);
      setMatchResults(data.matchResults || []);
      setImportResult(data.importResult);
      
      if (data.parseResult.errors?.length > 0) {
        setErrors(data.parseResult.errors);
      }

      logger.info('CSV import successful', data);
    } catch (error) {
      logger.error('CSV import error:', error);
      setErrors([error instanceof Error ? error.message : 'CSVインポートに失敗しました']);
    } finally {
      setIsUploading(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const configs = {
      high: { color: 'bg-green-100 text-green-800 border-green-200', label: '高' },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: '中' },
      low: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: '低' },
      none: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'なし' },
    };
    const config = configs[confidence as keyof typeof configs] || configs.none;
    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">銀行取引インポート</h1>
        <p className="text-gray-600 mt-2">住信SBIネット銀行のCSVファイルから入金データを取り込みます</p>
      </div>

      {/* アップロードエリア */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>CSVファイルのアップロード</CardTitle>
          <CardDescription>
            住信SBIネット銀行からダウンロードした入出金明細CSVファイルを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-2">
                <FileText className="mx-auto h-12 w-12 text-blue-600" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-600">
                  サイズ: {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  ファイルを変更
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-600">
                  ファイルをドラッグ&ドロップ、または
                </p>
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>ファイルを選択</span>
                  </Button>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>

          {/* オプション */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoMatch"
                checked={autoMatch}
                onCheckedChange={(checked) => setAutoMatch(checked as boolean)}
              />
              <label
                htmlFor="autoMatch"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                請求書と自動マッチング
              </label>
            </div>
            
            {autoMatch && (
              <>
                <div className="flex items-center space-x-2 ml-6">
                  <Checkbox
                    id="autoConfirm"
                    checked={autoConfirm}
                    onCheckedChange={(checked) => setAutoConfirm(checked as boolean)}
                  />
                  <label
                    htmlFor="autoConfirm"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    マッチした入金を自動確認
                  </label>
                </div>
                
                {autoConfirm && (
                  <div className="flex items-center space-x-2 ml-12">
                    <Checkbox
                      id="onlyHighConfidence"
                      checked={onlyHighConfidence}
                      onCheckedChange={(checked) => setOnlyHighConfidence(checked as boolean)}
                    />
                    <label
                      htmlFor="onlyHighConfidence"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      高信頼度のマッチングのみ自動確認
                    </label>
                  </div>
                )}
              </>
            )}
          </div>

          {/* アップロードボタン */}
          <div className="mt-6">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  インポート中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  インポート開始
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* パース結果 */}
      {parseResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>インポート結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">取引件数</span>
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold mt-2">{parseResult.totalCount}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">入金件数</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold mt-2 text-green-600">
                  {parseResult.depositCount}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ¥{parseResult.totalDepositAmount?.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">出金件数</span>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-2xl font-bold mt-2 text-red-600">
                  {parseResult.withdrawalCount}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ¥{parseResult.totalWithdrawalAmount?.toLocaleString()}
                </p>
              </div>
              
              {importResult && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">登録済み</span>
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold mt-2 text-blue-600">
                    {importResult.created}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    スキップ: {importResult.skipped}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* マッチング結果 */}
      {matchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>マッチング結果</CardTitle>
            <CardDescription>
              入金取引と請求書の自動マッチング結果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>取引内容</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>マッチした請求書</TableHead>
                  <TableHead>信頼度</TableHead>
                  <TableHead>理由</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(result.date), 'yyyy/MM/dd', { locale: ja })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {result.content}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ¥{result.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {result.matchedInvoice ? (
                        <div>
                          <p className="font-medium">{result.matchedInvoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">
                            {result.matchedInvoice.customerName}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">マッチなし</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(result.confidence)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {result.matchReason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}