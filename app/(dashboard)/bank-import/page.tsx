'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Search,
  FileSpreadsheet,
  Building2,
  Landmark,
  Copy,
  Save,
  AlertTriangle,
  History,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface BankOption {
  type: string;
  code: string;
  name: string;
  nameEn: string;
}

interface MatchResult {
  date: string;
  content: string;
  amount: number;
  customerName?: string;
  referenceNumber?: string;
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

interface AccountInfo {
  BANKID?: string;
  ACCTID?: string;
  ACCTTYPE?: string;
}

interface DuplicateTransaction {
  date: string;
  content: string;
  amount: number;
  existingImportDate?: string;
  existingFileName?: string;
}

interface DuplicateCheckResult {
  totalChecked: number;
  duplicateCount: number;
  newTransactionCount: number;
  duplicateTransactions: DuplicateTransaction[];
}

interface TransactionImportResult {
  success: boolean;
  created: number;
  skipped: number;
  duplicates: number;
  errors: string[];
}

export default function BankImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoMatch, setAutoMatch] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [onlyHighConfidence, setOnlyHighConfidence] = useState(true);
  const [saveTransactions, setSaveTransactions] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [parseResult, setParseResult] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileType, setFileType] = useState<'csv' | 'ofx' | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [bankType, setBankType] = useState<string>('auto');
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [detectedBank, setDetectedBank] = useState<{ type: string; name: string } | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [transactionImportResult, setTransactionImportResult] = useState<TransactionImportResult | null>(null);
  const [importId, setImportId] = useState<string | null>(null);

  // 対応銀行一覧を取得
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/bank-import/banks');
        const data = await response.json();
        if (data.success) {
          setBanks(data.banks);
        }
      } catch (error) {
        logger.error('Failed to fetch banks', error);
      }
    };
    fetchBanks();
  }, []);

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
    const fileName = droppedFile?.name.toLowerCase() || '';
    const isValidFile = droppedFile && (
      droppedFile.type === 'text/csv' ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.ofx') ||
      fileName.endsWith('.qfx')
    );

    if (isValidFile) {
      setFile(droppedFile);
      setErrors([]);
    } else {
      setErrors(['CSVまたはOFXファイルを選択してください']);
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
    setFileType(null);
    setAccountInfo(null);
    setDetectedBank(null);
    setDuplicateCheck(null);
    setTransactionImportResult(null);
    setImportId(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('autoMatch', autoMatch.toString());
      formData.append('autoConfirm', autoConfirm.toString());
      formData.append('onlyHighConfidence', onlyHighConfidence.toString());
      formData.append('bankType', bankType);
      formData.append('saveTransactions', saveTransactions.toString());
      formData.append('skipDuplicates', skipDuplicates.toString());

      // 統合エンドポイントを使用（CSV/OFX自動判定）
      const response = await fetch('/api/bank-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ファイルインポートに失敗しました');
      }

      setParseResult(data.parseResult);
      setMatchResults(data.matchResults || []);
      setImportResult(data.importResult);
      setFileType(data.fileType);

      // 検出された銀行情報を設定
      if (data.detectedBank && data.bankInfo) {
        setDetectedBank({ type: data.detectedBank, name: data.bankInfo.name });
      }

      // OFXの場合、口座情報を設定
      if (data.parseResult.accountInfo) {
        setAccountInfo(data.parseResult.accountInfo);
      }

      // 重複チェック結果を設定
      if (data.duplicateCheck) {
        setDuplicateCheck(data.duplicateCheck);
      }

      // 取引インポート結果を設定
      if (data.transactionImportResult) {
        setTransactionImportResult(data.transactionImportResult);
      }

      // インポートIDを設定
      if (data.importId) {
        setImportId(data.importId);
      }

      if (data.parseResult.errors?.length > 0) {
        setErrors(data.parseResult.errors);
      }

      logger.info('Bank import successful', { fileType: data.fileType, detectedBank: data.detectedBank, ...data });
    } catch (error) {
      logger.error('Bank import error:', error);
      setErrors([error instanceof Error ? error.message : 'ファイルインポートに失敗しました']);
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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">銀行取引インポート</h1>
          <p className="text-gray-600 mt-2">
            銀行のCSVまたはOFXファイルから入金データを取り込みます
          </p>
          <div className="mt-2 flex gap-2">
            <Badge variant="outline" className="text-xs">
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              CSV対応
            </Badge>
            <Badge variant="outline" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              OFX/QFX対応
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/bank-import/matching">
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              手動マッチング
            </Button>
          </Link>
          <Link href="/bank-import/scheduled">
            <Button variant="outline">
              <ArrowRight className="h-4 w-4 mr-2" />
              定期インポート
            </Button>
          </Link>
          <Link href="/bank-import/history">
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              インポート履歴
            </Button>
          </Link>
          <Link href="/bank-import/export">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              エクスポート
            </Button>
          </Link>
        </div>
      </div>

      {/* アップロードエリア */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>銀行データファイルのアップロード</CardTitle>
          <CardDescription>
            住信SBIネット銀行からダウンロードした入出金明細ファイル（CSV/OFX/QFX）を選択してください
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
                  accept=".csv,.ofx,.qfx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-gray-500 mt-2">
                  対応形式: CSV, OFX, QFX
                </p>
              </div>
            )}
          </div>

          {/* 銀行選択 */}
          <div className="mt-6">
            <label className="text-sm font-medium mb-2 block">
              <Landmark className="inline-block w-4 h-4 mr-1" />
              銀行を選択（CSVの場合）
            </label>
            <Select value={bankType} onValueChange={setBankType}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="銀行を選択..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自動判定</SelectItem>
                {banks.map((bank) => (
                  <SelectItem key={bank.type} value={bank.type}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              CSVファイルの場合、銀行を選択するか「自動判定」で自動検出します
            </p>
          </div>

          {/* オプション */}
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">インポートオプション</p>

            {/* 取引保存オプション */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveTransactions"
                checked={saveTransactions}
                onCheckedChange={(checked) => setSaveTransactions(checked as boolean)}
              />
              <label
                htmlFor="saveTransactions"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <Save className="inline-block w-4 h-4 mr-1" />
                取引をデータベースに保存
              </label>
            </div>

            {saveTransactions && (
              <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                />
                <label
                  htmlFor="skipDuplicates"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <Copy className="inline-block w-4 h-4 mr-1" />
                  重複する取引をスキップ
                </label>
              </div>
            )}

            {/* マッチングオプション */}
            <div className="flex items-center space-x-2 mt-4">
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
            <CardTitle className="flex items-center gap-2">
              インポート結果
              {fileType && (
                <Badge variant="secondary" className="ml-2">
                  {fileType.toUpperCase()}
                </Badge>
              )}
              {detectedBank && (
                <Badge variant="outline" className="ml-2">
                  <Landmark className="h-3 w-3 mr-1" />
                  {detectedBank.name}
                </Badge>
              )}
            </CardTitle>
            {accountInfo && (
              <CardDescription className="flex items-center gap-2 mt-2">
                <Building2 className="h-4 w-4" />
                口座: {accountInfo.BANKID && `銀行コード ${accountInfo.BANKID}`}
                {accountInfo.ACCTID && ` / 口座番号 ****${accountInfo.ACCTID.slice(-4)}`}
                {accountInfo.ACCTTYPE && ` (${accountInfo.ACCTTYPE})`}
              </CardDescription>
            )}
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

      {/* 重複チェック結果 */}
      {duplicateCheck && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              重複チェック結果
            </CardTitle>
            <CardDescription>
              インポート済みの取引との重複チェック結果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">チェック件数</span>
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold mt-2">{duplicateCheck.totalChecked}</p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">重複</span>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold mt-2 text-yellow-600">
                  {duplicateCheck.duplicateCount}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">新規取引</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold mt-2 text-green-600">
                  {duplicateCheck.newTransactionCount}
                </p>
              </div>
            </div>

            {/* 重複取引のリスト */}
            {duplicateCheck.duplicateTransactions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">重複取引一覧</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>取引内容</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>既存インポート日</TableHead>
                      <TableHead>ファイル名</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicateCheck.duplicateTransactions.map((dup, index) => (
                      <TableRow key={index} className="bg-yellow-50/50">
                        <TableCell>
                          {dup.date ? format(new Date(dup.date), 'yyyy/MM/dd', { locale: ja }) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {dup.content}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ¥{dup.amount?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {dup.existingImportDate
                            ? format(new Date(dup.existingImportDate), 'yyyy/MM/dd HH:mm', { locale: ja })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {dup.existingFileName || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {duplicateCheck.duplicateCount > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ※ 他 {duplicateCheck.duplicateCount - 10} 件の重複があります
                  </p>
                )}
              </div>
            )}

            {/* 取引インポート結果 */}
            {transactionImportResult && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  <Save className="inline-block h-4 w-4 mr-1" />
                  データベース保存結果
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{transactionImportResult.created}</p>
                    <p className="text-xs text-gray-600">新規保存</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-yellow-600">{transactionImportResult.skipped}</p>
                    <p className="text-xs text-gray-600">スキップ</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-600">{transactionImportResult.duplicates}</p>
                    <p className="text-xs text-gray-600">重複</p>
                  </div>
                </div>
                {transactionImportResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    エラー: {transactionImportResult.errors.join(', ')}
                  </div>
                )}
              </div>
            )}
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