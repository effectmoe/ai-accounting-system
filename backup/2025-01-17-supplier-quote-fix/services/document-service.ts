import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { DocumentData } from '@/lib/document-generator';

export interface Document {
  _id?: ObjectId;
  documentNumber: string;
  documentType: 'invoice' | 'receipt' | 'quotation' | 'purchase_order';
  issueDate: Date;
  dueDate?: Date;
  customerId?: ObjectId;
  customerName?: string;
  items: DocumentItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  notes?: string;
  attachments?: string[];
  ocrResultId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

export class DocumentService {
  private collectionName = Collections.DOCUMENTS;

  /**
   * ドキュメントを作成
   */
  async createDocument(documentData: Omit<Document, '_id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    try {
      const document = await db.create<Document>(this.collectionName, {
        ...documentData,
        issueDate: new Date(documentData.issueDate),
        dueDate: documentData.dueDate ? new Date(documentData.dueDate) : undefined,
      });
      return document;
    } catch (error) {
      console.error('Error in createDocument:', error);
      throw new Error('ドキュメントの作成に失敗しました');
    }
  }

  /**
   * OCRデータからドキュメントを作成
   */
  async createFromOCR(data: DocumentData & { ocrResultId?: string; file_name?: string }): Promise<Document> {
    try {
      // DocumentDataからDocumentフォーマットに変換
      const documentData: Omit<Document, '_id' | 'createdAt' | 'updatedAt'> = {
        documentNumber: data.documentNumber,
        documentType: data.type || 'receipt',
        issueDate: new Date(data.date),
        customerName: data.vendor?.name || '',
        items: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxRate: item.taxRate,
        })),
        subtotal: data.subtotal,
        taxAmount: data.tax,
        totalAmount: data.total,
        status: 'draft',
        notes: data.notes,
        ocrResultId: data.ocrResultId,
      };

      return await this.createDocument(documentData);
    } catch (error) {
      console.error('Error in createFromOCR:', error);
      throw new Error('OCRデータからのドキュメント作成に失敗しました');
    }
  }

  /**
   * ドキュメントを取得
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      return await db.findById<Document>(this.collectionName, id);
    } catch (error) {
      console.error('Error in getDocument:', error);
      throw new Error('ドキュメントの取得に失敗しました');
    }
  }

  /**
   * ドキュメント一覧を取得
   */
  async getDocuments(filter: any = {}, options?: any): Promise<Document[]> {
    try {
      return await db.find<Document>(this.collectionName, filter, {
        sort: { issueDate: -1 },
        ...options,
      });
    } catch (error) {
      console.error('Error in getDocuments:', error);
      throw new Error('ドキュメント一覧の取得に失敗しました');
    }
  }

  /**
   * ドキュメントを更新
   */
  async updateDocument(id: string, updateData: Partial<Document>): Promise<Document | null> {
    try {
      const { _id, ...dataToUpdate } = updateData;
      
      // 日付フィールドをDateオブジェクトに変換
      if (dataToUpdate.issueDate) {
        dataToUpdate.issueDate = new Date(dataToUpdate.issueDate);
      }
      if (dataToUpdate.dueDate) {
        dataToUpdate.dueDate = new Date(dataToUpdate.dueDate);
      }

      return await db.update<Document>(this.collectionName, id, dataToUpdate);
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw new Error('ドキュメントの更新に失敗しました');
    }
  }

  /**
   * ドキュメントを削除
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      return await db.delete(this.collectionName, id);
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      throw new Error('ドキュメントの削除に失敗しました');
    }
  }

  /**
   * ドキュメントのステータスを更新
   */
  async updateDocumentStatus(id: string, status: Document['status']): Promise<Document | null> {
    try {
      return await this.updateDocument(id, { status });
    } catch (error) {
      console.error('Error in updateDocumentStatus:', error);
      throw new Error('ドキュメントステータスの更新に失敗しました');
    }
  }

  // PDF generation functionality has been removed
  // Use appropriate routes for PDF generation instead

  /**
   * OCR結果IDでドキュメントを検索
   */
  async getDocumentByOCRResultId(ocrResultId: string): Promise<Document | null> {
    try {
      return await db.findOne<Document>(this.collectionName, { ocrResultId });
    } catch (error) {
      console.error('Error in getDocumentByOCRResultId:', error);
      throw new Error('OCR結果IDでのドキュメント検索に失敗しました');
    }
  }

  /**
   * 月次のドキュメント集計
   */
  async getMonthlyAggregation(year: number, month: number): Promise<any> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const pipeline = [
        {
          $match: {
            issueDate: {
              $gte: startDate,
              $lte: endDate,
            },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$documentType',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            taxAmount: { $sum: '$taxAmount' },
          },
        },
      ];

      return await db.aggregate(this.collectionName, pipeline);
    } catch (error) {
      console.error('Error in getMonthlyAggregation:', error);
      throw new Error('月次集計の取得に失敗しました');
    }
  }
}