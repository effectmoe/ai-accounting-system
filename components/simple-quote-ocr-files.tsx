'use client';

import { useState } from 'react';

interface QuoteOcrFilesProps {
  quoteId: string;
  files: any[];
  onUpdate?: () => void;
}

export default function SimpleQuoteOcrFiles({ quoteId, files: initialFiles, onUpdate }: QuoteOcrFilesProps) {
  const [files, setFiles] = useState(initialFiles || []);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">OCR元ファイル</h2>
      
      <div className="text-sm text-gray-600 mb-4">
        この見積書はOCRによって自動生成されました。
      </div>
      
      <div className="flex gap-2">
        <a
          href="#"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          元ファイルを表示
        </a>
        <a
          href="#"
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ダウンロード
        </a>
      </div>
      
      <p className="text-xs text-gray-500 mt-4">
        QuoteID: {quoteId} | Files: {files.length}
      </p>
    </div>
  );
}