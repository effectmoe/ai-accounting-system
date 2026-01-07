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
    padding: 30,
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 5,
  },
  receiptNumber: {
    fontSize: 11,
    color: '#666',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerInfo: {
    flex: 1,
  },
  companyInfo: {
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 5,
  },
  amountBox: {
    borderWidth: 2,
    borderColor: '#333',
    padding: 15,
    marginVertical: 20,
    alignItems: 'center',
  },
  amountTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: 700,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderStyle: 'dotted',
  },
  detailLabel: {
    fontWeight: 700,
  },
  purposeSection: {
    marginTop: 20,
  },
  purposeContent: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    backgroundColor: '#f9f9f9',
    marginTop: 5,
  },
  footer: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
  },
});

interface ReceiptPDFProps {
  receipt: any;
  companyInfo: any;
}

// 但し書きを生成するヘルパー関数
function generatePurpose(receipt: any): string {
  if (receipt.purpose) {
    return receipt.purpose;
  }
  if (receipt.notes) {
    return receipt.notes;
  }

  if (receipt.items && receipt.items.length > 0) {
    const itemNames = receipt.items.map((item: any) =>
      item.itemName || item.description || '商品'
    );
    const uniqueItems = [...new Set(itemNames)] as string[];

    if (uniqueItems.length === 1) {
      return `${uniqueItems[0]}の代金として`;
    } else if (uniqueItems.length <= 3) {
      return `${uniqueItems.join('、')}の代金として`;
    } else {
      return `${uniqueItems[0]}他${uniqueItems.length - 1}品目の代金として`;
    }
  }

  if (receipt.invoiceNumber) {
    return `${receipt.invoiceNumber}の代金として`;
  }

  return '上記の通り正に領収いたしました。';
}

// 顧客名を取得するヘルパー関数
function getCustomerName(receipt: any): string {
  const customerSnapshot = receipt.customerSnapshot || {};

  if (customerSnapshot.companyName) {
    return customerSnapshot.companyName;
  }
  if (receipt.customerName) {
    return receipt.customerName;
  }
  if (receipt.customer?.companyName) {
    return receipt.customer.companyName;
  }

  return '顧客名未設定';
}

export const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipt, companyInfo }) => {
  const customerName = getCustomerName(receipt);
  const contactPerson = receipt.customerSnapshot?.contactName || '';
  const issueDate = new Date(receipt.issueDate || new Date()).toLocaleDateString('ja-JP');
  const paidDate = new Date(receipt.paidDate || receipt.issueDate || new Date()).toLocaleDateString('ja-JP');

  const subtotal = receipt.subtotal || 0;
  const taxAmount = receipt.taxAmount || 0;
  const totalAmount = receipt.totalAmount || 0;

  const paymentMethodText = receipt.paymentMethod === 'bank_transfer' ? '銀行振込' :
                            receipt.paymentMethod === 'credit_card' ? 'クレジットカード' :
                            receipt.paymentMethod === 'cash' ? '現金' : 'その他';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>領 収 書</Text>
          <Text style={styles.receiptNumber}>No. {receipt.receiptNumber}</Text>
        </View>

        {/* 情報セクション */}
        <View style={styles.infoSection}>
          {/* 宛先 */}
          <View style={styles.customerInfo}>
            <Text style={styles.sectionTitle}>宛先</Text>
            <Text style={styles.customerName}>
              {customerName}{contactPerson ? ` ${contactPerson}` : ''} 様
            </Text>
            {receipt.customerSnapshot?.address && (
              <Text style={{ fontSize: 9 }}>{receipt.customerSnapshot.address}</Text>
            )}
          </View>

          {/* 発行日 */}
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 10 }}>発行日: {issueDate}</Text>
          </View>
        </View>

        {/* 金額ボックス */}
        <View style={styles.amountBox}>
          <Text style={styles.amountTitle}>領収金額</Text>
          <Text style={styles.amountValue}>¥{totalAmount.toLocaleString()}</Text>
        </View>

        {/* 詳細情報 */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>詳細情報</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>支払日:</Text>
            <Text>{paidDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>支払方法:</Text>
            <Text>{paymentMethodText}</Text>
          </View>

          {receipt.invoiceNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>請求書番号:</Text>
              <Text>{receipt.invoiceNumber}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>小計:</Text>
            <Text>¥{subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>消費税:</Text>
            <Text>¥{taxAmount.toLocaleString()}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 2 }]}>
            <Text style={[styles.detailLabel, { fontSize: 11 }]}>合計:</Text>
            <Text style={{ fontWeight: 700, fontSize: 11 }}>¥{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* 但し書き */}
        <View style={styles.purposeSection}>
          <Text style={styles.sectionTitle}>但し書き</Text>
          <View style={styles.purposeContent}>
            <Text>{generatePurpose(receipt)}</Text>
          </View>
        </View>

        {/* 発行者情報 */}
        <View style={{ marginTop: 30, alignItems: 'flex-end' }}>
          {(receipt.companySnapshot?.invoiceRegistrationNumber || receipt.issuerRegistrationNumber) && (
            <Text style={{ fontSize: 9, marginBottom: 5 }}>
              登録番号: {receipt.companySnapshot?.invoiceRegistrationNumber || receipt.issuerRegistrationNumber}
            </Text>
          )}
          <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
            {receipt.companySnapshot?.companyName || companyInfo?.companyName || '会社名未設定'}
          </Text>
          <Text style={{ fontSize: 9 }}>
            {receipt.companySnapshot?.address || companyInfo?.address || ''}
          </Text>
          {(receipt.companySnapshot?.email || companyInfo?.email) && (
            <Text style={{ fontSize: 9 }}>
              Email: {receipt.companySnapshot?.email || companyInfo?.email}
            </Text>
          )}
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text>この領収書は {receipt.receiptNumber} として発行されました。</Text>
        </View>
      </Page>
    </Document>
  );
};
