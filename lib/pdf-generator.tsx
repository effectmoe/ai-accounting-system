import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatCustomerNameWithHonorific } from './honorific-utils';

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

// スタイル定義 - 1ページに収まるようにコンパクト化
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    padding: 25,
    fontSize: 9,
  },
  header: {
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 10,
    marginBottom: 10,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  customerInfo: {
    flex: 1,
  },
  companyInfo: {
    flex: 2,
    textAlign: 'right',
  },
  customerName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 5,
  },
  totalBox: {
    backgroundColor: '#e6f2ff',
    padding: 10,
    marginBottom: 15,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 700,
  },
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    color: 'white',
    padding: 5,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
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
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    width: 180,
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  summaryTotal: {
    borderTopWidth: 2,
    borderTopColor: '#333',
    paddingTop: 5,
    fontWeight: 700,
    fontSize: 11,
  },
  notes: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  notesTitle: {
    fontWeight: 700,
    marginBottom: 5,
    fontSize: 9,
  },
  totalSection: {
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    width: 160,
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: 5,
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
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
            <Text style={{ fontSize: 9 }}>発行日: {issueDate}</Text>
            <Text style={{ fontSize: 9 }}>支払期限: {dueDate}</Text>
            <Text style={{ marginTop: 15, fontWeight: 700, fontSize: 11 }}>{companyInfo?.companyName || ''}</Text>
            {companyInfo?.address && companyInfo.address.split('\n').map((line: string, i: number) => (
              <Text key={i} style={{ fontSize: 8 }}>{line}</Text>
            ))}
            {companyInfo?.phone && <Text style={{ fontSize: 8 }}>TEL: {companyInfo.phone}</Text>}
            {companyInfo?.email && <Text style={{ fontSize: 8 }}>{companyInfo.email}</Text>}
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

// PDF Document Component
export const DocumentPDF: React.FC<{ data: any }> = ({ data }) => {
  const isQuote = data.documentType === 'quote';
  const isDeliveryNote = data.documentType === 'delivery-note';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isQuote ? '見積書' : isDeliveryNote ? '納品書' : '請求書'}
          </Text>
        </View>

        {/* Customer and Company Info */}
        <View style={styles.infoSection}>
          <View style={styles.customerInfo}>
            {(() => {
              // 顧客情報と敬称を生成
              const { displayName, hasContactName } = formatCustomerNameWithHonorific(
                data.customer,
                data.customerSnapshot
              );
              
              return displayName.split('\n').map((line: string, i: number) => (
                <Text 
                  key={i} 
                  style={{ 
                    fontSize: hasContactName && i === 0 ? 12 : 14, 
                    fontWeight: 700, 
                    marginBottom: i === 0 && hasContactName ? 2 : 5 
                  }}
                >
                  {line}
                </Text>
              ));
            })()}
            {data.customerAddress && (
              <View style={{ marginTop: 5 }}>
                {data.customerAddress.split('\n').map((line: string, i: number) => (
                  <Text key={i} style={{ fontSize: 10 }}>{line}</Text>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 10 }}>発行日: {data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : ''}</Text>
            {isQuote && data.validUntilDate && (
              <Text style={{ fontSize: 10 }}>有効期限: {new Date(data.validUntilDate).toLocaleDateString('ja-JP')}</Text>
            )}
            {isDeliveryNote && data.deliveryDate && (
              <Text style={{ fontSize: 10 }}>納品日: {new Date(data.deliveryDate).toLocaleDateString('ja-JP')}</Text>
            )}
            {!isQuote && !isDeliveryNote && data.dueDate && (
              <Text style={{ fontSize: 10 }}>支払期限: {new Date(data.dueDate).toLocaleDateString('ja-JP')}</Text>
            )}
            <Text style={{ fontSize: 9, marginTop: 5 }}>
              {isQuote ? '見積書番号' : isDeliveryNote ? '納品書番号' : '請求書番号'}: {data.documentNumber}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: 700, marginTop: 10 }}>{data.companyInfo?.name}</Text>
            {data.companyInfo?.address && data.companyInfo.address.split('\n').map((line: string, i: number) => (
              <Text key={i} style={{ fontSize: 8 }}>{line}</Text>
            ))}
            {data.companyInfo?.phone && <Text style={{ fontSize: 8 }}>TEL: {data.companyInfo.phone}</Text>}
            {data.companyInfo?.email && <Text style={{ fontSize: 8 }}>{data.companyInfo.email}</Text>}
          </View>
        </View>

        {/* Total Amount Box */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>
            {isQuote ? '見積金額合計' : isDeliveryNote ? '納品金額合計' : '請求金額合計'}
          </Text>
          <Text style={styles.totalAmount}>
            ¥{(data.total || 0).toLocaleString()} (税込)
          </Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 3 }]}>品目・仕様</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>数量</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>単価</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>金額</Text>
          </View>

          {data.items?.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 3 }]}>
                <Text>{item.itemName || item.description}</Text>
                {item.description && item.itemName && item.description !== item.itemName && (
                  <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{item.description}</Text>
                )}
                {item.notes && (
                  <Text style={{ fontSize: 7, color: '#888', marginTop: 2 }}>※ {item.notes}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.unitPrice.toLocaleString()}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text>小計:</Text>
            <Text>¥{data.subtotal?.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>消費税:</Text>
            <Text>¥{data.tax?.toLocaleString()}</Text>
          </View>
          <View style={[styles.totalRow, { borderTopWidth: 1, paddingTop: 5 }]}>
            <Text style={{ fontWeight: 700 }}>合計:</Text>
            <Text style={{ fontWeight: 700 }}>¥{data.total?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={{ marginTop: 10 }}>
          {isQuote && data.validUntilDate && (
            <View style={{ marginBottom: 8, padding: 6, borderWidth: 1, borderColor: '#ddd' }}>
              <Text style={{ fontWeight: 700, marginBottom: 3, fontSize: 8 }}>見積書有効期限について</Text>
              <Text style={{ fontSize: 8 }}>
                この見積書の有効期限は {new Date(data.validUntilDate).toLocaleDateString('ja-JP')} までです。
                期限を過ぎた場合は改めてお見積りいたします。
              </Text>
            </View>
          )}
          {data.notes && (
            <View>
              <Text style={{ fontWeight: 700, marginBottom: 3, fontSize: 8 }}>備考</Text>
              <Text style={{ fontSize: 8 }}>{data.notes}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

// 納品書PDF生成コンポーネント
export const DeliveryNotePDF = ({ deliveryNote, customer }: { deliveryNote: any, customer: any }) => {
  // データ形式を変換
  const data = {
    type: 'delivery-note' as const,
    documentNumber: deliveryNote.deliveryNoteNumber,
    issueDate: deliveryNote.issueDate,
    deliveryDate: deliveryNote.deliveryDate,
    customer: customer || deliveryNote.customer,
    customerSnapshot: deliveryNote.customerSnapshot,
    customerAddress: deliveryNote.customerSnapshot?.address || 
      (customer ? `${customer.postalCode ? `〒${customer.postalCode} ` : ''}${customer.prefecture || ''}${customer.city || ''}${customer.address1 || ''}${customer.address2 || ''}` : ''),
    companyInfo: {
      name: deliveryNote.companySnapshot?.companyName || '会社名未設定',
      address: deliveryNote.companySnapshot?.address || '',
      phone: deliveryNote.companySnapshot?.phone,
      email: deliveryNote.companySnapshot?.email,
    },
    items: deliveryNote.items?.map((item: any) => ({
      description: item.itemName || item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    subtotal: deliveryNote.subtotal,
    tax: deliveryNote.taxAmount,
    total: deliveryNote.totalAmount,
    notes: deliveryNote.notes,
    deliveryLocation: deliveryNote.deliveryLocation,
    deliveryMethod: deliveryNote.deliveryMethod,
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>納 品 書</Text>
          <Text style={styles.invoiceNumber}>{data.documentNumber}</Text>
        </View>

        {/* Customer and Company Info */}
        <View style={styles.infoSection}>
          <View style={styles.customerInfo}>
            {(() => {
              // 顧客情報と敬称を生成
              const { displayName, hasContactName } = formatCustomerNameWithHonorific(
                data.customer,
                data.customerSnapshot
              );
              
              return displayName.split('\n').map((line: string, i: number) => (
                <Text 
                  key={i} 
                  style={{ 
                    fontSize: hasContactName && i === 0 ? 12 : 14, 
                    fontWeight: 700, 
                    marginBottom: i === 0 && hasContactName ? 2 : 5 
                  }}
                >
                  {line}
                </Text>
              ));
            })()}
            {data.customerAddress && (
              <View style={{ marginTop: 5 }}>
                {data.customerAddress.split('\n').map((line: string, i: number) => (
                  <Text key={i} style={{ fontSize: 10 }}>{line}</Text>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 9 }}>発行日: {data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : ''}</Text>
            <Text style={{ fontSize: 9 }}>納品日: {data.deliveryDate ? new Date(data.deliveryDate).toLocaleDateString('ja-JP') : ''}</Text>
            <Text style={{ fontSize: 9, marginTop: 5 }}>納品書番号: {data.documentNumber}</Text>
            <Text style={{ fontSize: 11, fontWeight: 700, marginTop: 10 }}>{data.companyInfo?.name}</Text>
            {data.companyInfo?.address && data.companyInfo.address.split('\n').map((line: string, i: number) => (
              <Text key={i} style={{ fontSize: 8 }}>{line}</Text>
            ))}
            {data.companyInfo?.phone && <Text style={{ fontSize: 8 }}>TEL: {data.companyInfo.phone}</Text>}
            {data.companyInfo?.email && <Text style={{ fontSize: 8 }}>{data.companyInfo.email}</Text>}
          </View>
        </View>

        {/* Delivery Info Box */}
        {(data.deliveryLocation || data.deliveryMethod) && (
          <View style={[styles.totalBox, { marginBottom: 20 }]}>
            {data.deliveryLocation && (
              <Text style={{ fontSize: 10, marginBottom: 5 }}>納品場所: {data.deliveryLocation}</Text>
            )}
            {data.deliveryMethod && (
              <Text style={{ fontSize: 10 }}>納品方法: {
                data.deliveryMethod === 'direct' ? '直接納品' :
                data.deliveryMethod === 'shipping' ? '配送' :
                data.deliveryMethod === 'pickup' ? '引き取り' :
                data.deliveryMethod === 'email' ? 'メール送信' :
                'その他'
              }</Text>
            )}
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 3 }]}>品目・仕様</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>数量</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>単価</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>金額</Text>
          </View>

          {data.items?.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 3 }]}>
                <Text>{item.itemName || item.description}</Text>
                {item.description && item.itemName && item.description !== item.itemName && (
                  <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{item.description}</Text>
                )}
                {item.notes && (
                  <Text style={{ fontSize: 7, color: '#888', marginTop: 2 }}>※ {item.notes}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.unitPrice.toLocaleString()}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text>小計:</Text>
            <Text>¥{data.subtotal?.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>消費税:</Text>
            <Text>¥{data.tax?.toLocaleString()}</Text>
          </View>
          <View style={[styles.totalRow, { borderTopWidth: 1, paddingTop: 5 }]}>
            <Text style={{ fontWeight: 700 }}>合計:</Text>
            <Text style={{ fontWeight: 700 }}>¥{data.total?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 700, marginBottom: 3, fontSize: 8 }}>備考</Text>
            <Text style={{ fontSize: 8 }}>{data.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};