import { createClient } from '@supabase/supabase-js';
import { DocumentData } from '@/lib/document-generator';
import { generatePDFBlob } from '@/lib/pdf-export';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SavedDocument extends DocumentData {
  id: string;
  companyId: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  pdfUrl?: string;
}

export class DocumentService {
  /**
   * 文書を保存
   */
  static async saveDocument(
    document: DocumentData,
    companyId: string,
    userId?: string
  ): Promise<SavedDocument> {
    try {
      // 文書本体を保存
      const { data: savedDoc, error: docError } = await supabase
        .from('documents')
        .insert({
          company_id: companyId,
          document_type: document.documentType,
          document_number: document.documentNumber,
          issue_date: document.issueDate,
          partner_name: document.partner.name,
          partner_address: document.partner.address,
          partner_phone: document.partner.phone,
          partner_email: document.partner.email,
          partner_postal_code: document.partner.postal_code,
          partner_registration_number: document.partner.registrationNumber,
          project_name: document.projectName,
          subtotal: document.subtotal,
          tax_amount: document.tax,
          total_amount: document.total,
          valid_until: document.validUntil,
          due_date: document.dueDate,
          payment_method: document.paymentMethod,
          payment_terms: document.paymentTerms,
          notes: document.notes,
          bank_name: document.bankInfo?.bankName,
          bank_branch: document.bankInfo?.branchName,
          bank_account_type: document.bankInfo?.accountType,
          bank_account_number: document.bankInfo?.accountNumber,
          bank_account_holder: document.bankInfo?.accountHolder,
          delivery_date: document.deliveryInfo?.deliveryDate,
          delivery_location: document.deliveryInfo?.deliveryLocation,
          status: 'draft',
          created_by: userId
        })
        .select()
        .single();

      if (docError) throw docError;

      // 明細を保存
      const itemsToInsert = document.items.map((item, index) => ({
        document_id: savedDoc.id,
        item_order: index + 1,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || 0.10,
        amount: item.amount
      }));

      const { error: itemsError } = await supabase
        .from('document_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // PDF生成と保存（非同期で実行）
      this.generateAndStorePDF(savedDoc.id, document);

      return {
        ...document,
        id: savedDoc.id,
        companyId,
        status: savedDoc.status,
        createdAt: savedDoc.created_at,
        updatedAt: savedDoc.updated_at
      };
    } catch (error) {
      console.error('Error saving document:', error);
      throw new Error('文書の保存に失敗しました');
    }
  }

  /**
   * PDFを生成してストレージに保存
   */
  private static async generateAndStorePDF(
    documentId: string,
    documentData: DocumentData
  ): Promise<void> {
    try {
      const pdfBlob = await generatePDFBlob(documentData);
      
      const fileName = `documents/${documentId}/${documentData.documentNumber}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // PDF URLを更新
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      await supabase
        .from('documents')
        .update({
          pdf_url: publicUrl,
          pdf_generated_at: new Date().toISOString()
        })
        .eq('id', documentId);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // PDFの生成エラーは文書保存の失敗とはしない
    }
  }

  /**
   * 文書を取得
   */
  static async getDocument(documentId: string): Promise<SavedDocument | null> {
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_items (*)
        `)
        .eq('id', documentId)
        .single();

      if (error) throw error;

      return this.mapToDocumentData(doc);
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }

  /**
   * 文書一覧を取得
   */
  static async getDocuments(
    companyId: string,
    filters?: {
      documentType?: string;
      status?: string;
      partnerId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ documents: SavedDocument[]; total: number }> {
    try {
      let query = supabase
        .from('documents')
        .select('*, document_items (*)', { count: 'exact' })
        .eq('company_id', companyId);

      if (filters?.documentType) {
        query = query.eq('document_type', filters.documentType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.partnerId) {
        query = query.eq('partner_id', filters.partnerId);
      }
      if (filters?.dateFrom) {
        query = query.gte('issue_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('issue_date', filters.dateTo);
      }

      query = query
        .order('issue_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const documents = data?.map(doc => this.mapToDocumentData(doc)) || [];

      return {
        documents,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { documents: [], total: 0 };
    }
  }

  /**
   * 文書のステータスを更新
   */
  static async updateDocumentStatus(
    documentId: string,
    status: SavedDocument['status']
  ): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      // ステータスに応じてタイムスタンプを更新
      switch (status) {
        case 'sent':
          updateData.sent_at = new Date().toISOString();
          break;
        case 'viewed':
          updateData.viewed_at = new Date().toISOString();
          break;
        case 'accepted':
          updateData.accepted_at = new Date().toISOString();
          break;
        case 'paid':
          updateData.paid_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating document status:', error);
      return false;
    }
  }

  /**
   * データベースの結果をDocumentDataにマッピング
   */
  private static mapToDocumentData(dbDoc: any): SavedDocument {
    return {
      id: dbDoc.id,
      companyId: dbDoc.company_id,
      documentType: dbDoc.document_type,
      documentNumber: dbDoc.document_number,
      issueDate: dbDoc.issue_date,
      partner: {
        name: dbDoc.partner_name,
        address: dbDoc.partner_address,
        phone: dbDoc.partner_phone,
        email: dbDoc.partner_email,
        postal_code: dbDoc.partner_postal_code,
        registrationNumber: dbDoc.partner_registration_number
      },
      items: dbDoc.document_items?.sort((a: any, b: any) => a.item_order - b.item_order).map((item: any) => ({
        name: item.item_name,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unit_price),
        taxRate: parseFloat(item.tax_rate),
        amount: parseFloat(item.amount)
      })) || [],
      subtotal: parseFloat(dbDoc.subtotal),
      tax: parseFloat(dbDoc.tax_amount),
      total: parseFloat(dbDoc.total_amount),
      notes: dbDoc.notes,
      paymentTerms: dbDoc.payment_terms,
      validUntil: dbDoc.valid_until,
      dueDate: dbDoc.due_date,
      paymentMethod: dbDoc.payment_method,
      bankInfo: dbDoc.bank_name ? {
        bankName: dbDoc.bank_name,
        branchName: dbDoc.bank_branch,
        accountType: dbDoc.bank_account_type,
        accountNumber: dbDoc.bank_account_number,
        accountHolder: dbDoc.bank_account_holder
      } : undefined,
      projectName: dbDoc.project_name,
      deliveryInfo: dbDoc.delivery_date ? {
        deliveryDate: dbDoc.delivery_date,
        deliveryLocation: dbDoc.delivery_location
      } : undefined,
      status: dbDoc.status,
      createdAt: dbDoc.created_at,
      updatedAt: dbDoc.updated_at,
      pdfUrl: dbDoc.pdf_url
    };
  }
}