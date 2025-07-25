"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryNotePDF = exports.DocumentPDF = exports.InvoicePDF = void 0;
exports.generateInvoiceFilename = generateInvoiceFilename;
exports.generateSafeFilename = generateSafeFilename;
const react_1 = __importDefault(require("react"));
const renderer_1 = require("@react-pdf/renderer");
const honorific_utils_1 = require("./honorific-utils");
// 日本語フォントの登録
renderer_1.Font.register({
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
const styles = renderer_1.StyleSheet.create({
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
        padding: 20,
        marginBottom: 30,
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: 700,
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 700,
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
    totalSection: {
        alignItems: 'flex-end',
        marginTop: 20,
        marginBottom: 20,
    },
    totalRow: {
        flexDirection: 'row',
        width: 180,
        justifyContent: 'space-between',
        marginBottom: 3,
        paddingHorizontal: 10,
    },
    tableCell: {
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
});
const InvoicePDF = ({ invoice, companyInfo }) => {
    const customerName = invoice.customer?.companyName || invoice.customer?.name || invoice.customerSnapshot?.companyName || '';
    const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date()).toLocaleDateString('ja-JP');
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('ja-JP');
    const subtotal = invoice.subtotal || 0;
    const taxAmount = invoice.taxAmount || 0;
    const totalAmount = invoice.totalAmount || 0;
    return (<renderer_1.Document>
      <renderer_1.Page size="A4" style={styles.page}>
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.title}>請求書</renderer_1.Text>
          <renderer_1.Text style={styles.invoiceNumber}>Invoice No: {invoice.invoiceNumber}</renderer_1.Text>
        </renderer_1.View>

        <renderer_1.View style={styles.infoSection}>
          <renderer_1.View style={styles.customerInfo}>
            <renderer_1.Text style={styles.customerName}>{customerName} 御中</renderer_1.Text>
            {invoice.customer?.address && <renderer_1.Text>{invoice.customer.address}</renderer_1.Text>}
            {invoice.customer?.phone && <renderer_1.Text>TEL: {invoice.customer.phone}</renderer_1.Text>}
          </renderer_1.View>

          <renderer_1.View style={styles.companyInfo}>
            <renderer_1.Text>発行日: {issueDate}</renderer_1.Text>
            <renderer_1.Text>支払期限: {dueDate}</renderer_1.Text>
            <renderer_1.Text style={{ marginTop: 20, fontWeight: 700 }}>{companyInfo?.companyName || ''}</renderer_1.Text>
            {companyInfo?.address && <renderer_1.Text>{companyInfo.address}</renderer_1.Text>}
            {companyInfo?.phone && <renderer_1.Text>TEL: {companyInfo.phone}</renderer_1.Text>}
            {companyInfo?.email && <renderer_1.Text>{companyInfo.email}</renderer_1.Text>}
          </renderer_1.View>
        </renderer_1.View>

        <renderer_1.View style={styles.totalBox}>
          <renderer_1.Text style={styles.totalLabel}>請求金額合計</renderer_1.Text>
          <renderer_1.Text style={styles.totalAmount}>¥{totalAmount.toLocaleString()} (税込)</renderer_1.Text>
        </renderer_1.View>

        <renderer_1.View style={styles.table}>
          <renderer_1.View style={styles.tableHeader}>
            <renderer_1.Text style={styles.col1}>品目・仕様</renderer_1.Text>
            <renderer_1.Text style={styles.col2}>数量</renderer_1.Text>
            <renderer_1.Text style={styles.col3}>単価</renderer_1.Text>
            <renderer_1.Text style={styles.col4}>金額</renderer_1.Text>
          </renderer_1.View>

          {invoice.items.map((item, index) => (<renderer_1.View key={index} style={styles.tableRow}>
              <renderer_1.Text style={styles.col1}>{item.description || item.itemName || ''}</renderer_1.Text>
              <renderer_1.Text style={styles.col2}>{item.quantity}</renderer_1.Text>
              <renderer_1.Text style={styles.col3}>¥{(item.unitPrice || 0).toLocaleString()}</renderer_1.Text>
              <renderer_1.Text style={styles.col4}>¥{(item.amount || 0).toLocaleString()}</renderer_1.Text>
            </renderer_1.View>))}
        </renderer_1.View>

        <renderer_1.View style={styles.summarySection}>
          <renderer_1.View style={styles.summaryRow}>
            <renderer_1.Text>小計:</renderer_1.Text>
            <renderer_1.Text>¥{subtotal.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.summaryRow}>
            <renderer_1.Text>消費税 (10%):</renderer_1.Text>
            <renderer_1.Text>¥{taxAmount.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={[styles.summaryRow, styles.summaryTotal]}>
            <renderer_1.Text>合計金額:</renderer_1.Text>
            <renderer_1.Text>¥{totalAmount.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
        </renderer_1.View>

        {invoice.notes && (<renderer_1.View style={styles.notes}>
            <renderer_1.Text style={styles.notesTitle}>備考</renderer_1.Text>
            <renderer_1.Text>{invoice.notes}</renderer_1.Text>
          </renderer_1.View>)}
      </renderer_1.Page>
    </renderer_1.Document>);
};
exports.InvoicePDF = InvoicePDF;
// Generate filename with new naming convention: 請求日_帳表名_顧客名
function generateInvoiceFilename(invoice) {
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
function generateSafeFilename(invoice) {
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
const DocumentPDF = ({ data }) => {
    const isQuote = data.documentType === 'quote';
    const isDeliveryNote = data.documentType === 'delivery-note';
    return (<renderer_1.Document>
      <renderer_1.Page size="A4" style={styles.page}>
        {/* Header */}
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.title}>
            {isQuote ? '見積書' : isDeliveryNote ? '納品書' : '請求書'}
          </renderer_1.Text>
        </renderer_1.View>

        {/* Customer and Company Info */}
        <renderer_1.View style={styles.infoSection}>
          <renderer_1.View style={styles.customerInfo}>
            {(() => {
            // 顧客情報と敬称を生成
            const { displayName, hasContactName } = (0, honorific_utils_1.formatCustomerNameWithHonorific)(data.customer, data.customerSnapshot);
            return displayName.split('\n').map((line, i) => (<renderer_1.Text key={i} style={{
                    fontSize: hasContactName && i === 0 ? 12 : 14,
                    fontWeight: 700,
                    marginBottom: i === 0 && hasContactName ? 2 : 5
                }}>
                  {line}
                </renderer_1.Text>));
        })()}
            {data.customerAddress && (<renderer_1.View style={{ marginTop: 5 }}>
                {data.customerAddress.split('\n').map((line, i) => (<renderer_1.Text key={i} style={{ fontSize: 10 }}>{line}</renderer_1.Text>))}
              </renderer_1.View>)}
          </renderer_1.View>
          
          <renderer_1.View style={styles.companyInfo}>
            <renderer_1.Text style={{ fontSize: 10 }}>発行日: {data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : ''}</renderer_1.Text>
            {isQuote && data.validUntilDate && (<renderer_1.Text style={{ fontSize: 10 }}>有効期限: {new Date(data.validUntilDate).toLocaleDateString('ja-JP')}</renderer_1.Text>)}
            {isDeliveryNote && data.deliveryDate && (<renderer_1.Text style={{ fontSize: 10 }}>納品日: {new Date(data.deliveryDate).toLocaleDateString('ja-JP')}</renderer_1.Text>)}
            {!isQuote && !isDeliveryNote && data.dueDate && (<renderer_1.Text style={{ fontSize: 10 }}>支払期限: {new Date(data.dueDate).toLocaleDateString('ja-JP')}</renderer_1.Text>)}
            <renderer_1.Text style={{ fontSize: 10, marginTop: 5 }}>
              {isQuote ? '見積書番号' : isDeliveryNote ? '納品書番号' : '請求書番号'}: {data.documentNumber}
            </renderer_1.Text>
            <renderer_1.Text style={{ fontSize: 14, fontWeight: 700, marginTop: 15 }}>{data.companyInfo?.name}</renderer_1.Text>
            <renderer_1.Text style={{ fontSize: 10 }}>{data.companyInfo?.address}</renderer_1.Text>
            {data.companyInfo?.phone && <renderer_1.Text style={{ fontSize: 10 }}>TEL: {data.companyInfo.phone}</renderer_1.Text>}
            {data.companyInfo?.email && <renderer_1.Text style={{ fontSize: 10 }}>{data.companyInfo.email}</renderer_1.Text>}
          </renderer_1.View>
        </renderer_1.View>

        {/* Total Amount Box */}
        <renderer_1.View style={styles.totalBox}>
          <renderer_1.Text style={styles.totalLabel}>
            {isQuote ? '見積金額合計' : isDeliveryNote ? '納品金額合計' : '請求金額合計'}
          </renderer_1.Text>
          <renderer_1.Text style={styles.totalAmount}>
            ¥{(data.total || 0).toLocaleString()} (税込)
          </renderer_1.Text>
        </renderer_1.View>

        {/* Items Table */}
        <renderer_1.View style={styles.table}>
          <renderer_1.View style={styles.tableHeader}>
            <renderer_1.Text style={[styles.tableCell, { flex: 3 }]}>品目・仕様</renderer_1.Text>
            <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>数量</renderer_1.Text>
            <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>単価</renderer_1.Text>
            <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>金額</renderer_1.Text>
          </renderer_1.View>
          
          {data.items?.map((item, index) => (<renderer_1.View key={index} style={styles.tableRow}>
              <renderer_1.Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</renderer_1.Text>
              <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.quantity}</renderer_1.Text>
              <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.unitPrice.toLocaleString()}</renderer_1.Text>
              <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.amount.toLocaleString()}</renderer_1.Text>
            </renderer_1.View>))}
        </renderer_1.View>

        {/* Totals */}
        <renderer_1.View style={styles.totalSection}>
          <renderer_1.View style={styles.totalRow}>
            <renderer_1.Text>小計:</renderer_1.Text>
            <renderer_1.Text>¥{data.subtotal?.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.totalRow}>
            <renderer_1.Text>消費税:</renderer_1.Text>
            <renderer_1.Text>¥{data.tax?.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={[styles.totalRow, { borderTopWidth: 1, paddingTop: 5 }]}>
            <renderer_1.Text style={{ fontWeight: 700 }}>合計:</renderer_1.Text>
            <renderer_1.Text style={{ fontWeight: 700 }}>¥{data.total?.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
        </renderer_1.View>

        {/* Notes */}
        <renderer_1.View style={{ marginTop: 30 }}>
          {isQuote && data.validUntilDate && (<renderer_1.View style={{ marginBottom: 20, padding: 10, borderWidth: 1, borderColor: '#ddd' }}>
              <renderer_1.Text style={{ fontWeight: 700, marginBottom: 5 }}>見積書有効期限について</renderer_1.Text>
              <renderer_1.Text style={{ fontSize: 10 }}>
                この見積書の有効期限は {new Date(data.validUntilDate).toLocaleDateString('ja-JP')} までです。
                期限を過ぎた場合は改めてお見積りいたします。
              </renderer_1.Text>
            </renderer_1.View>)}
          {data.notes && (<renderer_1.View>
              <renderer_1.Text style={{ fontWeight: 700, marginBottom: 5 }}>備考</renderer_1.Text>
              <renderer_1.Text style={{ fontSize: 10 }}>{data.notes}</renderer_1.Text>
            </renderer_1.View>)}
        </renderer_1.View>
      </renderer_1.Page>
    </renderer_1.Document>);
};
exports.DocumentPDF = DocumentPDF;
// 納品書PDF生成コンポーネント
const DeliveryNotePDF = ({ deliveryNote, customer }) => {
    // データ形式を変換
    const data = {
        type: 'delivery-note',
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
        items: deliveryNote.items?.map((item) => ({
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
    return (<renderer_1.Document>
      <renderer_1.Page size="A4" style={styles.page}>
        {/* Header */}
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.title}>納 品 書</renderer_1.Text>
          <renderer_1.Text style={styles.invoiceNumber}>{data.documentNumber}</renderer_1.Text>
        </renderer_1.View>

        {/* Customer and Company Info */}
        <renderer_1.View style={styles.infoSection}>
          <renderer_1.View style={styles.customerInfo}>
            {(() => {
            // 顧客情報と敬称を生成
            const { displayName, hasContactName } = (0, honorific_utils_1.formatCustomerNameWithHonorific)(data.customer, data.customerSnapshot);
            return displayName.split('\n').map((line, i) => (<renderer_1.Text key={i} style={{
                    fontSize: hasContactName && i === 0 ? 12 : 14,
                    fontWeight: 700,
                    marginBottom: i === 0 && hasContactName ? 2 : 5
                }}>
                  {line}
                </renderer_1.Text>));
        })()}
            {data.customerAddress && (<renderer_1.View style={{ marginTop: 5 }}>
                {data.customerAddress.split('\n').map((line, i) => (<renderer_1.Text key={i} style={{ fontSize: 10 }}>{line}</renderer_1.Text>))}
              </renderer_1.View>)}
          </renderer_1.View>
          
          <renderer_1.View style={styles.companyInfo}>
            <renderer_1.Text style={{ fontSize: 10 }}>発行日: {data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : ''}</renderer_1.Text>
            <renderer_1.Text style={{ fontSize: 10 }}>納品日: {data.deliveryDate ? new Date(data.deliveryDate).toLocaleDateString('ja-JP') : ''}</renderer_1.Text>
            <renderer_1.Text style={{ fontSize: 10, marginTop: 5 }}>納品書番号: {data.documentNumber}</renderer_1.Text>
            <renderer_1.Text style={{ fontSize: 14, fontWeight: 700, marginTop: 15 }}>{data.companyInfo?.name}</renderer_1.Text>
            <renderer_1.Text style={{ fontSize: 10 }}>{data.companyInfo?.address}</renderer_1.Text>
            {data.companyInfo?.phone && <renderer_1.Text style={{ fontSize: 10 }}>TEL: {data.companyInfo.phone}</renderer_1.Text>}
            {data.companyInfo?.email && <renderer_1.Text style={{ fontSize: 10 }}>{data.companyInfo.email}</renderer_1.Text>}
          </renderer_1.View>
        </renderer_1.View>

        {/* Delivery Info Box */}
        {(data.deliveryLocation || data.deliveryMethod) && (<renderer_1.View style={[styles.totalBox, { marginBottom: 20 }]}>
            {data.deliveryLocation && (<renderer_1.Text style={{ fontSize: 10, marginBottom: 5 }}>納品場所: {data.deliveryLocation}</renderer_1.Text>)}
            {data.deliveryMethod && (<renderer_1.Text style={{ fontSize: 10 }}>納品方法: {data.deliveryMethod === 'direct' ? '直接納品' :
                    data.deliveryMethod === 'shipping' ? '配送' :
                        data.deliveryMethod === 'pickup' ? '引き取り' :
                            data.deliveryMethod === 'email' ? 'メール送信' :
                                'その他'}</renderer_1.Text>)}
          </renderer_1.View>)}

        {/* Items Table */}
        <renderer_1.View style={styles.table}>
          <renderer_1.View style={styles.tableHeader}>
            <renderer_1.Text style={[styles.tableCell, { flex: 3 }]}>品目・仕様</renderer_1.Text>
            <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>数量</renderer_1.Text>
            <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>単価</renderer_1.Text>
            <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>金額</renderer_1.Text>
          </renderer_1.View>
          
          {data.items?.map((item, index) => (<renderer_1.View key={index} style={styles.tableRow}>
              <renderer_1.Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</renderer_1.Text>
              <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{item.quantity}</renderer_1.Text>
              <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.unitPrice.toLocaleString()}</renderer_1.Text>
              <renderer_1.Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>¥{item.amount.toLocaleString()}</renderer_1.Text>
            </renderer_1.View>))}
        </renderer_1.View>

        {/* Totals */}
        <renderer_1.View style={styles.totalSection}>
          <renderer_1.View style={styles.totalRow}>
            <renderer_1.Text>小計:</renderer_1.Text>
            <renderer_1.Text>¥{data.subtotal?.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.totalRow}>
            <renderer_1.Text>消費税:</renderer_1.Text>
            <renderer_1.Text>¥{data.tax?.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={[styles.totalRow, { borderTopWidth: 1, paddingTop: 5 }]}>
            <renderer_1.Text style={{ fontWeight: 700 }}>合計:</renderer_1.Text>
            <renderer_1.Text style={{ fontWeight: 700 }}>¥{data.total?.toLocaleString()}</renderer_1.Text>
          </renderer_1.View>
        </renderer_1.View>

        {/* Notes */}
        {data.notes && (<renderer_1.View style={{ marginTop: 30 }}>
            <renderer_1.Text style={{ fontWeight: 700, marginBottom: 5 }}>備考</renderer_1.Text>
            <renderer_1.Text style={{ fontSize: 10 }}>{data.notes}</renderer_1.Text>
          </renderer_1.View>)}
      </renderer_1.Page>
    </renderer_1.Document>);
};
exports.DeliveryNotePDF = DeliveryNotePDF;
