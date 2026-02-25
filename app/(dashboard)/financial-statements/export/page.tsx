'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, CheckCircle, AlertTriangle, Send, Loader2 } from 'lucide-react';

interface ValidationResult {
  total: number;
  mapped: number;
  unmapped: { accountCode: string; accountName: string }[];
}

interface ShinkokuStatus {
  installed: boolean;
  version?: string;
  dbInitialized: boolean;
}

export default function ShinkokuExportPage() {
  const currentYear = new Date().getMonth() >= 3
    ? new Date().getFullYear()
    : new Date().getFullYear() - 1;

  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [shinkokuStatus, setShinkokuStatus] = useState<ShinkokuStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // 勘定科目マッピング検証
  const loadValidation = useCallback(async () => {
    try {
      const res = await fetch('/api/financial-statements/validate-accounts');
      const json = await res.json();
      if (json.success) setValidation(json.data);
    } catch { /* ignore */ }
  }, []);

  // shinkokuステータス確認
  const loadShinkokuStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/shinkoku');
      const json = await res.json();
      if (json.success) setShinkokuStatus(json.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadValidation();
    loadShinkokuStatus();
  }, [loadValidation, loadShinkokuStatus]);

  // ファイルダウンロード
  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fiscalYear: String(fiscalYear),
        format,
        download: 'true',
      });
      const res = await fetch(`/api/financial-statements/export/shinkoku?${params}`);

      if (format === 'csv') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shinkoku_export_${fiscalYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shinkoku_export_${fiscalYear}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      alert('ダウンロードに失敗しました: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // shinkokuへ直接送信
  const handleSendToShinkoku = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/shinkoku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          fiscalYear,
          companyId: 'all',
        }),
      });
      const json = await res.json();
      setSendResult({
        success: json.success,
        message: json.success
          ? 'shinkokuへのデータ送信が完了しました'
          : json.data?.error || 'エラーが発生しました',
      });
    } catch (e: any) {
      setSendResult({ success: false, message: e.message || 'ネットワークエラー' });
    } finally {
      setSending(false);
    }
  };

  // 会計年度の選択肢（過去5年分）
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">shinkoku エクスポート</h1>
        <p className="mt-2 text-gray-600">
          仕訳データをshinkoku形式でエクスポートし、確定申告の準備を行います。
        </p>
      </div>

      <div className="space-y-6">
        {/* shinkoku ステータス */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">shinkoku ステータス</h2>
          {shinkokuStatus ? (
            <div className="flex items-center gap-3">
              {shinkokuStatus.installed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700">
                    インストール済み（v{shinkokuStatus.version || '不明'}）
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="text-amber-700">
                    未インストール —{' '}
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      pip install shinkoku
                    </code>{' '}
                    で導入してください
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-gray-500">確認中...</span>
          )}
        </div>

        {/* 勘定科目マッピング検証 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">勘定科目マッピング検証</h2>
          {validation ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                {validation.unmapped.length === 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">
                      全 {validation.total} 科目がshinkokuにマッピング済み
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="text-amber-700">
                      {validation.mapped}/{validation.total} 科目がマッピング済み（{validation.unmapped.length} 件未マッピング）
                    </span>
                  </>
                )}
              </div>
              {validation.unmapped.length > 0 && (
                <div className="mt-3 bg-amber-50 rounded-md p-3">
                  <p className="text-sm font-medium text-amber-800 mb-2">未マッピング科目:</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {validation.unmapped.map((item) => (
                      <li key={item.accountCode}>
                        <code className="bg-amber-100 px-1 rounded">{item.accountCode}</code>{' '}
                        {item.accountName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500">検証中...</span>
          )}
        </div>

        {/* エクスポート設定 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">エクスポート設定</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">会計年度</label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}年度（{y}/4〜{y + 1}/3）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">フォーマット</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="json">JSON（推奨・プログラム用）</option>
                <option value="csv">CSV（確認用）</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              ダウンロード
            </button>
            <button
              onClick={handleSendToShinkoku}
              disabled={sending || !shinkokuStatus?.installed}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              shinkokuへ送信
            </button>
          </div>

          {sendResult && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              sendResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {sendResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
