import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// 日本語フォントの登録
Font.register({
  family: 'NotoSansJP',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.0/files/noto-sans-jp-japanese-400-normal.woff',
  fontWeight: 400,
});

Font.register({
  family: 'NotoSansJP',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.0/files/noto-sans-jp-japanese-700-normal.woff',
  fontWeight: 700,
});

// スタイル定義
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
    textAlign: 'center',
  },
  companySection: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 10,
    marginBottom: 2,
    color: '#333333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  customerSection: {
    marginBottom: 5,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 5,
  },
  dateSection: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  dateLabel: {
    width: 80,
    textAlign: 'right',
    marginRight: 10,
  },
  dateValue: {
    fontWeight: 700,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
  },
  itemDescription: {
    flex: 3,
  },
  itemQuantity: {
    flex: 1,
    textAlign: 'right',
  },
  itemUnitPrice: {
    flex: 1.5,
    textAlign: 'right',
  },
  itemAmount: {
    flex: 1.5,
    textAlign: 'right',
  },
  itemTax: {
    flex: 1,
    textAlign: 'right',
  },
  summarySection: {
    marginTop: 30,
    alignItems: 'flex-end',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 5,
    width: 250,
  },
  summaryLabel: {
    flex: 1,
    textAlign: 'right',
    marginRight: 20,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingTop: 10,
    marginTop: 10,
    width: 250,
  },
  totalLabel: {
    flex: 1,
    textAlign: 'right',
    marginRight: 20,
    fontSize: 14,
    fontWeight: 700,
  },
  totalValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 700,
  },
  paymentSection: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },
  bankInfo: {
    marginBottom: 5,
  },
  notesSection: {
    marginTop: 30,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },
  notes: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  footerText: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666666',
  },
  sealSection: {
    position: 'absolute',
    right: 60,
    top: 200,
    width: 60,
    height: 60,
  },
  sealImage: {
    width: 60,
    height: 60,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },
  honorific: {
    fontSize: 14,
    marginLeft: 5,
  },
});

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    customerSnapshot: {
      companyName: string;
      address: string;
      phone?: string;
      email?: string;
      contactName?: string;
    };
    companySnapshot: {
      companyName: string;
      address: string;
      phone?: string;
      email?: string;
      invoiceRegistrationNumber?: string;
      sealImageUrl?: string;
      bankAccount?: {
        bankName: string;
        branchName: string;
        accountType: string;
        accountNumber: string;
        accountHolder: string;
      };
    };
    items: InvoiceItem[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string;
    notes?: string;
  };
}

const InvoicePDFTemplate: React.FC<InvoicePDFProps> = ({ invoice }) => {
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('ja-JP')}`;
  };

  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      checking: '当座',
      savings: '普通',
      time_deposit: '定期',
      other: 'その他',
    };
    return types[type] || type;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>請 求 書</Text>
        </View>

        {/* 請求書番号と日付 */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.invoiceNumber}>請求書番号: {invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.dateSection}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>請求日:</Text>
              <Text style={styles.dateValue}>
                {format(new Date(invoice.invoiceDate), 'yyyy年MM月dd日', { locale: ja })}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>お支払期限:</Text>
              <Text style={styles.dateValue}>
                {format(new Date(invoice.dueDate), 'yyyy年MM月dd日', { locale: ja })}
              </Text>
            </View>
          </View>
        </View>

        {/* 顧客情報と自社情報 */}
        <View style={styles.row}>
          {/* 顧客情報 */}
          <View style={[styles.column, styles.customerSection]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={styles.customerName}>{invoice.customerSnapshot.companyName}</Text>
              <Text style={styles.honorific}>御中</Text>
            </View>
            {invoice.customerSnapshot.contactName && (
              <Text style={styles.companyInfo}>{invoice.customerSnapshot.contactName} 様</Text>
            )}
            <Text style={styles.companyInfo}>〒{invoice.customerSnapshot.address}</Text>
            {invoice.customerSnapshot.phone && (
              <Text style={styles.companyInfo}>TEL: {invoice.customerSnapshot.phone}</Text>
            )}
            {invoice.customerSnapshot.email && (
              <Text style={styles.companyInfo}>Email: {invoice.customerSnapshot.email}</Text>
            )}
          </View>

          {/* 自社情報 */}
          <View style={[styles.column, styles.companySection]}>
            <Text style={styles.companyName}>{invoice.companySnapshot.companyName}</Text>
            <Text style={styles.companyInfo}>〒{invoice.companySnapshot.address}</Text>
            {invoice.companySnapshot.phone && (
              <Text style={styles.companyInfo}>TEL: {invoice.companySnapshot.phone}</Text>
            )}
            {invoice.companySnapshot.email && (
              <Text style={styles.companyInfo}>Email: {invoice.companySnapshot.email}</Text>
            )}
            {invoice.companySnapshot.invoiceRegistrationNumber && (
              <Text style={styles.companyInfo}>
                登録番号: {invoice.companySnapshot.invoiceRegistrationNumber}
              </Text>
            )}
          </View>
        </View>

        {/* 印鑑画像 */}
        {invoice.companySnapshot.sealImageUrl && (
          <View style={styles.sealSection}>
            <Image style={styles.sealImage} src={invoice.companySnapshot.sealImageUrl} />
          </View>
        )}

        {/* 明細テーブル */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.itemDescription]}>品目</Text>
            <Text style={[styles.tableCellHeader, styles.itemQuantity]}>数量</Text>
            <Text style={[styles.tableCellHeader, styles.itemUnitPrice]}>単価</Text>
            <Text style={[styles.tableCellHeader, styles.itemAmount]}>金額</Text>
            <Text style={[styles.tableCellHeader, styles.itemTax]}>消費税</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.itemDescription]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.itemQuantity]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.itemUnitPrice]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableCell, styles.itemAmount]}>
                {formatCurrency(item.amount)}
              </Text>
              <Text style={[styles.tableCell, styles.itemTax]}>
                {formatCurrency(item.taxAmount)}
              </Text>
            </View>
          ))}
        </View>

        {/* 合計 */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>小計:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>消費税:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.taxAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>合計金額:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
        </View>

        {/* 振込先情報 */}
        {invoice.paymentMethod === 'bank_transfer' && invoice.companySnapshot.bankAccount && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>お振込先</Text>
            <Text style={styles.bankInfo}>
              {invoice.companySnapshot.bankAccount.bankName} {invoice.companySnapshot.bankAccount.branchName}
            </Text>
            <Text style={styles.bankInfo}>
              {getAccountTypeLabel(invoice.companySnapshot.bankAccount.accountType)} {invoice.companySnapshot.bankAccount.accountNumber}
            </Text>
            <Text style={styles.bankInfo}>
              {invoice.companySnapshot.bankAccount.accountHolder}
            </Text>
          </View>
        )}

        {/* 備考 */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>備考</Text>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </View>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            この請求書に関するお問い合わせは、上記連絡先までお願いいたします。
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDFTemplate;