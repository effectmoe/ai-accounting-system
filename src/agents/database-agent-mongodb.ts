import { Agent, createTool } from '@mastra/core';
import { z } from 'zod';
import { db, Collections, withTransaction } from '../lib/mongodb-client';
import { 
  Company, Partner, Account, Transaction, JournalEntry, JournalEntryLine,
  Document, DocumentItem, OcrResult, AuditLog,
  DocumentType, TransactionStatus, AccountType
} from '../models/mongodb-schemas';
import { ObjectId } from 'mongodb';

// MongoDB データベースエージェント
export const databaseAgentMongoDB = new Agent({
  id: 'database-agent',
  name: 'Database Agent',
  description: 'MongoDB データベース操作を管理するエージェント',
  model: {
    provider: 'OPENAI',
    name: 'gpt-4',
    toolChoice: 'auto',
  },
  tools: {
    // 会社情報の管理
    createCompany: createTool({
      id: 'create-company',
      description: '新しい会社を作成',
      inputSchema: z.object({
        name: z.string(),
        nameKana: z.string().optional(),
        taxId: z.string().optional(),
        address: z.object({
          postalCode: z.string().optional(),
          prefecture: z.string().optional(),
          city: z.string().optional(),
          street: z.string().optional(),
          building: z.string().optional(),
        }).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        fiscalYearStart: z.number().min(1).max(12).optional(),
      }),
      execute: async (input) => {
        const company = await db.create<Company>(Collections.COMPANIES, input);
        
        // デフォルトの勘定科目を作成
        await createDefaultAccounts(company._id);
        
        return {
          success: true,
          companyId: company._id.toString(),
          company,
        };
      },
    }),

    // 取引先の管理
    createPartner: createTool({
      id: 'create-partner',
      description: '新しい取引先を作成',
      inputSchema: z.object({
        companyId: z.string(),
        name: z.string(),
        nameKana: z.string().optional(),
        type: z.enum(['customer', 'supplier', 'both']),
        code: z.string().optional(),
        taxId: z.string().optional(),
        address: z.any().optional(),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const partner: Omit<Partner, '_id' | 'createdAt' | 'updatedAt'> = {
          ...input,
          companyId: new ObjectId(input.companyId),
          isActive: true,
        };
        
        const created = await db.create<Partner>(Collections.PARTNERS, partner);
        
        return {
          success: true,
          partnerId: created._id.toString(),
          partner: created,
        };
      },
    }),

    // OCR結果からドキュメントを作成
    createDocumentFromOcr: createTool({
      id: 'create-document-from-ocr',
      description: 'OCR結果から請求書・領収書などのドキュメントを作成',
      inputSchema: z.object({
        ocrResultId: z.string(),
        companyId: z.string(),
        documentType: z.nativeEnum(DocumentType),
        partnerId: z.string().optional(),
        manualAdjustments: z.object({
          documentNumber: z.string().optional(),
          date: z.string().optional(),
          dueDate: z.string().optional(),
          subtotal: z.number().optional(),
          taxAmount: z.number().optional(),
          totalAmount: z.number().optional(),
        }).optional(),
      }),
      execute: async (input) => {
        // OCR結果を取得
        const ocrResult = await db.findById<OcrResult>(
          Collections.OCR_RESULTS,
          input.ocrResultId
        );
        
        if (!ocrResult) {
          throw new Error('OCR result not found');
        }
        
        const extractedData = ocrResult.extractedData;
        const adjustments = input.manualAdjustments || {};
        
        // ドキュメントを作成
        const document: Omit<Document, '_id' | 'createdAt' | 'updatedAt'> = {
          companyId: new ObjectId(input.companyId),
          documentType: input.documentType,
          documentNumber: adjustments.documentNumber || 
                         extractedData.invoiceId || 
                         extractedData.receiptNumber || 
                         `DOC-${Date.now()}`,
          date: adjustments.date ? new Date(adjustments.date) : 
                extractedData.date ? new Date(extractedData.date) : 
                new Date(),
          dueDate: adjustments.dueDate ? new Date(adjustments.dueDate) :
                   extractedData.dueDate ? new Date(extractedData.dueDate) :
                   undefined,
          partnerId: input.partnerId ? new ObjectId(input.partnerId) : undefined,
          ocrResultId: new ObjectId(input.ocrResultId),
          subtotal: adjustments.subtotal ?? extractedData.subtotal ?? 0,
          taxAmount: adjustments.taxAmount ?? extractedData.taxAmount ?? extractedData.totalTax ?? 0,
          totalAmount: adjustments.totalAmount ?? extractedData.totalAmount ?? extractedData.total ?? 0,
          currency: 'JPY',
          status: TransactionStatus.PENDING,
          metadata: {
            sourceSystem: 'ocr',
            originalData: extractedData,
          },
        };
        
        const createdDoc = await db.create<Document>(Collections.DOCUMENTS, document);
        
        // 明細行がある場合は作成
        if (extractedData.lineItems && extractedData.lineItems.length > 0) {
          const items = extractedData.lineItems.map((item: any, index: number) => ({
            documentId: createdDoc._id,
            lineNumber: index + 1,
            description: item.description || item.name || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price || 0,
            amount: item.amount || (item.quantity || 1) * (item.unitPrice || item.price || 0),
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
          }));
          
          await db.bulkInsert<DocumentItem>(Collections.DOCUMENT_ITEMS, items);
        }
        
        // 監査ログを記録
        await createAuditLog(
          new ObjectId(input.companyId),
          'create',
          'document',
          createdDoc._id,
          null,
          createdDoc
        );
        
        return {
          success: true,
          documentId: createdDoc._id.toString(),
          document: createdDoc,
        };
      },
    }),

    // 仕訳の作成
    createJournalEntry: createTool({
      id: 'create-journal-entry',
      description: 'ドキュメントから仕訳を作成',
      inputSchema: z.object({
        companyId: z.string(),
        documentId: z.string().optional(),
        date: z.string(),
        description: z.string(),
        lines: z.array(z.object({
          accountId: z.string(),
          partnerId: z.string().optional(),
          debitAmount: z.number().optional(),
          creditAmount: z.number().optional(),
          description: z.string().optional(),
        })).min(2),
      }),
      execute: async (input) => {
        // トランザクション内で処理
        return await withTransaction(async (session) => {
          // 仕訳を作成
          const journalEntry: Omit<JournalEntry, '_id' | 'createdAt' | 'updatedAt'> = {
            companyId: new ObjectId(input.companyId),
            entryNumber: `JE-${Date.now()}`,
            date: new Date(input.date),
            description: input.description,
            documentId: input.documentId ? new ObjectId(input.documentId) : undefined,
            status: TransactionStatus.PENDING,
            isAdjusting: false,
            isClosing: false,
            source: 'manual',
          };
          
          const createdEntry = await db.create<JournalEntry>(
            Collections.JOURNAL_ENTRIES,
            journalEntry
          );
          
          // 仕訳明細を作成
          const lines = input.lines.map((line, index) => ({
            journalEntryId: createdEntry._id,
            lineNumber: index + 1,
            accountId: new ObjectId(line.accountId),
            partnerId: line.partnerId ? new ObjectId(line.partnerId) : undefined,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            description: line.description,
          }));
          
          await db.bulkInsert<JournalEntryLine>(
            Collections.JOURNAL_ENTRY_LINES,
            lines
          );
          
          // 貸借バランスチェック
          const totalDebit = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
          const totalCredit = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
          
          if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Journal entry is not balanced: Debit=${totalDebit}, Credit=${totalCredit}`);
          }
          
          return {
            success: true,
            journalEntryId: createdEntry._id.toString(),
            journalEntry: createdEntry,
            totalDebit,
            totalCredit,
            isBalanced: true,
          };
        });
      },
    }),

    // ドキュメントの検索
    searchDocuments: createTool({
      id: 'search-documents',
      description: 'ドキュメントを検索',
      inputSchema: z.object({
        companyId: z.string(),
        documentType: z.nativeEnum(DocumentType).optional(),
        partnerId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        amountMin: z.number().optional(),
        amountMax: z.number().optional(),
        status: z.nativeEnum(TransactionStatus).optional(),
        searchText: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        skip: z.number().min(0).default(0),
      }),
      execute: async (input) => {
        const filter: any = { companyId: new ObjectId(input.companyId) };
        
        if (input.documentType) filter.documentType = input.documentType;
        if (input.partnerId) filter.partnerId = new ObjectId(input.partnerId);
        if (input.status) filter.status = input.status;
        
        if (input.dateFrom || input.dateTo) {
          filter.date = {};
          if (input.dateFrom) filter.date.$gte = new Date(input.dateFrom);
          if (input.dateTo) filter.date.$lte = new Date(input.dateTo);
        }
        
        if (input.amountMin || input.amountMax) {
          filter.totalAmount = {};
          if (input.amountMin) filter.totalAmount.$gte = input.amountMin;
          if (input.amountMax) filter.totalAmount.$lte = input.amountMax;
        }
        
        if (input.searchText) {
          filter.$text = { $search: input.searchText };
        }
        
        const documents = await db.find<Document>(
          Collections.DOCUMENTS,
          filter,
          {
            sort: { date: -1 },
            limit: input.limit,
            skip: input.skip,
          }
        );
        
        const total = await db.count(Collections.DOCUMENTS, filter);
        
        return {
          success: true,
          documents,
          total,
          hasMore: input.skip + documents.length < total,
        };
      },
    }),

    // 財務統計の取得
    getFinancialStatistics: createTool({
      id: 'get-financial-statistics',
      description: '財務統計情報を取得',
      inputSchema: z.object({
        companyId: z.string(),
        period: z.enum(['month', 'quarter', 'year']),
        dateFrom: z.string(),
        dateTo: z.string(),
        groupBy: z.enum(['documentType', 'partner', 'account', 'month']).optional(),
      }),
      execute: async (input) => {
        const companyId = new ObjectId(input.companyId);
        const dateFrom = new Date(input.dateFrom);
        const dateTo = new Date(input.dateTo);
        
        // 基本的な集計パイプライン
        const pipeline = [
          {
            $match: {
              companyId,
              date: { $gte: dateFrom, $lte: dateTo },
              status: { $ne: TransactionStatus.CANCELLED },
            },
          },
        ];
        
        // グループ化の設定
        if (input.groupBy) {
          switch (input.groupBy) {
            case 'documentType':
              pipeline.push({
                $group: {
                  _id: '$documentType',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                  avgAmount: { $avg: '$totalAmount' },
                },
              });
              break;
            case 'partner':
              pipeline.push({
                $group: {
                  _id: '$partnerId',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                  avgAmount: { $avg: '$totalAmount' },
                },
              });
              break;
            case 'month':
              pipeline.push({
                $group: {
                  _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' },
                  },
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                  avgAmount: { $avg: '$totalAmount' },
                },
              });
              break;
          }
        } else {
          // 全体の統計
          pipeline.push({
            $group: {
              _id: null,
              totalDocuments: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              avgAmount: { $avg: '$totalAmount' },
              maxAmount: { $max: '$totalAmount' },
              minAmount: { $min: '$totalAmount' },
              totalTax: { $sum: '$taxAmount' },
            },
          });
        }
        
        const results = await db.aggregate<any>(Collections.DOCUMENTS, pipeline);
        
        // 収支の計算
        const incomeExpensePipeline = [
          {
            $match: {
              companyId,
              date: { $gte: dateFrom, $lte: dateTo },
              status: TransactionStatus.APPROVED,
            },
          },
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' },
            },
          },
        ];
        
        const incomeExpense = await db.aggregate<any>(
          Collections.TRANSACTIONS,
          incomeExpensePipeline
        );
        
        return {
          success: true,
          period: input.period,
          dateRange: { from: dateFrom, to: dateTo },
          statistics: results,
          incomeExpense,
        };
      },
    }),

    // MongoDB MCP サーバーとの連携
    executeMcpCommand: createTool({
      id: 'execute-mcp-command',
      description: 'MongoDB MCP サーバーのコマンドを実行',
      inputSchema: z.object({
        command: z.enum(['find', 'insert', 'update', 'delete', 'aggregate']),
        collection: z.string(),
        params: z.any(),
      }),
      execute: async (input) => {
        // MongoDB MCP サーバーとの通信をここに実装
        // 現在はダイレクトにMongoDBを操作
        
        switch (input.command) {
          case 'find':
            const results = await db.find(input.collection, input.params.filter, input.params.options);
            return { success: true, results };
            
          case 'insert':
            const inserted = await db.create(input.collection, input.params.document);
            return { success: true, insertedId: inserted._id };
            
          case 'update':
            const updated = await db.update(
              input.collection,
              input.params.id,
              input.params.update
            );
            return { success: true, updated };
            
          case 'delete':
            const deleted = await db.delete(input.collection, input.params.id);
            return { success: true, deleted };
            
          case 'aggregate':
            const aggregated = await db.aggregate(input.collection, input.params.pipeline);
            return { success: true, results: aggregated };
            
          default:
            throw new Error(`Unknown command: ${input.command}`);
        }
      },
    }),
  },
});

// デフォルトの勘定科目を作成するヘルパー関数
async function createDefaultAccounts(companyId: ObjectId) {
  const defaultAccounts = [
    // 資産
    { code: '1110', name: '現金', type: AccountType.ASSET },
    { code: '1120', name: '普通預金', type: AccountType.ASSET },
    { code: '1210', name: '売掛金', type: AccountType.ASSET },
    { code: '1310', name: '商品', type: AccountType.ASSET },
    
    // 負債
    { code: '2110', name: '買掛金', type: AccountType.LIABILITY },
    { code: '2210', name: '未払金', type: AccountType.LIABILITY },
    
    // 資本
    { code: '3110', name: '資本金', type: AccountType.EQUITY },
    
    // 収益
    { code: '4110', name: '売上高', type: AccountType.REVENUE },
    
    // 費用
    { code: '5110', name: '仕入高', type: AccountType.EXPENSE },
    { code: '5210', name: '給料手当', type: AccountType.EXPENSE },
    { code: '5310', name: '地代家賃', type: AccountType.EXPENSE },
    { code: '5410', name: '水道光熱費', type: AccountType.EXPENSE },
    { code: '5510', name: '通信費', type: AccountType.EXPENSE },
    { code: '5610', name: '消耗品費', type: AccountType.EXPENSE },
    { code: '5710', name: '交通費', type: AccountType.EXPENSE },
  ];
  
  const accounts = defaultAccounts.map(acc => ({
    ...acc,
    companyId,
    isActive: true,
    isSystem: true,
  }));
  
  await db.bulkInsert<Account>(Collections.ACCOUNTS, accounts);
}

// 監査ログを作成するヘルパー関数
async function createAuditLog(
  companyId: ObjectId,
  action: string,
  entityType: string,
  entityId: ObjectId,
  oldValues: any,
  newValues: any
) {
  const auditLog: Omit<AuditLog, '_id' | 'createdAt' | 'updatedAt'> = {
    companyId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    userId: 'system', // TODO: 実際のユーザーIDを使用
    userName: 'System',
  };
  
  await db.create<AuditLog>(Collections.AUDIT_LOGS, auditLog);
}