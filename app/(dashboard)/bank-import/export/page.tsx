'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileSpreadsheet, FileJson, FileText, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

type ExportFormat = 'csv' | 'tsv' | 'json';
type MatchStatus = 'all' | 'matched' | 'unmatched';

interface ExportOptions {
  format: ExportFormat;
  startDate: string;
  endDate: string;
  bankType: string;
  matchStatus: MatchStatus;
  confirmedOnly: boolean;
}

export default function BankImportExportPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    startDate: '',
    endDate: '',
    bankType: '',
    matchStatus: 'all',
    confirmedOnly: false,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('format', options.format);

      if (options.startDate) {
        params.append('startDate', options.startDate);
      }
      if (options.endDate) {
        params.append('endDate', options.endDate);
      }
      if (options.bankType) {
        params.append('bankType', options.bankType);
      }
      if (options.matchStatus !== 'all') {
        params.append('matchStatus', options.matchStatus);
      }
      if (options.confirmedOnly) {
        params.append('confirmed', 'true');
      }

      const response = await fetch(`/api/bank-import/export?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'エクスポートに失敗しました');
      }

      // ファイルをダウンロード
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `bank_transactions.${options.format}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'エクスポート完了',
        description: `${filename} をダウンロードしました`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'エクスポートに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5" />;
      case 'tsv':
        return <FileText className="h-5 w-5" />;
      case 'json':
        return <FileJson className="h-5 w-5" />;
    }
  };

  const getFormatDescription = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return 'Excel、Googleスプレッドシートで開けます';
      case 'tsv':
        return 'タブ区切り形式。会計ソフトへの取り込みに便利';
      case 'json':
        return 'プログラムでの処理やAPI連携に最適';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bank-import">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">データエクスポート</h1>
          <p className="text-muted-foreground">銀行取引データを様々な形式でエクスポート</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* エクスポート形式 */}
        <Card>
          <CardHeader>
            <CardTitle>エクスポート形式</CardTitle>
            <CardDescription>ダウンロードするファイル形式を選択</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['csv', 'tsv', 'json'] as ExportFormat[]).map((format) => (
              <div
                key={format}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.format === format
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setOptions({ ...options, format })}
              >
                <div className={`p-2 rounded-lg ${options.format === format ? 'bg-primary/10' : 'bg-muted'}`}>
                  {getFormatIcon(format)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{format.toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground">{getFormatDescription(format)}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    options.format === format ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* フィルター条件 */}
        <Card>
          <CardHeader>
            <CardTitle>フィルター条件</CardTitle>
            <CardDescription>エクスポートするデータを絞り込み</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={options.startDate}
                  onChange={(e) => setOptions({ ...options, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">終了日</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={options.endDate}
                  onChange={(e) => setOptions({ ...options, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankType">銀行種別</Label>
              <Select
                value={options.bankType}
                onValueChange={(value) => setOptions({ ...options, bankType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="すべての銀行" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべての銀行</SelectItem>
                  <SelectItem value="netbank">住信SBIネット銀行</SelectItem>
                  <SelectItem value="rakuten">楽天銀行</SelectItem>
                  <SelectItem value="mufg">三菱UFJ銀行</SelectItem>
                  <SelectItem value="smbc">三井住友銀行</SelectItem>
                  <SelectItem value="mizuho">みずほ銀行</SelectItem>
                  <SelectItem value="paypay">PayPay銀行</SelectItem>
                  <SelectItem value="aeon">イオン銀行</SelectItem>
                  <SelectItem value="generic">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchStatus">マッチング状態</Label>
              <Select
                value={options.matchStatus}
                onValueChange={(value: MatchStatus) => setOptions({ ...options, matchStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="matched">マッチ済みのみ</SelectItem>
                  <SelectItem value="unmatched">未マッチのみ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="confirmedOnly"
                checked={options.confirmedOnly}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, confirmedOnly: checked === true })
                }
              />
              <Label htmlFor="confirmedOnly" className="cursor-pointer">
                確認済みの取引のみ
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* エクスポートボタン */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              選択した条件に一致する取引データをエクスポートします（最大10,000件）
            </div>
            <Button onClick={handleExport} disabled={isExporting} size="lg" className="min-w-[200px]">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  エクスポート中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  エクスポート
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ヘルプ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">エクスポート形式について</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <FileSpreadsheet className="h-4 w-4" />
                CSV形式
              </div>
              <p className="text-sm text-muted-foreground">
                カンマ区切り形式。Microsoft Excel、Googleスプレッドシート、Numbers
                など主要な表計算ソフトで直接開くことができます。
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4" />
                TSV形式
              </div>
              <p className="text-sm text-muted-foreground">
                タブ区切り形式。会計ソフトやデータベースへの取り込みに適しています。
                摘要にカンマが含まれる場合も安全に処理できます。
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <FileJson className="h-4 w-4" />
                JSON形式
              </div>
              <p className="text-sm text-muted-foreground">
                構造化データ形式。プログラムでの処理やAPI連携、
                他システムへのデータ移行に最適です。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
