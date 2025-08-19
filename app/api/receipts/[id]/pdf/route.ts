import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { logger } from '@/lib/logger';
import { generateReceiptHTML } from '@/lib/receipt-pdf-generator';
import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '@/lib/utils';

const receiptService = new ReceiptService();

/**
 * GET /api/receipts/[id]/pdf - 領収書のPDFを生成
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 領収書を取得
    const receipt = await receiptService.getReceipt(params.id);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // jsPDFでPDFを生成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 日本語フォントの設定（フォントが必要な場合は別途追加）
    // doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    // doc.setFont('NotoSansJP');

    // タイトル
    doc.setFontSize(24);
    doc.text('領 収 書', 105, 30, { align: 'center' });

    // 領収書番号と日付
    doc.setFontSize(10);
    doc.text(`領収書番号: ${receipt.receiptNumber}`, 140, 45);
    doc.text(`発行日: ${formatDate(receipt.issueDate)}`, 140, 50);

    // 宛名
    doc.setFontSize(14);
    doc.text(receipt.customerName, 20, 70);

    // 金額
    doc.setFontSize(20);
    const totalAmount = formatCurrency(receipt.totalAmount);
    doc.text(`¥${totalAmount}`, 105, 90, { align: 'center' });

    // 但し書き
    if (receipt.subject) {
      doc.setFontSize(12);
      doc.text(`但し、${receipt.subject}`, 20, 110);
    }

    // 内訳テーブル
    let yPosition = 130;
    doc.setFontSize(12);
    doc.text('【内訳】', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    
    // テーブルヘッダー
    doc.text('摘要', 20, yPosition);
    doc.text('数量', 90, yPosition);
    doc.text('単価', 120, yPosition);
    doc.text('金額', 160, yPosition);
    
    yPosition += 5;
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 5;

    // 明細行
    receipt.items.forEach(item => {
      const unitPrice = formatCurrency(item.unitPrice);
      const amount = formatCurrency(item.amount);
      const unit = item.unit || '個';
      
      doc.text(item.description, 20, yPosition);
      doc.text(`${item.quantity} ${unit}`, 90, yPosition);
      doc.text(`¥${unitPrice}`, 120, yPosition);
      doc.text(`¥${amount}`, 160, yPosition);
      
      yPosition += 7;
    });

    // 小計・税・合計
    yPosition += 5;
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 8;
    
    const subtotal = formatCurrency(receipt.subtotal);
    const taxAmount = formatCurrency(receipt.taxAmount);
    const taxRate = Math.round(receipt.taxRate * 100);
    
    doc.text('小計', 120, yPosition);
    doc.text(`¥${subtotal}`, 160, yPosition);
    
    yPosition += 7;
    doc.text(`消費税(${taxRate}%)`, 120, yPosition);
    doc.text(`¥${taxAmount}`, 160, yPosition);
    
    yPosition += 7;
    doc.setFontSize(12);
    doc.text('合計', 120, yPosition);
    doc.text(`¥${totalAmount}`, 160, yPosition);

    // 発行者情報
    yPosition = 200;
    doc.setFontSize(12);
    doc.text(receipt.issuerName, 20, yPosition);
    
    if (receipt.issuerAddress) {
      yPosition += 7;
      doc.setFontSize(10);
      doc.text(receipt.issuerAddress, 20, yPosition);
    }
    
    if (receipt.issuerPhone) {
      yPosition += 6;
      doc.text(`TEL: ${receipt.issuerPhone}`, 20, yPosition);
    }
    
    if (receipt.issuerEmail) {
      yPosition += 6;
      doc.text(`Email: ${receipt.issuerEmail}`, 20, yPosition);
    }

    // 印影エリア
    doc.rect(160, 195, 20, 20);
    doc.text('印', 170, 205, { align: 'center' });

    // 備考
    if (receipt.notes) {
      yPosition = 230;
      doc.setFontSize(10);
      doc.text('【備考】', 20, yPosition);
      yPosition += 6;
      const noteLines = doc.splitTextToSize(receipt.notes, 170);
      doc.text(noteLines, 20, yPosition);
    }

    // フッター
    doc.setFontSize(8);
    doc.text(
      'この領収書は電子的に発行されたものです。印紙税法第5条により収入印紙の貼付は不要です。',
      105,
      280,
      { align: 'center' }
    );

    // PDFをバイナリ文字列として取得
    const pdfOutput = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfOutput);
    
    // PDFファイル名を設定
    const filename = `receipt_${receipt.receiptNumber}.pdf`;

    // PDFを返す
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('Error generating receipt PDF:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}