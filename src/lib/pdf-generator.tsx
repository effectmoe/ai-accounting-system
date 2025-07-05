import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer, Font, Image } from '@react-pdf/renderer';
import { DocumentData } from './document-generator';

// 日本語フォントの登録（Noto Sans JPを使用）
Font.register({
  family: 'NotoSansJP',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.8/files/noto-sans-jp-japanese-400-normal.woff',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.8/files/noto-sans-jp-japanese-700-normal.woff',
      fontWeight: 700,
    },
  ],
});

// PDFスタイル定義
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
    textAlign: 'center',
    marginBottom: 30,
    color: '#2c3e50',
  },
  partnerSection: {
    marginBottom: 20,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 10,
    borderBottom: '2pt solid #333',
    paddingBottom: 5,
  },
  partnerInfo: {
    fontSize: 10,
    marginBottom: 3,
    color: '#555',
  },
  projectSection: {
    backgroundColor: '#f0f7ff',
    padding: 15,
    marginVertical: 20,
    borderLeft: '4pt solid #2196f3',
  },
  projectLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 5,
  },
  projectName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
  },
  metaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  leftMeta: {
    flex: 1,
  },
  rightMeta: {
    textAlign: 'right',
  },
  amountHighlight: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 5,
    textAlign: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1976d2',
  },
  companyInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
  },
  table: {
    marginVertical: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    color: '#ffffff',
    padding: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ecf0f1',
    padding: 10,
  },
  itemColumn: {
    flex: 3,
  },
  quantityColumn: {
    flex: 1,
    textAlign: 'right',
  },
  priceColumn: {
    flex: 1,
    textAlign: 'right',
  },
  amountColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  summarySection: {
    marginLeft: 'auto',
    width: 250,
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottom: '1pt solid #ecf0f1',
  },
  summaryTotal: {
    borderTop: '2pt solid #333',
    borderBottom: '2pt solid #333',
    paddingVertical: 10,
    marginTop: 5,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  notesSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderLeft: '4pt solid #3498db',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
    color: '#2c3e50',
  },
  bankInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    border: '1pt solid #ddd',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#7f8c8d',
  },
  stampArea: {
    marginTop: 30,
    alignItems: 'flex-end',
  },
  stampBox: {
    width: 80,
    height: 80,
    border: '2pt solid #7f8c8d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampText: {
    color: '#bdc3c7',
    fontSize: 10,
  },
  qrCode: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 100,
    height: 100,
    border: '1pt solid #ddd',
    padding: 5,
  },
});

// 文書タイプのラベル
const typeLabels = {
  estimate: '見積書',
  invoice: '請求書',
  delivery_note: '納品書',
  receipt: '領収書',
};

// 会社情報（デモ用）
const companyInfo = {
  name: '株式会社ビアソラ',
  postal: '〒802-0978',
  address: '福岡県北九州市小倉南区蒲生2-3-3',
  phone: 'TEL: 093-123-4567',
  fax: 'FAX: 093-123-4568',
  email: 'info@biasora.co.jp',
  registrationNumber: 'T1234567890123',
};

