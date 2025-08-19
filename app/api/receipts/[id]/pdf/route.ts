import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { logger } from '@/lib/logger';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf, Font } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Receipt } from '@/types/receipt';

const receiptService = new ReceiptService();

// スタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Noto Sans JP',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerName: {
    fontSize: 16,
    marginBottom: 10,
  },
  totalAmount: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#f8f8f8',
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  tableCol: {
    flex: 1,
    fontSize: 10,
  },
  tableColDescription: {
    flex: 2,
    fontSize: 10,
  },
  issuerSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  issuerName: {
    fontSize: 14,
    marginBottom: 5,
  },
  issuerDetail: {
    fontSize: 10,
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8f8f8',
    fontSize: 10,
  }
});

// PDFドキュメントコンポーネント
const ReceiptDocument = ({ receipt }: { receipt: Receipt }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* タイトル */}
      <Text style={styles.title}>領 収 書</Text>
      
      {/* ヘッダー情報 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.customerName}>{receipt.customerName}</Text>
          {receipt.subject && <Text style={{ fontSize: 10 }}>件名: {receipt.subject}</Text>}
        </View>
        <View>
          <Text style={{ fontSize: 10 }}>領収書番号: {receipt.receiptNumber}</Text>
          <Text style={{ fontSize: 10 }}>発行日: {formatDate(receipt.issueDate)}</Text>
        </View>
      </View>
      
      {/* 合計金額 */}
      <View style={styles.totalAmount}>
        <Text>￥{formatCurrency(receipt.totalAmount)}</Text>
      </View>
      
      {/* 内訳テーブル */}
      <View style={styles.table}>
        <Text style={{ fontSize: 12, marginBottom: 10 }}>【内訳】</Text>
        
        {/* テーブルヘッダー */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableColDescription}>摘要</Text>
          <Text style={styles.tableCol}>数量</Text>
          <Text style={styles.tableCol}>単価</Text>
          <Text style={styles.tableCol}>金額</Text>
        </View>
        
        {/* テーブル行 */}
        {receipt.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableColDescription}>{item.description}</Text>
            <Text style={styles.tableCol}>{item.quantity} {item.unit || '個'}</Text>
            <Text style={styles.tableCol}>￥{formatCurrency(item.unitPrice)}</Text>
            <Text style={styles.tableCol}>￥{formatCurrency(item.amount)}</Text>
          </View>
        ))}
        
        {/* 小計・税・合計 */}
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#000' }}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColDescription}></Text>
            <Text style={styles.tableCol}></Text>
            <Text style={styles.tableCol}>小計</Text>
            <Text style={styles.tableCol}>￥{formatCurrency(receipt.subtotal)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColDescription}></Text>
            <Text style={styles.tableCol}></Text>
            <Text style={styles.tableCol}>消費税({Math.round(receipt.taxRate * 100)}%)</Text>
            <Text style={styles.tableCol}>￥{formatCurrency(receipt.taxAmount)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColDescription}></Text>
            <Text style={styles.tableCol}></Text>
            <Text style={{ ...styles.tableCol, fontWeight: 'bold' }}>合計</Text>
            <Text style={{ ...styles.tableCol, fontWeight: 'bold' }}>￥{formatCurrency(receipt.totalAmount)}</Text>
          </View>
        </View>
      </View>
      
      {/* 備考 */}
      {receipt.notes && (
        <View style={styles.notes}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>【備考】</Text>
          <Text>{receipt.notes}</Text>
        </View>
      )}
      
      {/* 発行者情報 */}
      <View style={styles.issuerSection}>
        <Text style={styles.issuerName}>{receipt.issuerName}</Text>
        {receipt.issuerAddress && <Text style={styles.issuerDetail}>{receipt.issuerAddress}</Text>}
        {receipt.issuerPhone && <Text style={styles.issuerDetail}>TEL: {receipt.issuerPhone}</Text>}
        {receipt.issuerEmail && <Text style={styles.issuerDetail}>Email: {receipt.issuerEmail}</Text>}
      </View>
      
      {/* フッター */}
      <Text style={styles.footer}>
        この領収書は電子的に発行されたものです。印紙税法第5条により収入印紙の貼付は不要です。
      </Text>
    </Page>
  </Document>
);

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

    // PDFを生成
    const pdfDoc = <ReceiptDocument receipt={receipt} />;
    const pdfBytes = await pdf(pdfDoc).toBuffer();
    
    // PDFファイル名を設定
    const filename = `receipt_${receipt.receiptNumber}.pdf`;

    // PDFを返す
    return new NextResponse(pdfBytes, {
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