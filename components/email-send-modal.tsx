import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, AlertCircle, X } from 'lucide-react';
import { generatePDFBase64 } from '@/lib/pdf-export';
import { DocumentData } from '@/lib/document-generator';
import { formatCustomerNameForEmail } from '@/lib/honorific-utils';

import { logger } from '@/lib/logger';
interface EmailSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'quote' | 'invoice' | 'delivery-note';
  documentId: string;
  documentNumber: string;
  customerEmail?: string;
  customerName?: string;
  customer?: any; // 顧客情報全体
  customerSnapshot?: any; // 顧客スナップショット
  totalAmount: number;
  dueDate?: string;
  deliveryDate?: string; // 納品書用
  onSuccess?: () => void;
}

export default function EmailSendModal({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentNumber,
  customerEmail = '',
  customerName = '',
  customer,
  customerSnapshot,
  totalAmount,
  dueDate,
  deliveryDate,
  onSuccess,
}: EmailSendModalProps) {
  const [to, setTo] = useState(customerEmail);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

  // テンプレートに変数を適用する関数
  const applyTemplateVariables = (template: string) => {
    const companyName = companyInfo?.company_name || '株式会社EFFECT';
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '年').replace(/年(\d{2})/, '年$1月').replace(/月(\d{2})/, '月$1日') : '';
    const formattedDeliveryDate = deliveryDate ? new Date(deliveryDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '年').replace(/年(\d{2})/, '年$1月').replace(/月(\d{2})/, '月$1日') : '';
    const formattedCustomerName = formatCustomerNameForEmail(customer, customerSnapshot);
    
    const variables = {
      customerName: formattedCustomerName,
      documentNumber: documentNumber,
      totalAmount: `¥${totalAmount.toLocaleString()}`,
      dueDate: formattedDueDate,
      validityDate: dueDate ? new Date(dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '年').replace(/年(\d{2})/, '年$1月').replace(/月(\d{2})/, '月$1日') : '',
      deliveryDate: formattedDeliveryDate,
      companyName: companyName,
      companyAddress: companyInfo?.address || '',
      companyPhone: companyInfo?.phone || '',
      companyEmail: companyInfo?.email || '',
    };
    
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    
    return result;
  };

  // デフォルトの件名と本文を生成
  const getDefaultContent = () => {
    // カスタムテンプレートがある場合はそれを使用
    const customTemplate = emailTemplates.find(t => t.documentType === documentType);
    if (customTemplate) {
      return {
        subject: applyTemplateVariables(customTemplate.subject),
        body: applyTemplateVariables(customTemplate.body),
      };
    }
    
    // 敬称付きの宛名を生成
    const formattedCustomerName = formatCustomerNameForEmail(customer, customerSnapshot);
    
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
    } else if (documentType === 'invoice') {
      const companyName = companyInfo?.company_name || '株式会社EFFECT';
      const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '年').replace(/年(\d{2})/, '年$1月').replace(/月(\d{2})/, '月$1日') : '';
      
      return {
        subject: `請求書送付（${documentNumber}）`,
        body: `${formattedCustomerName}


いつもお世話になっております、${companyName}でございます。

PDFファイルにて以下の内容の請求書をお送りさせていただきました。


請求書番号：${documentNumber}
請求金額：¥${totalAmount.toLocaleString()}
${dueDate ? `お支払期限：${formattedDueDate}` : ''}


添付ファイルをご確認の上、何卒期限までにお支払いをお願いいたします。 
ご不明な点がございましたら、お気軽にお問い合わせくださいませ。

ご査収の程、お願いいたします。`,
      };
    } else {
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

  // 自社情報とメールテンプレートを取得
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // 自社情報を取得
        const companyResponse = await fetch('/api/company-info');
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          setCompanyInfo(companyData.companyInfo);
        }
        
        // メールテンプレートを取得
        const templateResponse = await fetch('/api/email-templates');
        if (templateResponse.ok) {
          const templateData = await templateResponse.json();
          if (templateData.templates && templateData.templates.length > 0) {
            setEmailTemplates(templateData.templates);
          }
        }
      } catch (error) {
        logger.error('Error fetching data:', error);
      }
    };
    
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // モーダルが開いたときにデフォルト値を設定
  React.useEffect(() => {
    if (isOpen && !subject && !body) {
      const defaultContent = getDefaultContent();
      setSubject(defaultContent.subject);
      setBody(defaultContent.body);
    }
  }, [isOpen, companyInfo]);

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
          const documentData: DocumentData = {
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
            items: docData.items.map((item: any) => ({
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
          logger.debug('Generating PDF on client side...');
          pdfBase64 = await generatePDFBase64(documentData);
          logger.debug('PDF generated successfully');
        } catch (pdfError) {
          logger.error('PDF generation error:', pdfError);
          setError('PDF生成に失敗しました。PDFなしで送信しますか？');
          setIsSending(false);
          return;
        }
      }

      // メール送信APIを呼び出し（PDF生成済みの場合はBase64データを含める）
      const emailData: any = {
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
    } catch (error) {
      logger.error('Email send error:', error);
      setError(error instanceof Error ? error.message : 'メール送信に失敗しました');
    } finally {
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
  React.useEffect(() => {
    if (isOpen) {
      setTo(customerEmail);
      setCc('');
      setBcc('');
      setAttachPdf(true);
      setError(null);
    }
  }, [isOpen, customerEmail]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white mx-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {documentType === 'quote' ? '見積書' : documentType === 'invoice' ? '請求書' : '納品書'}をメール送信
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="to">宛先 *</Label>
              <Input
                id="to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="example@company.com"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cc">CC</Label>
              <Input
                id="cc"
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@company.com"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bcc">BCC</Label>
              <Input
                id="bcc"
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@company.com"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">件名</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="件名を入力"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">本文</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="メール本文を入力"
                rows={10}
                disabled={isSending}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="attachPdf"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                disabled={isSending}
                className="rounded border-gray-300"
              />
              <Label htmlFor="attachPdf" className="text-sm font-normal">
                PDFファイルを添付する
              </Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={handleClose} disabled={isSending}>
              キャンセル
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  送信
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}