"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmailSendModal;
const react_1 = __importStar(require("react"));
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const alert_1 = require("@/components/ui/alert");
const lucide_react_1 = require("lucide-react");
const pdf_export_1 = require("@/lib/pdf-export");
const honorific_utils_1 = require("@/lib/honorific-utils");
function EmailSendModal({ isOpen, onClose, documentType, documentId, documentNumber, customerEmail = '', customerName = '', customer, customerSnapshot, totalAmount, dueDate, deliveryDate, onSuccess, }) {
    const [to, setTo] = (0, react_1.useState)(customerEmail);
    const [cc, setCc] = (0, react_1.useState)('');
    const [bcc, setBcc] = (0, react_1.useState)('');
    const [subject, setSubject] = (0, react_1.useState)('');
    const [body, setBody] = (0, react_1.useState)('');
    const [attachPdf, setAttachPdf] = (0, react_1.useState)(true);
    const [isSending, setIsSending] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // デフォルトの件名と本文を生成
    const getDefaultContent = () => {
        // 敬称付きの宛名を生成
        const formattedCustomerName = (0, honorific_utils_1.formatCustomerNameForEmail)(customer, customerSnapshot);
        if (documentType === 'quote') {
            return {
                subject: `【見積書】${documentNumber} のご送付`,
                body: `${formattedCustomerName}

いつもお世話になっております。

ご依頼いただきました見積書をお送りいたします。

見積書番号：${documentNumber}
見積金額：¥${totalAmount.toLocaleString()}

添付ファイルをご確認ください。

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。`,
            };
        }
        else if (documentType === 'invoice') {
            return {
                subject: `【請求書】${documentNumber} のご送付`,
                body: `${formattedCustomerName}

いつもお世話になっております。

請求書をお送りいたします。

請求書番号：${documentNumber}
請求金額：¥${totalAmount.toLocaleString()}
${dueDate ? `お支払期限：${dueDate}` : ''}

添付ファイルをご確認の上、期限までにお支払いをお願いいたします。

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。`,
            };
        }
        else {
            // 納品書の場合
            return {
                subject: `【納品書】${documentNumber} のご送付`,
                body: `${formattedCustomerName}

いつもお世話になっております。

納品書をお送りいたします。

納品書番号：${documentNumber}
${deliveryDate ? `納品日：${deliveryDate}` : ''}
合計金額：¥${totalAmount.toLocaleString()}

添付ファイルをご確認ください。

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。`,
            };
        }
    };
    // モーダルが開いたときにデフォルト値を設定
    react_1.default.useEffect(() => {
        if (isOpen && !subject && !body) {
            const defaultContent = getDefaultContent();
            setSubject(defaultContent.subject);
            setBody(defaultContent.body);
        }
    }, [isOpen]);
    const handleSend = async () => {
        setError(null);
        // バリデーション
        if (!to) {
            setError('宛先メールアドレスを入力してください');
            return;
        }
        if (!to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('有効なメールアドレスを入力してください');
            return;
        }
        setIsSending(true);
        try {
            let pdfBase64 = null;
            // PDFを添付する場合は、クライアントサイドで生成
            if (attachPdf) {
                try {
                    // まず見積書/請求書/納品書のデータを取得
                    const apiPath = documentType === 'delivery-note' ? 'delivery-notes' : `${documentType}s`;
                    const docResponse = await fetch(`/api/${apiPath}/${documentId}`);
                    if (!docResponse.ok) {
                        throw new Error(`${documentType === 'quote' ? '見積書' : documentType === 'invoice' ? '請求書' : '納品書'}の取得に失敗しました`);
                    }
                    const docData = await docResponse.json();
                    // DocumentData形式に変換
                    const documentData = {
                        documentType,
                        documentNumber: docData.quoteNumber || docData.invoiceNumber || docData.deliveryNoteNumber,
                        issueDate: new Date(docData.issueDate || docData.invoiceDate),
                        validUntilDate: documentType === 'quote' ? new Date(docData.validityDate) : undefined,
                        dueDate: documentType === 'invoice' ? new Date(docData.dueDate) : undefined,
                        deliveryDate: documentType === 'delivery-note' ? new Date(docData.deliveryDate) : undefined,
                        customerName: docData.customer?.companyName || docData.customerSnapshot?.companyName || '',
                        customerAddress: docData.customer ?
                            `${docData.customer.postalCode ? `〒${docData.customer.postalCode} ` : ''}${docData.customer.prefecture || ''}${docData.customer.city || ''}${docData.customer.address1 || ''}${docData.customer.address2 || ''}` :
                            docData.customerSnapshot?.address || '',
                        customer: docData.customer, // 顧客情報全体を渡す
                        customerSnapshot: docData.customerSnapshot, // スナップショットも渡す
                        items: docData.items.map((item) => ({
                            description: item.itemName || item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            amount: item.amount,
                        })),
                        subtotal: docData.subtotal,
                        tax: docData.taxAmount,
                        total: docData.totalAmount,
                        notes: docData.notes,
                        companyInfo: {
                            name: docData.companySnapshot?.companyName || '',
                            address: docData.companySnapshot?.address || '',
                            phone: docData.companySnapshot?.phone,
                            email: docData.companySnapshot?.email,
                            registrationNumber: docData.companySnapshot?.invoiceRegistrationNumber,
                            stampImage: docData.companySnapshot?.stampImage,
                        },
                        bankAccount: docData.companySnapshot?.bankAccount || docData.bankAccount,
                    };
                    // クライアントサイドでPDF生成
                    console.log('Generating PDF on client side...');
                    pdfBase64 = await (0, pdf_export_1.generatePDFBase64)(documentData);
                    console.log('PDF generated successfully');
                }
                catch (pdfError) {
                    console.error('PDF generation error:', pdfError);
                    setError('PDF生成に失敗しました。PDFなしで送信しますか？');
                    setIsSending(false);
                    return;
                }
            }
            // メール送信APIを呼び出し（PDF生成済みの場合はBase64データを含める）
            const emailData = {
                documentType,
                documentId,
                to,
                cc: cc || undefined,
                bcc: bcc || undefined,
                subject: subject || undefined,
                body: body || undefined,
                attachPdf,
            };
            // クライアントで生成したPDFがある場合は追加
            if (pdfBase64) {
                emailData.pdfBase64 = pdfBase64;
            }
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailData),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'メール送信に失敗しました');
            }
            // 成功時の処理
            alert('メールが送信されました');
            onClose();
            if (onSuccess) {
                onSuccess();
            }
        }
        catch (error) {
            console.error('Email send error:', error);
            setError(error instanceof Error ? error.message : 'メール送信に失敗しました');
        }
        finally {
            setIsSending(false);
        }
    };
    const handleClose = () => {
        if (!isSending) {
            setTo(customerEmail);
            setCc('');
            setBcc('');
            setSubject('');
            setBody('');
            setAttachPdf(true);
            setError(null);
            onClose();
        }
    };
    // モーダルを開いた時にフィールドをリセット
    react_1.default.useEffect(() => {
        if (isOpen) {
            setTo(customerEmail);
            setCc('');
            setBcc('');
            setAttachPdf(true);
            setError(null);
        }
    }, [isOpen, customerEmail]);
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <card_1.Card className="w-full max-w-2xl bg-white mx-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {documentType === 'quote' ? '見積書' : documentType === 'invoice' ? '請求書' : '納品書'}をメール送信
            </h2>
            <button_1.Button variant="ghost" size="sm" onClick={handleClose} disabled={isSending}>
              <lucide_react_1.X className="h-4 w-4"/>
            </button_1.Button>
          </div>

          <div className="space-y-4">
            {error && (<alert_1.Alert variant="destructive">
                <lucide_react_1.AlertCircle className="h-4 w-4"/>
                <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
              </alert_1.Alert>)}

            <div className="space-y-2">
              <label_1.Label htmlFor="to">宛先 *</label_1.Label>
              <input_1.Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="example@company.com" disabled={isSending}/>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="cc">CC</label_1.Label>
              <input_1.Input id="cc" type="email" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@company.com" disabled={isSending}/>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="bcc">BCC</label_1.Label>
              <input_1.Input id="bcc" type="email" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@company.com" disabled={isSending}/>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="subject">件名</label_1.Label>
              <input_1.Input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="件名を入力" disabled={isSending}/>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="body">本文</label_1.Label>
              <textarea_1.Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="メール本文を入力" rows={10} disabled={isSending}/>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="attachPdf" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} disabled={isSending} className="rounded border-gray-300"/>
              <label_1.Label htmlFor="attachPdf" className="text-sm font-normal">
                PDFファイルを添付する
              </label_1.Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <button_1.Button variant="outline" onClick={handleClose} disabled={isSending}>
              キャンセル
            </button_1.Button>
            <button_1.Button onClick={handleSend} disabled={isSending}>
              {isSending ? (<>
                  <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  送信中...
                </>) : (<>
                  <lucide_react_1.Send className="mr-2 h-4 w-4"/>
                  送信
                </>)}
            </button_1.Button>
          </div>
        </div>
      </card_1.Card>
    </div>);
}