// PDF文書コンポーネント
export const DocumentPDF: React.FC<{ data: DocumentData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* QRコード（プレースホルダー） */}
      <View style={styles.qrCode}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#999', fontSize: 10 }}>QRコード</Text>
        </View>
      </View>

      {/* タイトル */}
      <Text style={styles.title}>{typeLabels[data.documentType]}</Text>

      {/* 取引先情報 */}
      <View style={styles.partnerSection}>
        <Text style={styles.partnerName}>{data.partner.name} 御中</Text>
        {data.partner.address && (
          <Text style={styles.partnerInfo}>
            〒{data.partner.postal_code || ''} {data.partner.address}
          </Text>
        )}
        {data.partner.phone && (
          <Text style={styles.partnerInfo}>TEL: {data.partner.phone}</Text>
        )}
        {data.partner.registrationNumber && (
          <Text style={styles.partnerInfo}>
            登録番号: {data.partner.registrationNumber}
          </Text>
        )}
      </View>

      {/* 件名 */}
      {data.projectName && (
        <View style={styles.projectSection}>
          <Text style={styles.projectLabel}>件名</Text>
          <Text style={styles.projectName}>{data.projectName}</Text>
        </View>
      )}

      {/* メタ情報 */}
      <View style={styles.metaSection}>
        <View style={styles.leftMeta}>
          <View style={styles.amountHighlight}>
            <Text style={styles.amountLabel}>
              {data.documentType === 'estimate' ? 'お見積金額' : '合計金額'}
            </Text>
            <Text style={styles.amountValue}>
              ¥{data.total.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
              （税込）
            </Text>
          </View>
        </View>
        <View style={styles.rightMeta}>
          <Text style={{ marginBottom: 3 }}>
            <Text style={{ fontWeight: 700 }}>発行日:</Text> {data.issueDate}
          </Text>
          <Text style={{ marginBottom: 3 }}>
            <Text style={{ fontWeight: 700 }}>文書番号:</Text> {data.documentNumber}
          </Text>
          {data.validUntil && (
            <Text style={{ marginBottom: 3 }}>
              <Text style={{ fontWeight: 700 }}>有効期限:</Text> {data.validUntil}
            </Text>
          )}
          {data.dueDate && data.documentType === 'invoice' && (
            <Text style={{ marginBottom: 3 }}>
              <Text style={{ fontWeight: 700 }}>お支払期日:</Text> {data.dueDate}
            </Text>
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={{ fontSize: 9 }}>{companyInfo.postal}</Text>
            <Text style={{ fontSize: 9 }}>{companyInfo.address}</Text>
            <Text style={{ fontSize: 9 }}>{companyInfo.phone}</Text>
            <Text style={{ fontSize: 9 }}>{companyInfo.email}</Text>
            <Text style={{ fontSize: 9, marginTop: 3 }}>
              登録番号: {companyInfo.registrationNumber}
            </Text>
          </View>
        </View>
      </View>

      {/* 明細テーブル */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.itemColumn, styles.tableHeaderText]}>
            品目・仕様
          </Text>
          <Text style={[styles.quantityColumn, styles.tableHeaderText]}>
            数量
          </Text>
          <Text style={[styles.priceColumn, styles.tableHeaderText]}>
            単価
          </Text>
          <Text style={[styles.amountColumn, styles.tableHeaderText]}>
            金額
          </Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.itemColumn}>{item.name}</Text>
            <Text style={styles.quantityColumn}>
              {item.quantity.toLocaleString()}
            </Text>
            <Text style={styles.priceColumn}>
              ¥{item.unitPrice.toLocaleString()}
            </Text>
            <Text style={styles.amountColumn}>
              ¥{item.amount.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      {/* 合計 */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>小計</Text>
          <Text style={styles.summaryValue}>
            ¥{data.subtotal.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>消費税（10%）</Text>
          <Text style={styles.summaryValue}>
            ¥{data.tax.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={[styles.summaryLabel, { fontSize: 12 }]}>合計金額</Text>
          <Text style={styles.totalValue}>
            ¥{data.total.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 備考・支払条件 */}
      {(data.notes || data.paymentTerms || data.bankInfo) && (
        <View style={styles.notesSection}>
          {data.paymentTerms && (
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.notesTitle}>お支払条件</Text>
              <Text>{data.paymentTerms}</Text>
            </View>
          )}
          {data.bankInfo && data.documentType === 'invoice' && (
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.notesTitle}>お振込先</Text>
              <View style={styles.bankInfo}>
                <Text>
                  銀行名: {data.bankInfo.bankName} {data.bankInfo.branchName}
                </Text>
                <Text>口座種別: {data.bankInfo.accountType}</Text>
                <Text>口座番号: {data.bankInfo.accountNumber}</Text>
                <Text>口座名義: {data.bankInfo.accountHolder}</Text>
              </View>
            </View>
          )}
          {data.notes && (
            <View>
              <Text style={styles.notesTitle}>備考</Text>
              <Text>{data.notes}</Text>
            </View>
          )}
        </View>
      )}

      {/* 収入印紙（領収書のみ） */}
      {data.documentType === 'receipt' && (
        <View style={styles.stampArea}>
          <View style={styles.stampBox}>
            <Text style={styles.stampText}>収入印紙</Text>
          </View>
        </View>
      )}

      {/* フッター */}
      <Text style={styles.footer}>
        この{typeLabels[data.documentType]}に関するお問い合わせは、上記連絡先までお願いいたします。
      </Text>
    </Page>
  </Document>
);

// PDFプレビューコンポーネント
export const DocumentPDFViewer: React.FC<{ data: DocumentData }> = ({ data }) => (
  <PDFViewer style={{ width: '100%', height: '100vh' }}>
    <DocumentPDF data={data} />
  </PDFViewer>
);