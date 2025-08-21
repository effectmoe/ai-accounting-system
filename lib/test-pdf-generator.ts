/**
 * テスト用のシンプルなPDF生成
 * 添付処理のデバッグ用に「Hello World」レベルのPDFを生成
 */

import { logger } from '@/lib/logger';

/**
 * 最もシンプルなテスト用PDFを生成
 */
export async function generateTestPDF(filename: string = 'test.pdf'): Promise<Buffer> {
  try {
    logger.debug('[Test PDF] Starting test PDF generation');
    
    // PDFkitを使用してテスト用PDFを生成
    const pdfkit = await import('pdfkit');
    const PDFDocument = pdfkit.default || pdfkit;
    
    const doc = new (PDFDocument as any)({
      size: 'A4',
      margin: 50
    });
    
    const chunks: Buffer[] = [];
    
    // データを収集
    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    // PDFの作成が完了したときのPromise
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        logger.debug('[Test PDF] Test PDF buffer created', {
          size: pdfBuffer.length,
          header: pdfBuffer.slice(0, 8).toString('ascii')
        });
        resolve(pdfBuffer);
      });
      
      doc.on('error', (error: Error) => {
        logger.error('[Test PDF] PDF document error:', error);
        reject(error);
      });
    });
    
    // 簡単なコンテンツを追加
    doc.fontSize(20)
       .text('Test PDF for Email Attachment', 100, 100);
    
    doc.fontSize(12)
       .text(`Generated at: ${new Date().toISOString()}`, 100, 150);
    
    doc.text(`Filename: ${filename}`, 100, 180);
    
    // PDFを終了
    doc.end();
    logger.debug('[Test PDF] PDF document ended, waiting for completion');
    
    // PDFの完成を待つ
    const pdfBuffer = await pdfPromise;
    
    // バッファの検証
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated test PDF buffer is empty');
    }
    
    // PDFヘッダーの確認
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    if (!pdfHeader.startsWith('%PDF')) {
      logger.error('[Test PDF] Invalid PDF buffer generated', {
        headerBytes: pdfHeader,
        bufferLength: pdfBuffer.length
      });
      throw new Error('Generated buffer is not a valid PDF');
    }
    
    logger.debug('[Test PDF] Test PDF generated successfully', {
      size: pdfBuffer.length,
      header: pdfHeader
    });
    
    return pdfBuffer;
    
  } catch (error) {
    logger.error('[Test PDF] Failed to generate test PDF:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Test PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * base64エンコードされたテスト用PDFを生成
 */
export async function generateTestPDFBase64(filename: string = 'test.pdf'): Promise<string> {
  const pdfBuffer = await generateTestPDF(filename);
  const base64 = pdfBuffer.toString('base64');
  
  logger.debug('[Test PDF] PDF encoded to base64', {
    originalSize: pdfBuffer.length,
    base64Size: base64.length,
    preview: base64.substring(0, 50)
  });
  
  return base64;
}