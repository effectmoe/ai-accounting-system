import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// 日本語フォントの登録
Font.register({
  family: 'NotoSansJP',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/ea/notosansjp/v5/NotoSansJP-Regular.otf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/ea/notosansjp/v5/NotoSansJP-Bold.otf',
      fontWeight: 700,
    },
  ],
});

// スタイル定義
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    padding: 40,
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 12,
    marginBottom: 20,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  customerInfo: {
    flex: 1,
  },
  companyInfo: {
    flex: 1,
    textAlign: 'right',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 10,
  },
  totalBox: {
    backgroundColor: '#e6f2ff',
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 700,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0066cc',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    color: 'white',
    padding: 8,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
  },
  col1: {
    flex: 4,
    paddingHorizontal: 5,
  },
  col2: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  col3: {
    flex: 2,
    textAlign: 'right',
    paddingHorizontal: 5,
  },
  col4: {
    flex: 2,
    textAlign: 'right',
    paddingHorizontal: 5,
  },
  summarySection: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryTotal: {
    borderTopWidth: 2,
    borderTopColor: '#333',
    paddingTop: 10,
    fontWeight: 700,
    fontSize: 14,
  },
  notes: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  notesTitle: {
    fontWeight: 700,
    marginBottom: 10,
  },
});

interface InvoicePDFProps {
  invoice: any;
  companyInfo: any;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, companyInfo }) => {
  const customerName = invoice.customer?.companyName || invoice.customer?.name || invoice.customerSnapshot?.companyName || '';
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date()).toLocaleDateString('ja-JP');
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('ja-JP');
  
  const subtotal = invoice.subtotal || 0;
  const taxAmount = invoice.taxAmount || 0;
  const totalAmount = invoice.totalAmount || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>請求書</Text>
          <Text style={styles.invoiceNumber}>Invoice No: {invoice.invoiceNumber}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName} 御中</Text>
            {invoice.customer?.address && <Text>{invoice.customer.address}</Text>}
            {invoice.customer?.phone && <Text>TEL: {invoice.customer.phone}</Text>}
          </View>

          <View style={styles.companyInfo}>
            <Text>発行日: {issueDate}</Text>
            <Text>支払期限: {dueDate}</Text>
            <Text style={{ marginTop: 20, fontWeight: 700 }}>{companyInfo?.companyName || ''}</Text>
            {companyInfo?.address && <Text>{companyInfo.address}</Text>}
            {companyInfo?.phone && <Text>TEL: {companyInfo.phone}</Text>}
            {companyInfo?.email && <Text>{companyInfo.email}</Text>}
          </View>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>請求金額合計</Text>
          <Text style={styles.totalAmount}>¥{totalAmount.toLocaleString()} (税込)</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>品目・仕様</Text>
            <Text style={styles.col2}>数量</Text>
            <Text style={styles.col3}>単価</Text>
            <Text style={styles.col4}>金額</Text>
          </View>

          {invoice.items.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description || item.itemName || ''}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>¥{(item.unitPrice || 0).toLocaleString()}</Text>
              <Text style={styles.col4}>¥{(item.amount || 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text>小計:</Text>
            <Text>¥{subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>消費税 (10%):</Text>
            <Text>¥{taxAmount.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text>合計金額:</Text>
            <Text>¥{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>備考</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

// Generate filename with new naming convention: 請求日_帳表名_顧客名
export function generateInvoiceFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = invoice.customer?.companyName || 
                      invoice.customer?.name || 
                      invoice.customerSnapshot?.companyName || 
                      '顧客名未設定';
  
  // 日本語の顧客名を維持（ファイル名に使えない文字のみ置換）
  const cleanCustomerName = customerName
    .replace(/[<>:"\/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 20); // 長さ制限
  
  return `${dateStr}_請求書_${cleanCustomerName}.pdf`;
}

// Generate filename with ASCII-safe format (for Content-Disposition header)
export function generateSafeFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = invoice.customer?.companyName || 
                      invoice.customer?.name || 
                      invoice.customerSnapshot?.companyName || 
                      'Customer';
  
  // Clean customer name for filename (remove invalid characters)
  const cleanCustomerName = customerName
    .replace(/[<>:"\/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\x00-\x7F]/g, '_') // Remove any non-ASCII
    .substring(0, 20); // Limit length
  
  return `${dateStr}_Invoice_${cleanCustomerName}.pdf`;
}