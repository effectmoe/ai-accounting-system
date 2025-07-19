import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { DocumentPDF } from './pdf-generator';
import { DocumentData } from './document-generator';

import { logger } from '@/lib/logger';
export async function generatePDFBlob(data: DocumentData): Promise<Blob> {
  const pdfDocument = React.createElement(DocumentPDF, { data });
  const blob = await pdf(pdfDocument as any).toBlob();
  return blob;
}


export async function downloadPDF(data: DocumentData): Promise<void> {
  try {
    const blob = await generatePDFBlob(data);
    
    // BlobをダウンロードするためのURLを作成
    const url = URL.createObjectURL(blob);
    
    // ダウンロードリンクを作成
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.documentNumber}.pdf`;
    
    // リンクをクリックしてダウンロードを開始
    document.body.appendChild(a);
    a.click();
    
    // クリーンアップ
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    logger.error('PDF生成エラー:', error);
    throw new Error('PDFの生成に失敗しました');
  }
}

// Base64エンコードされたPDFを生成（メール送信などに使用）
export async function generatePDFBase64(data: DocumentData): Promise<string> {
  logger.debug('generatePDFBase64 called, window check:', typeof window === 'undefined');
  
  // サーバーサイドで実行される場合
  if (typeof window === 'undefined') {
    logger.debug('Running on server side, attempting PDF generation...');
    // jsPDFを使用したサーバーサイドPDF生成
    const { generateJsPDFDocument } = await import('./jspdf-server-generator');
    return await generateJsPDFDocument(data);
  }
  
  // クライアントサイドで実行される場合
  const blob = await generatePDFBlob(data);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // data:application/pdf;base64, を削除して純粋なBase64文字列を返す
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// PDFのサイズを取得（バイト単位）
export async function getPDFSize(data: DocumentData): Promise<number> {
  const blob = await generatePDFBlob(data);
  return blob.size;
}

// PDFのプレビューURL（一時的なURL）を生成
export async function generatePDFPreviewURL(data: DocumentData): Promise<string> {
  const blob = await generatePDFBlob(data);
  return URL.createObjectURL(blob);
}