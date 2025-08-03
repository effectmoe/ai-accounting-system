'use client';

import { useState, useEffect } from 'react';
import { Download, Eye, Trash2, Upload, Loader2, FileText } from 'lucide-react';
import { logger } from '@/lib/logger';

interface OcrFile {
  id: string;
  filename: string;
  uploadedAt: Date;
  fileType?: string;
  fileSize?: number;
}

interface SupplierQuoteOcrFilesProps {
  quoteId: string;
  files: OcrFile[];
  onUpdate?: () => void;
}

export default function SupplierQuoteOcrFiles({ quoteId, files: initialFiles, onUpdate }: SupplierQuoteOcrFilesProps) {
  const [files, setFiles] = useState<OcrFile[]>(initialFiles || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // initialFilesが更新されたときにstateも更新
  useEffect(() => {
    setFiles(initialFiles || []);
  }, [initialFiles]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('quoteId', quoteId);
        formData.append('documentType', 'supplier-quote-attachment');

        const response = await fetch(`/api/supplier-quotes/${quoteId}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`ファイルのアップロードに失敗しました: ${file.name}`);
        }

        const uploadedFile = await response.json();
        setFiles(prev => [...prev, uploadedFile]);
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      logger.error('File upload error:', error);
      setError(error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('このファイルを削除してもよろしいですか？')) {
      return;
    }

    setIsDeleting(fileId);
    setError(null);

    try {
      const response = await fetch(`/api/supplier-quotes/${quoteId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('ファイルの削除に失敗しました');
      }

      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      logger.error('File delete error:', error);
      setError(error instanceof Error ? error.message : 'ファイルの削除に失敗しました');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;

    const message = selectedFiles.size === 1 
      ? '選択したファイルを削除してもよろしいですか？' 
      : `選択した${selectedFiles.size}個のファイルを削除してもよろしいですか？`;

    if (!confirm(message)) {
      return;
    }

    setError(null);
    const filesToDelete = Array.from(selectedFiles);

    try {
      for (const fileId of filesToDelete) {
        setIsDeleting(fileId);
        const response = await fetch(`/api/supplier-quotes/${quoteId}/files/${fileId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`ファイルの削除に失敗しました: ${fileId}`);
        }

        setFiles(prev => prev.filter(f => f.id !== fileId));
      }

      setSelectedFiles(new Set());

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      logger.error('Batch delete error:', error);
      setError(error instanceof Error ? error.message : 'ファイルの削除に失敗しました');
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">OCR元ファイル</h2>
        <div className="flex gap-2">
          {selectedFiles.size > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={isDeleting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              選択したファイルを削除 ({selectedFiles.size})
            </button>
          )}
          <button
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                ファイルを追加
              </>
            )}
          </button>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 mb-2 text-gray-300" />
          <p>OCRファイルがありません</p>
          <p className="text-sm mt-1">ファイルをアップロードしてください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.length > 1 && (
            <div className="flex items-center gap-2 pb-2 border-b">
              <input
                type="checkbox"
                checked={selectedFiles.size === files.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">すべて選択</span>
            </div>
          )}
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedFiles.has(file.id)}
                onChange={() => toggleFileSelection(file.id)}
                className="rounded border-gray-300"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{file.filename}</p>
                <p className="text-xs text-gray-500">
                  {new Date(file.uploadedAt).toLocaleString('ja-JP')}
                  {file.fileSize && ` • ${formatFileSize(file.fileSize)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`/api/supplier-quotes/${quoteId}/files/${file.id}`, '_blank')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/supplier-quotes/${quoteId}/files/${file.id}?download=true`;
                    link.download = file.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleFileDelete(file.id)}
                  disabled={isDeleting === file.id}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  {isDeleting === file.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}